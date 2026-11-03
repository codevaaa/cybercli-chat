from __future__ import annotations

import json
from pathlib import Path

from .paths import CONFIG_FILE, MODEL_DIR


def load_config() -> dict:
    return json.loads(CONFIG_FILE.read_text(encoding="utf-8"))


def require_smoke_report(report_path: str | Path | None = None) -> dict:
    path = Path(report_path) if report_path else MODEL_DIR / "reports" / "rocm-smoke.json"
    if not path.is_absolute():
        path = MODEL_DIR.parents[1] / path
    if not path.is_file():
        raise RuntimeError(f"A passing GPU QLoRA smoke report is required first: {path}")
    report = json.loads(path.read_text(encoding="utf-8"))
    if report.get("success") is not True or report.get("finite_loss") is not True or report.get("backward_ok") is not True:
        raise RuntimeError(f"GPU QLoRA smoke report is not a passing run: {path}")
    return report


def build_lora_targets(model, torch):
    """LoRA only decoder projections and linear connector layers; freeze vision encoder."""
    decoder_suffixes = {"q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"}
    targets: list[str] = []
    for name, module in model.named_modules():
        if not isinstance(module, torch.nn.Linear):
            continue
        if "visual." in name and "visual.merger." not in name:
            continue
        if "visual.merger." in name or ("language_model." in name and name.rsplit(".", 1)[-1] in decoder_suffixes):
            targets.append(name)
    if not any("visual.merger." in name for name in targets):
        raise RuntimeError("No multimodal visual.merger Linear layers found; refusing a text-only adapter.")
    if not any("language_model." in name for name in targets):
        raise RuntimeError("No language-model projection layers found for LoRA.")
    return targets
