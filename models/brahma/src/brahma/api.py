from __future__ import annotations

import base64
import hmac
import io
import json
import os
import queue
import re
import secrets
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from .paths import MODEL_DIR
from .training_utils import load_config

MODEL_ID = "brahma-v1"
IDENTITY = (
    "You are Brahma V1, a local vision and coding model made by the CodeVaa team. "
    "You are fine-tuned from Qwen3-VL-8B-Instruct (the base checkpoint reports 9B parameters); "
    "do not claim you were trained from scratch. This local release is validated for an 8K context "
    "only; do not claim a 256K local context. Be accurate, helpful, and concise. "
    "For coding tasks, state assumptions, make a short plan, produce complete file contents when asked, "
    "and suggest build/test checks. Never claim to have executed tools unless their results are present."
)
TOOL_MARKER = "<tool_call>"
TOOL_END = "</tool_call>"
MAX_IMAGE_BYTES = 10 * 1024 * 1024
app = FastAPI(title="Brahma V1 Local API", version="1.0.0")
_engine = None
_engine_lock = threading.Lock()


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="allow")
    model: str = MODEL_ID
    messages: list[dict[str, Any]] = Field(min_length=1, max_length=80)
    temperature: float = Field(default=0.2, ge=0.0, le=1.5)
    max_tokens: int = Field(default=1024, ge=1, le=2048)
    stream: bool = False
    tools: list[dict[str, Any]] | None = Field(default=None, max_length=32)
    tool_choice: Any = None


class BuilderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    prompt: str = Field(min_length=20, max_length=6000)
    image_data_url: str | None = Field(default=None, max_length=14_000_000)
    max_repairs: int = Field(default=2, ge=0, le=2)


def _api_key_ok(authorization: str | None) -> bool:
    expected = os.environ.get("BRAHMA_API_KEY", "")
    if not expected:
        return False
    supplied = authorization.removeprefix("Bearer ") if authorization else ""
    return hmac.compare_digest(supplied.encode(), expected.encode())


def _image_from_data_uri(value: str):
    if not value.startswith("data:") or ";base64," not in value:
        raise HTTPException(400, "Only inline base64 images are accepted by the local API")
    header, encoded = value.split(",", 1)
    mime = header[5:].split(";", 1)[0].lower()
    if mime not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(400, "Allowed image types are PNG, JPEG, and WebP")
    try:
        payload = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise HTTPException(400, "Invalid base64 image") from exc
    if not payload or len(payload) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image payload must be between 1 byte and 10 MiB")
    try:
        from PIL import Image
        image = Image.open(io.BytesIO(payload))
        image.verify()
        image = Image.open(io.BytesIO(payload)).convert("RGB")
    except Exception as exc:
        raise HTTPException(400, "Image data could not be decoded") from exc
    if image.width * image.height > 24_000_000:
        raise HTTPException(413, "Image exceeds the 24 megapixel limit")
    return image


def _convert_messages(incoming: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result = [{"role": "system", "content": IDENTITY}]
    for message in incoming:
        role = message.get("role")
        if role not in {"system", "user", "assistant", "tool"}:
            raise HTTPException(400, f"Unsupported chat role: {role}")
        content = message.get("content")
        if isinstance(content, str) or content is None:
            converted = content or ""
        elif isinstance(content, list):
            converted = []
            for item in content:
                kind = item.get("type")
                if kind == "text" and isinstance(item.get("text"), str):
                    converted.append({"type": "text", "text": item["text"]})
                elif kind == "image_url":
                    image_url = item.get("image_url") or {}
                    converted.append({"type": "image", "image": _image_from_data_uri(image_url.get("url", ""))})
                else:
                    raise HTTPException(400, f"Unsupported content item: {kind}")
        else:
            raise HTTPException(400, "Message content must be text, image parts, or null")
        if role == "system":
            result.append({"role": "system", "content": converted})
        elif role == "assistant" and message.get("tool_calls"):
            result.append({"role": "assistant", "content": converted, "tool_calls": message["tool_calls"]})
        elif role == "tool":
            result.append({"role": "tool", "name": message.get("name", "tool"), "content": converted})
        else:
            result.append({"role": role, "content": converted})
    return result


def _parse_tool_calls(text: str) -> list[dict]:
    calls = []
    for index, match in enumerate(re.finditer(r"<tool_call>(.*?)</tool_call>", text, re.DOTALL)):
        try:
            value = json.loads(match.group(1).strip())
        except json.JSONDecodeError:
            continue
        name = value.get("name")
        arguments = value.get("arguments", {})
        if isinstance(name, str) and isinstance(arguments, (dict, list, str)):
            calls.append({
                "id": f"call_{secrets.token_hex(10)}", "type": "function", "index": index,
                "function": {"name": name, "arguments": json.dumps(arguments, ensure_ascii=False)},
            })
    return calls


def _clean_tool_text(text: str) -> str:
    return re.sub(r"<tool_call>.*?</tool_call>", "", text, flags=re.DOTALL).strip()


class BrahmaEngine:
    def __init__(self):
        import torch
        from peft import PeftModel
        from transformers import AutoModelForImageTextToText, AutoProcessor, BitsAndBytesConfig

        cfg = load_config()
        base_id, revision = cfg["base_model"], cfg["base_revision"]
        cache_dir = MODEL_DIR / "cache" / "huggingface"
        adapter_dir = MODEL_DIR / "artifacts" / "adapter"
        if not (adapter_dir / "adapter_config.json").is_file():
            raise RuntimeError("Brahma adapter is not trained yet. Run the smoke test, prepare data, then train.")
        if not torch.cuda.is_available() or not torch.version.hip:
            raise RuntimeError("ROCm GPU is unavailable; Brahma V1 local API requires the tested AMD GPU runtime.")
        quantization = BitsAndBytesConfig(
            load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.float16,
        )
        self.processor = AutoProcessor.from_pretrained(adapter_dir, cache_dir=cache_dir)
        base = AutoModelForImageTextToText.from_pretrained(
            base_id, revision=revision, cache_dir=cache_dir, quantization_config=quantization,
            torch_dtype=torch.float16, device_map="auto", low_cpu_mem_usage=True, attn_implementation="eager",
        )
        self.model = PeftModel.from_pretrained(base, adapter_dir, is_trainable=False)
        self.model.eval()
        self.torch = torch
        self.context_limit = int(cfg["context_serve_tokens"])
        self.generation_lock = threading.Lock()

    def _input(self, messages, tools, max_tokens):
        inputs = self.processor.apply_chat_template(
            messages, tools=tools, tokenize=True, add_generation_prompt=True,
            return_dict=True, return_tensors="pt",
        )
        prompt_tokens = int(inputs["input_ids"].shape[-1])
        if prompt_tokens + max_tokens > self.context_limit:
            raise HTTPException(400, f"Request exceeds the measured {self.context_limit}-token context limit")
        device = next(parameter.device for parameter in self.model.parameters() if parameter.device.type != "meta")
        return {key: value.to(device) if hasattr(value, "to") else value for key, value in inputs.items()}, prompt_tokens

    def generate(self, messages, tools, max_tokens, temperature):
        from transformers import TextIteratorStreamer
        inputs, prompt_tokens = self._input(messages, tools, max_tokens)
        streamer = TextIteratorStreamer(self.processor.tokenizer, skip_prompt=True, skip_special_tokens=True, timeout=60)
        kwargs = {"max_new_tokens": max_tokens, "streamer": streamer, "use_cache": True}
        if temperature > 0:
            kwargs.update({"do_sample": True, "temperature": temperature, "top_p": 0.9})
        else:
            kwargs["do_sample"] = False
        error_queue: queue.Queue = queue.Queue()
        def worker():
            try:
                with self.torch.inference_mode():
                    self.model.generate(**inputs, **kwargs)
            except Exception as exc:
                error_queue.put(exc)
        with self.generation_lock:
            thread = threading.Thread(target=worker, daemon=True)
            thread.start()
            pieces = list(streamer)
            thread.join(timeout=120)
            if thread.is_alive():
                raise RuntimeError("Local generation exceeded the 120-second request bound")
            if not error_queue.empty():
                raise error_queue.get()
        return "".join(pieces), prompt_tokens

    def stream(self, messages, tools, max_tokens, temperature):
        from transformers import TextIteratorStreamer
        inputs, prompt_tokens = self._input(messages, tools, max_tokens)
        streamer = TextIteratorStreamer(self.processor.tokenizer, skip_prompt=True, skip_special_tokens=True, timeout=60)
        kwargs = {"max_new_tokens": max_tokens, "streamer": streamer, "use_cache": True}
        if temperature > 0:
            kwargs.update({"do_sample": True, "temperature": temperature, "top_p": 0.9})
        else:
            kwargs["do_sample"] = False
        error_queue: queue.Queue = queue.Queue()
        def worker():
            try:
                with self.torch.inference_mode():
                    self.model.generate(**inputs, **kwargs)
            except Exception as exc:
                error_queue.put(exc)
        with self.generation_lock:
            thread = threading.Thread(target=worker, daemon=True)
            thread.start()
            text_seen = ""
            withheld = ""
            in_tool = False
            tool_payload = ""
            for piece in streamer:
                text_seen += piece
                if in_tool:
                    tool_payload += piece
                    end = tool_payload.find(TOOL_END)
                    if end >= 0:
                        in_tool = False
                        tool_payload = tool_payload[end + len(TOOL_END):]
                    continue
                withheld += piece
                start = withheld.find(TOOL_MARKER)
                if start >= 0:
                    visible = withheld[:start]
                    if visible:
                        yield {"type": "content", "text": visible}
                    withheld = withheld[start + len(TOOL_MARKER):]
                    in_tool = True
                    continue
                safe_length = max(0, len(withheld) - len(TOOL_MARKER) + 1)
                if safe_length:
                    yield {"type": "content", "text": withheld[:safe_length]}
                    withheld = withheld[safe_length:]
            thread.join(timeout=120)
            if thread.is_alive():
                raise RuntimeError("Local generation exceeded the 120-second request bound")
            if not error_queue.empty():
                raise error_queue.get()
        if not in_tool and withheld:
            yield {"type": "content", "text": withheld}
        calls = _parse_tool_calls(text_seen)
        if calls:
            yield {"type": "tool_calls", "calls": calls}
        yield {"type": "finish", "reason": "tool_calls" if calls else "stop", "prompt_tokens": prompt_tokens}


def _get_engine() -> BrahmaEngine:
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                _engine = BrahmaEngine()
    return _engine


@app.middleware("http")
async def limit_body(request: Request, call_next):
    body = await request.body()
    if len(body) > 12 * 1024 * 1024:
        return JSONResponse(status_code=413, content={"error": {"message": "Request body exceeds 12 MiB", "type": "invalid_request_error"}})
    sent = False
    async def receive():
        nonlocal sent
        if sent:
            return {"type": "http.request", "body": b"", "more_body": False}
        sent = True
        return {"type": "http.request", "body": body, "more_body": False}
    request._receive = receive
    return await call_next(request)


@app.get("/health")
def health():
    adapter = MODEL_DIR / "artifacts" / "adapter" / "adapter_config.json"
    return {"status": "ready" if adapter.is_file() else "adapter_missing", "model": MODEL_ID}


@app.get("/v1/models")
def list_models(authorization: str | None = Header(default=None)):
    if not _api_key_ok(authorization):
        raise HTTPException(401, "Invalid or missing local API key")
    return {"object": "list", "data": [{"id": MODEL_ID, "object": "model", "created": 0, "owned_by": "CodeVaa"}]}


@app.post("/v1/builder/generate")
def generate_fullstack_project(body: BuilderRequest, authorization: str | None = Header(default=None)):
    if not _api_key_ok(authorization):
        raise HTTPException(401, "Invalid or missing local API key")
    image = _image_from_data_uri(body.image_data_url) if body.image_data_url else None
    try:
        from .project_workflow import build_project
        return build_project(_get_engine(), body.prompt, image=image, max_repairs=body.max_repairs)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Local Brahma builder failed; no cloud provider fallback is configured") from exc


@app.post("/v1/chat/completions")
def chat_completions(body: ChatRequest, request: Request, authorization: str | None = Header(default=None)):
    if not _api_key_ok(authorization):
        raise HTTPException(401, "Invalid or missing local API key")
    if body.model not in {MODEL_ID, "brahma/v1"}:
        raise HTTPException(404, f"Unknown local model: {body.model}")
    messages = _convert_messages(body.messages)
    engine = _get_engine()
    completion_id = f"chatcmpl-{secrets.token_hex(12)}"
    created = int(time.time())
    if body.stream:
        def events():
            head = {"id": completion_id, "object": "chat.completion.chunk", "created": created, "model": MODEL_ID,
                    "choices": [{"index": 0, "delta": {"role": "assistant"}, "finish_reason": None}]}
            yield f"data: {json.dumps(head)}\n\n"
            try:
                for event in engine.stream(messages, body.tools, body.max_tokens, body.temperature):
                    if event["type"] == "content":
                        value = {"id": completion_id, "object": "chat.completion.chunk", "created": created, "model": MODEL_ID,
                                 "choices": [{"index": 0, "delta": {"content": event["text"]}, "finish_reason": None}]}
                    elif event["type"] == "tool_calls":
                        value = {"id": completion_id, "object": "chat.completion.chunk", "created": created, "model": MODEL_ID,
                                 "choices": [{"index": 0, "delta": {"tool_calls": event["calls"]}, "finish_reason": None}]}
                    else:
                        value = {"id": completion_id, "object": "chat.completion.chunk", "created": created, "model": MODEL_ID,
                                 "choices": [{"index": 0, "delta": {}, "finish_reason": event["reason"]}]}
                    yield f"data: {json.dumps(value, ensure_ascii=False)}\n\n"
                yield "data: [DONE]\n\n"
            except Exception:
                failure = {"error": {"message": "Local Brahma generation failed", "type": "server_error"}}
                yield f"data: {json.dumps(failure)}\n\n"
        return StreamingResponse(events(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    try:
        text, prompt_tokens = engine.generate(messages, body.tools, body.max_tokens, body.temperature)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(503, "Local Brahma generation failed; no cloud provider fallback is configured") from exc
    tool_calls = _parse_tool_calls(text)
    content = _clean_tool_text(text)
    finish = "tool_calls" if tool_calls else ("length" if len(text.split()) >= body.max_tokens else "stop")
    completion = {
        "id": completion_id, "object": "chat.completion", "created": created, "model": MODEL_ID,
        "choices": [{"index": 0, "message": {"role": "assistant", "content": content or None,
                      **({"tool_calls": [{key: value for key, value in call.items() if key != "index"} for call in tool_calls]} if tool_calls else {})},
                     "finish_reason": finish}],
        "usage": {"prompt_tokens": prompt_tokens, "completion_tokens": max(1, len(text.split())),
                  "total_tokens": prompt_tokens + max(1, len(text.split()))},
    }
    return completion
