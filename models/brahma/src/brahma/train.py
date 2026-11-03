from __future__ import annotations

import json
import math
import os
import sys
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path

from .paths import MODEL_DIR
from .training_utils import build_lora_targets, load_config, require_smoke_report


def _read_rows(path: Path) -> list[dict]:
    if not path.is_file():
        raise RuntimeError(f"Missing curated data file: {path}")
    rows = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    for row in rows:
        if row.get("split") != "train":
            raise RuntimeError(f"Non-training row found in train file: {row.get('id')}")
        if not row.get("prompt") or not row.get("response"):
            raise RuntimeError(f"Invalid training row: {row.get('id')}")
    return rows


def _messages(row: dict, Image):
    content = [{"type": "text", "text": row["prompt"]}]
    image_path = row.get("image_path")
    if image_path:
        path = (MODEL_DIR / image_path).resolve()
        if not path.is_relative_to(MODEL_DIR.resolve()) or not path.is_file():
            raise RuntimeError(f"Training image path escapes model folder or is missing: {image_path}")
        content.insert(0, {"type": "image", "image": Image.open(path).convert("RGB")})
    return [{"role": "user", "content": content}, {"role": "assistant", "content": row["response"]}]


def _encode(processor, messages: list[dict], cfg: dict, device, torch):
    full = processor.apply_chat_template(
        messages,
        tokenize=True,
        add_generation_prompt=False,
        return_dict=True,
        return_tensors="pt",
        truncation=True,
        max_length=cfg["context_train_tokens"],
    )
    prompt = processor.apply_chat_template(
        messages[:1],
        tokenize=True,
        add_generation_prompt=True,
        return_dict=True,
        return_tensors="pt",
        truncation=True,
        max_length=cfg["context_train_tokens"],
    )
    batch = {key: value.to(device) if hasattr(value, "to") else value for key, value in full.items()}
    labels = batch["input_ids"].clone()
    prompt_length = min(prompt["input_ids"].shape[-1], labels.shape[-1])
    labels[:, :prompt_length] = -100
    labels[batch.get("attention_mask", torch.ones_like(labels)) == 0] = -100
    if (labels != -100).sum().item() == 0:
        raise RuntimeError("An example has no response tokens after prompt masking/truncation")
    batch["labels"] = labels
    return batch


def main() -> int:
    require_smoke_report()
    cfg = load_config()
    train_path = MODEL_DIR / "data" / "processed" / "train.jsonl"
    eval_path = MODEL_DIR / "data" / "processed" / "eval.jsonl"
    rows = _read_rows(train_path)[: int(cfg["max_examples"])]
    if not rows:
        raise SystemExit("No training examples found.")
    if eval_path.is_file():
        eval_ids = {json.loads(line)["id"] for line in eval_path.read_text(encoding="utf-8").splitlines() if line.strip()}
        overlap = eval_ids.intersection(row["id"] for row in rows)
        if overlap:
            raise SystemExit(f"Train/eval leakage detected ({len(overlap)} shared IDs).")

    import torch
    from PIL import Image
    from peft import LoraConfig, get_peft_model
    from transformers import AutoModelForImageTextToText, AutoProcessor, BitsAndBytesConfig

    if not torch.cuda.is_available() or not torch.version.hip:
        raise SystemExit("ROCm GPU unavailable. Refusing CPU/offloaded training.")
    os.environ["HF_HOME"] = str(MODEL_DIR / "cache" / "huggingface")
    cache_dir = str(MODEL_DIR / "cache" / "huggingface")
    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=torch.float16,
    )
    model_id, revision = cfg["base_model"], cfg["base_revision"]
    processor = AutoProcessor.from_pretrained(model_id, revision=revision, cache_dir=cache_dir)
    model = AutoModelForImageTextToText.from_pretrained(
        model_id,
        revision=revision,
        cache_dir=cache_dir,
        quantization_config=quantization,
        torch_dtype=torch.float16,
        device_map="auto",
        low_cpu_mem_usage=True,
        attn_implementation="eager",
    )
    model.config.use_cache = False
    model.gradient_checkpointing_enable()
    model.enable_input_require_grads()
    target_modules = build_lora_targets(model, torch)
    model = get_peft_model(model, LoraConfig(
        r=int(cfg["lora_rank"]),
        lora_alpha=int(cfg["lora_alpha"]),
        lora_dropout=float(cfg["lora_dropout"]),
        target_modules=target_modules,
        bias="none",
        task_type="CAUSAL_LM",
    ))
    trainable = [parameter for parameter in model.parameters() if parameter.requires_grad]
    if not trainable:
        raise RuntimeError("No trainable LoRA parameters were attached")
    optimizer = torch.optim.AdamW(trainable, lr=float(cfg["learning_rate"]), weight_decay=0.01)
    device = next(parameter.device for parameter in model.parameters() if parameter.device.type != "meta")
    accumulation = int(cfg["gradient_accumulation_steps"])
    steps = 0
    started = time.monotonic()
    losses: list[float] = []
    model.train()
    optimizer.zero_grad(set_to_none=True)

    for index, row in enumerate(rows, start=1):
        inputs = _encode(processor, _messages(row, Image), cfg, device, torch)
        loss = model(**inputs).loss
        if loss is None or not torch.isfinite(loss).item():
            raise RuntimeError(f"Non-finite training loss at row {row['id']}")
        (loss / accumulation).backward()
        losses.append(float(loss.detach().cpu()))
        if index % accumulation == 0 or index == len(rows):
            torch.nn.utils.clip_grad_norm_(trainable, 1.0)
            optimizer.step()
            optimizer.zero_grad(set_to_none=True)
            steps += 1
        if index % 50 == 0:
            print(f"examples={index}/{len(rows)} mean_loss={sum(losses[-50:])/min(len(losses),50):.4f}", flush=True)

    output_dir = MODEL_DIR / "artifacts" / "adapter"
    output_dir.mkdir(parents=True, exist_ok=True)
    model.save_pretrained(output_dir, safe_serialization=True)
    processor.save_pretrained(output_dir)
    report = {
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "base_model": model_id, "base_revision": revision, "method": "NF4 QLoRA; batch=1; gradient checkpointing",
        "train_rows": len(rows), "optimizer_steps": steps,
        "mean_loss": sum(losses) / len(losses), "min_loss": min(losses), "max_loss": max(losses),
        "elapsed_seconds": round(time.monotonic() - started, 2),
        "peak_vram_bytes": int(torch.cuda.max_memory_allocated()),
        "device": torch.cuda.get_device_name(0), "rocm": torch.version.hip,
        "adapter_path": str(output_dir), "lora_target_count": len(target_modules),
        "success": True,
    }
    (MODEL_DIR / "reports" / "training.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        report = {"success": False, "error": str(error), "traceback": traceback.format_exc()[-8000:],
                  "failed_at": datetime.now(timezone.utc).isoformat()}
        target = MODEL_DIR / "reports" / "training-failure.json"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(report, indent=2), encoding="utf-8")
        raise
