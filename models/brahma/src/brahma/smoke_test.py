from __future__ import annotations

import json
import os
import sys
import time
import traceback
from datetime import datetime, timezone

from .paths import MODEL_DIR
from .training_utils import build_lora_targets, load_config


def main() -> int:
    report_path = MODEL_DIR / "reports" / "rocm-smoke.json"
    started = time.monotonic()
    report: dict = {"started_at": datetime.now(timezone.utc).isoformat(), "success": False}
    try:
        import torch
        from PIL import Image
        from peft import LoraConfig, get_peft_model
        from transformers import AutoModelForImageTextToText, AutoProcessor, BitsAndBytesConfig

        if not torch.cuda.is_available() or not getattr(torch.version, "hip", None):
            raise RuntimeError("ROCm GPU is unavailable; see reports/hardware-preflight.json")
        cfg = load_config()
        model_id = cfg["base_model"]
        revision = cfg["base_revision"]
        cache_dir = str(MODEL_DIR / "cache" / "huggingface")
        os.environ["HF_HOME"] = cache_dir
        quantization = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.float16,
        )
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
        targets = build_lora_targets(model, torch)
        adapter_config = LoraConfig(
            r=cfg["lora_rank"],
            lora_alpha=cfg["lora_alpha"],
            lora_dropout=cfg["lora_dropout"],
            target_modules=targets,
            bias="none",
            task_type="CAUSAL_LM",
        )
        model = get_peft_model(model, adapter_config)
        fixture = Image.new("RGB", (224, 224), color=(238, 240, 242))
        messages = [
            {"role": "user", "content": [
                {"type": "image", "image": fixture},
                {"type": "text", "text": "Read this simple screen, then complete the JavaScript function with a safe empty-array check: function first(items) {"},
            ]},
            {"role": "assistant", "content": " return Array.isArray(items) && items.length ? items[0] : undefined; }"},
        ]
        inputs = processor.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=False, return_dict=True, return_tensors="pt"
        )
        device = next(parameter.device for parameter in model.parameters() if parameter.device.type != "meta")
        inputs = {key: value.to(device) if hasattr(value, "to") else value for key, value in inputs.items()}
        inputs["labels"] = inputs["input_ids"].clone()
        model.train()
        model.zero_grad(set_to_none=True)
        output = model(**inputs)
        loss = output.loss
        if loss is None or not torch.isfinite(loss).item():
            raise RuntimeError("Smoke forward produced a non-finite loss")
        loss.backward()
        named_trainable_grads = [(name, p.grad) for name, p in model.named_parameters() if p.requires_grad and p.grad is not None]
        trainable_grads = [gradient for _, gradient in named_trainable_grads]
        if not trainable_grads or not all(torch.isfinite(g).all().item() for g in trainable_grads):
            raise RuntimeError("Smoke backward had no finite adapter gradients")
        if not any("visual.merger." in name for name, _ in named_trainable_grads):
            raise RuntimeError("Synthetic-image backward did not reach the multimodal connector adapters")
        report.update({
            "success": True,
            "finite_loss": True,
            "backward_ok": True,
            "loss": float(loss.detach().cpu()),
            "model": model_id,
            "revision": revision,
            "torch": torch.__version__,
            "rocm": torch.version.hip,
            "device": torch.cuda.get_device_name(0),
            "peak_allocated_bytes": int(torch.cuda.max_memory_allocated()),
            "lora_target_count": len(targets),
            "lora_target_names": targets,
            "sample": "synthetic 224x224 image + text; finite-loss backward through language and visual-merger LoRA adapters",
        })
        return_code = 0
    except Exception as error:
        report.update({"error": str(error), "traceback": traceback.format_exc()[-8000:]})
        return_code = 1
    finally:
        report["finished_at"] = datetime.now(timezone.utc).isoformat()
        report["elapsed_seconds"] = round(time.monotonic() - started, 2)
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(json.dumps(report, indent=2))
    return return_code


if __name__ == "__main__":
    sys.exit(main())
