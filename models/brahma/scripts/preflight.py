from __future__ import annotations

import json
import os
import platform
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parents[1]
REPORT = MODEL_DIR / "reports" / "hardware-preflight.json"


def main() -> int:
    import torch

    device_available = bool(torch.cuda.is_available())
    device_name = torch.cuda.get_device_name(0) if device_available else None
    hip_version = getattr(getattr(torch, "version", None), "hip", None)
    result = {
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "python": sys.version,
        "torch": torch.__version__,
        "torch_hip": hip_version,
        "cuda_api_available": device_available,
        "device_name": device_name,
        "device_memory_bytes": torch.cuda.get_device_properties(0).total_memory if device_available else None,
        "wsl_dxg_present": Path("/dev/dxg").exists(),
        "free_disk_bytes": shutil.disk_usage(MODEL_DIR).free,
        "success": bool(device_available and hip_version and Path("/dev/dxg").exists()),
    }
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text(json.dumps(result, indent=2), encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0 if result["success"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
