from __future__ import annotations

import argparse
import gc
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from brahma.paths import MODEL_DIR
from brahma.training_utils import require_smoke_report

TASKS = Path(__file__).resolve().parent / "tasks.json"


def load_model(adapter: bool):
    import torch
    from transformers import AutoModelForImageTextToText, AutoProcessor, BitsAndBytesConfig

    config = json.loads((MODEL_DIR / "config" / "training.json").read_text(encoding="utf-8"))
    cache = MODEL_DIR / "cache" / "huggingface"
    os_env = __import__("os").environ
    os_env["HF_HOME"] = str(cache)
    processor = AutoProcessor.from_pretrained(config["base_model"], revision=config["base_revision"], cache_dir=cache)
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True,
                               bnb_4bit_compute_dtype=torch.float16)
    model = AutoModelForImageTextToText.from_pretrained(
        config["base_model"], revision=config["base_revision"], cache_dir=cache,
        quantization_config=quant, torch_dtype=torch.float16, device_map="auto", low_cpu_mem_usage=True,
        attn_implementation="eager",
    )
    if adapter:
        from peft import PeftModel
        adapter_dir = MODEL_DIR / "artifacts" / "adapter"
        if not (adapter_dir / "adapter_config.json").is_file():
            raise RuntimeError("Adapter not found. Train Brahma V1 before running adapter evaluations.")
        model = PeftModel.from_pretrained(model, adapter_dir, is_trainable=False)
    model.eval()
    return model, processor, torch, config


def score_text(task: dict, text: str) -> dict:
    normalized = text.casefold()
    checks = task.get("checks", [])
    found = {term: term.casefold() in normalized for term in checks}
    if task["category"] == "tool_use":
        found = {"read_file_call": bool(re.search(r"<tool_call>.*?read_file.*?src/App\.tsx.*?</tool_call>", text, re.S))}
    return {"automatic_checks": found, "automatic_pass": bool(found) and all(found.values()),
            "review_note": "Automatic lexical checks are a triage signal; inspect output and execute code before claiming capability."}


def run_tasks(model, processor, torch, config, context_limit: int, include_stress: bool):
    from PIL import Image

    tasks = json.loads(TASKS.read_text(encoding="utf-8"))["tasks"]
    if include_stress:
        tasks.append({"id": f"context-stress-{context_limit}", "category": "context_stress", "context_tokens": context_limit - 64,
                      "prompt": "", "max_new_tokens": 32})
    results = []
    for task in tasks:
        try:
            if task.get("category") == "context_stress":
                token_id = processor.tokenizer.encode(" context", add_special_tokens=False)[0]
                length = int(task["context_tokens"])
                input_ids = torch.full((1, length), token_id, dtype=torch.long)
                attention_mask = torch.ones_like(input_ids)
                batch = {"input_ids": input_ids, "attention_mask": attention_mask}
                input_tokens = length
            else:
                content = []
                if task.get("image"):
                    image = Image.open(Path(__file__).resolve().parent / task["image"]).convert("RGB")
                    content.append({"type": "image", "image": image})
                content.append({"type": "text", "text": task["prompt"]})
                messages = [
                    {"role": "system", "content": "You are Brahma V1, made by the CodeVaa team and fine-tuned from Qwen3-VL. Answer accurately. This is an evaluation; do not claim tools ran."},
                    {"role": "user", "content": content},
                ]
                batch = processor.apply_chat_template(messages, tools=task.get("tools"), tokenize=True, add_generation_prompt=True,
                                                       return_dict=True, return_tensors="pt")
                input_tokens = int(batch["input_ids"].shape[-1])
            max_new = int(task.get("max_new_tokens", 128))
            if input_tokens + max_new > context_limit:
                raise RuntimeError(f"prompt ({input_tokens}) + generation ({max_new}) exceeds {context_limit}")
            device = next(parameter.device for parameter in model.parameters() if parameter.device.type != "meta")
            batch = {key: value.to(device) if hasattr(value, "to") else value for key, value in batch.items()}
            torch.cuda.reset_peak_memory_stats()
            with torch.inference_mode():
                output = model.generate(**batch, max_new_tokens=max_new, do_sample=False, use_cache=True)
            generated_ids = output[:, batch["input_ids"].shape[-1]:]
            text = processor.tokenizer.batch_decode(generated_ids, skip_special_tokens=False, clean_up_tokenization_spaces=False)[0]
            results.append({"id": task["id"], "category": task["category"], "input_tokens": input_tokens,
                            "generated_tokens": int(generated_ids.shape[-1]), "output": text,
                            "vram_peak_bytes": int(torch.cuda.max_memory_allocated()), **score_text(task, text)})
        except Exception as error:
            results.append({"id": task["id"], "category": task["category"], "error": str(error),
                            "oom": "out of memory" in str(error).lower() or "memory access fault" in str(error).lower()})
            if hasattr(torch.cuda, "empty_cache"):
                torch.cuda.empty_cache()
    return results


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--compare", action="store_true", help="Run base model and Brahma adapter sequentially")
    parser.add_argument("--context", type=int, choices=(8192, 16384), default=8192)
    parser.add_argument("--include-stress", action="store_true", help="Append a near-limit stress case")
    args = parser.parse_args()
    require_smoke_report()
    import torch
    if not torch.cuda.is_available() or not torch.version.hip:
        raise SystemExit("ROCm GPU unavailable")
    runs = []
    for label, adapter in ([('base', False), ('brahma-v1', True)] if args.compare else [('brahma-v1', True)]):
        model, processor, torch, config = load_model(adapter)
        if args.context > config["context_serve_tokens"]:
            print(f"Warning: stress context {args.context} is experimental; the tested context remains 8K.")
        results = run_tasks(model, processor, torch, config, args.context, args.include_stress)
        runs.append({"variant": label, "device": torch.cuda.get_device_name(0), "rocm": torch.version.hip,
                     "results": results, "automatic_pass_rate": sum(bool(x.get("automatic_pass")) for x in results) / max(1, len(results))})
        del model, processor
        gc.collect()
        torch.cuda.empty_cache()
    report = {"created_at": datetime.now(timezone.utc).isoformat(), "base_model": config["base_model"],
              "base_revision": config["base_revision"], "context_limit_attempted": args.context,
              "context_advertised": 8192, "runs": runs,
              "limitations": ["Lexical checks are not a substitute for human review.",
                              "The 16K target is experimental until all categories and memory are reviewed.",
                              "SWE-bench execution is tracked separately; see swebench-provenance.json."]}
    path = MODEL_DIR / "reports" / f"evaluation-{args.context}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({"report": str(path), "variants": len(runs), "context": args.context}, indent=2))


if __name__ == "__main__":
    main()
