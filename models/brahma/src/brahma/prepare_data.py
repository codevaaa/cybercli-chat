from __future__ import annotations

import argparse
import base64
import hashlib
import io
import json
import os
import sys
from pathlib import Path

from .paths import MODEL_DIR
from .training_utils import require_smoke_report

REGISTRY = MODEL_DIR / "data" / "registry.json"
OUT_DIR = MODEL_DIR / "data" / "processed"
IMAGE_DIR = MODEL_DIR / "data" / "images"


def parse_score(value) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def pass_ratio(status) -> float:
    if isinstance(status, str):
        try:
            status = json.loads(status)
        except json.JSONDecodeError:
            return float("pass" in status.lower() or "success" in status.lower())
    if not isinstance(status, list) or not status:
        return 0.0
    return sum(str(item).lower() in {"pass", "passed", "success", "true"} for item in status) / len(status)


def deterministic_split(source_id: str, validation_percent: int = 5) -> str:
    bucket = int(hashlib.sha256(source_id.encode("utf-8")).hexdigest()[:8], 16) % 100
    return "eval" if bucket < validation_percent else "train"


def content_fingerprint(row: dict) -> str:
    normalized = "\n".join(" ".join(row[key].split()).casefold() for key in ("prompt", "response"))
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _save_image(value, item_id: str) -> str | None:
    from PIL import Image

    image = value
    if isinstance(value, dict):
        if value.get("bytes"):
            image = Image.open(io.BytesIO(value["bytes"]))
        elif value.get("path"):
            image = Image.open(value["path"])
        elif value.get("url"):
            image = value["url"]
        elif value.get("image_url", {}).get("url"):
            image = value["image_url"]["url"]
    if isinstance(image, str):
        encoded = image.split(",", 1)[-1] if image.startswith("data:") else image
        try:
            image = Image.open(io.BytesIO(base64.b64decode(encoded, validate=True)))
        except Exception:
            candidate = Path(image)
            if candidate.is_file():
                image = Image.open(candidate)
            else:
                return None
    if not hasattr(image, "convert"):
        return None
    image = image.convert("RGB")
    if image.width < 80 or image.height < 80 or image.width * image.height > 24_000_000:
        return None
    IMAGE_DIR.mkdir(parents=True, exist_ok=True)
    name = hashlib.sha256(item_id.encode("utf-8")).hexdigest() + ".jpg"
    target = IMAGE_DIR / name
    image.save(target, format="JPEG", quality=92, optimize=True)
    return target.relative_to(MODEL_DIR).as_posix()


def _safe_text(value, limit: int) -> str:
    return value.strip()[:limit] if isinstance(value, str) else ""


def opencode_row(row: dict, revision: str, split_hint: str | None = None) -> dict | None:
    if not isinstance(row.get("input"), str) or not isinstance(row.get("output"), str):
        return None
    if len(row["input"]) > 16_000 or len(row["output"]) > 24_000:
        return None
    prompt = _safe_text(row.get("input"), 16_000)
    answer = _safe_text(row.get("output"), 24_000)
    if len(prompt) < 40 or len(answer) < 20:
        return None
    if parse_score(row.get("average_test_score")) < 0.9 or pass_ratio(row.get("tests_execution_status")) < 0.9:
        return None
    item_id = _safe_text(row.get("id"), 100) or hashlib.sha256((prompt + answer).encode()).hexdigest()
    return {
        "id": f"opencode:{item_id}", "source": "nvidia/OpenCodeInstruct", "revision": revision,
        "split": split_hint or deterministic_split(item_id), "prompt": prompt, "response": answer,
        "image_path": None, "license": "CC-BY-4.0",
    }


def fluent_row(row: dict, revision: str, split: str) -> dict | None:
    if not isinstance(row.get("instruction"), str) or not isinstance(row.get("code"), str):
        return None
    if len(row["instruction"]) > 3000 or len(row["code"]) > 50_000:
        return None
    prompt = _safe_text(row.get("instruction"), 3000)
    answer = _safe_text(row.get("code"), 50_000)
    if len(prompt) < 40 or len(answer) < 50:
        return None
    source_id = _safe_text(row.get("filename"), 300) or hashlib.sha256((prompt + answer).encode()).hexdigest()
    image_path = _save_image(row.get("image"), f"fluent-dev:{source_id}")
    if not image_path:
        return None
    return {
        "id": f"fluent-dev:{source_id}", "source": "justmalhar/fluent-dev", "revision": revision,
        "split": "eval" if split == "validation" else "train", "prompt": prompt, "response": answer,
        "image_path": image_path, "license": "MIT",
    }


def synthetic_rows() -> list[dict]:
    examples = [
        ("Who created you?", "I am Brahma V1, a local vision and coding model made by the CodeVaa team and fine-tuned from Qwen3-VL-8B-Instruct."),
        ("Tumhe kisne banaya hai?", "Mujhe CodeVaa team ne Brahma V1 naam se banaya hai. Main Qwen3-VL-8B-Instruct par fine-tune hua local vision aur coding model hoon."),
        ("Review the project and call the test tool with the package path only.", '<tool_call>{"name":"run_tests","arguments":{"path":"backend"}}</tool_call>'),
        ("Inspect package.json and report scripts; call read_file with this relative path.", '<tool_call>{"name":"read_file","arguments":{"path":"frontend/package.json"}}</tool_call>'),
        ("Complete the missing TypeScript function. Prefix: export function clamp(value: number, min: number, max: number) { <FILL_ME> }", "return Math.min(max, Math.max(min, value));"),
        ("A browser screenshot shows a two-column settings form. Describe the first implementation step.", "Inspect the screenshot for its layout, labels, spacing, and responsive behavior; then list the React components and form state before writing files."),
        ("The model context limit for local Brahma V1?", "The initial tested local context target is 8K tokens. A 16K stress target still needs a measured run; the base model's 256K native context is not validated on this PC."),
    ]
    result = []
    for index, (prompt, response) in enumerate(examples):
        result.append({
            "id": f"synthetic:{index:04d}", "source": "CodeVaa/synthetic-seed", "revision": "brahma-v1-seed-1",
            "split": "train", "prompt": prompt, "response": response, "image_path": None,
            "license": "CodeVaa-owned synthetic; review before release",
        })
    return result


def _write_jsonl(path: Path, rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch only the reviewed Brahma V1 training subset.")
    parser.add_argument("--after-smoke", required=True, help="Path to a successful rocm-smoke.json report")
    parser.add_argument("--opencode-limit", type=int, default=12000)
    parser.add_argument("--scan-limit", type=int, default=250000)
    args = parser.parse_args()
    require_smoke_report(args.after_smoke)
    os.environ["HF_HOME"] = str(MODEL_DIR / "cache" / "huggingface")

    try:
        from datasets import load_dataset
    except ImportError as exc:
        raise SystemExit("Install requirements-rocm.txt first") from exc
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    selected = [entry for entry in registry["sources"] if entry.get("status") == "approved_for_filtered_download"]
    opencode = next(entry for entry in selected if entry["id"] == "nvidia/OpenCodeInstruct")
    fluent = next((entry for entry in selected if entry["id"] == "justmalhar/fluent-dev"), None)
    synthetic = next((entry for entry in selected if entry["id"] == "CodeVaa/synthetic-seed"), None)

    out: dict[str, list[dict]] = {"train": [], "eval": []}
    seen: set[str] = set()
    opencode_limit = min(max(args.opencode_limit, 1), int(opencode["max_rows"]))
    scan_limit = min(max(args.scan_limit, 1), 500_000)
    scan_count = 0
    for row in load_dataset(opencode["id"], split="train", streaming=True, revision=opencode["revision"]):
        scan_count += 1
        if scan_count > scan_limit or len(out["train"]) >= opencode_limit:
            break
        normalized = opencode_row(row, opencode["revision"])
        if not normalized or normalized["id"] in seen or content_fingerprint(normalized) in seen:
            continue
        seen.update((normalized["id"], content_fingerprint(normalized)))
        out[normalized["split"]].append(normalized)

    if fluent:
        for split in ("train", "validation"):
            try:
                rows = load_dataset(fluent["id"], split=split, revision=fluent["revision"])
            except (ValueError, FileNotFoundError):
                continue
            for row in rows:
                normalized = fluent_row(row, fluent["revision"], split)
                fingerprint = content_fingerprint(normalized) if normalized else None
                if normalized and normalized["id"] not in seen and fingerprint not in seen:
                    seen.update((normalized["id"], fingerprint))
                    out[normalized["split"]].append(normalized)
    if synthetic:
        out["train"].extend(synthetic_rows()[: int(synthetic["max_rows"])])
    _write_jsonl(OUT_DIR / "train.jsonl", out["train"])
    _write_jsonl(OUT_DIR / "eval.jsonl", out["eval"])
    report = {
        "opencode_scanned": min(scan_count, scan_limit),
        "train_rows": len(out["train"]), "held_out_eval_rows": len(out["eval"]),
        "source_counts": {name: sum(row["source"] == name for split in out.values() for row in split)
                          for name in sorted({row["source"] for split in out.values() for row in split})},
        "registry": str(REGISTRY.relative_to(MODEL_DIR)),
        "downloaded_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    (MODEL_DIR / "reports" / "data-preparation.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
