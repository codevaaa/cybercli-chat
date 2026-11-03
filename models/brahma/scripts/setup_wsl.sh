#!/usr/bin/env bash
set -euo pipefail

MODEL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-python3.12}"
VENV="$MODEL_DIR/.venv"

if ! grep -qi microsoft /proc/version; then
  echo "Run this setup inside Ubuntu on WSL2; native Windows ROCm training is unsupported." >&2
  exit 2
fi
if [[ ! -e /dev/dxg ]]; then
  echo "WSL GPU paravirtual device /dev/dxg is missing. Update WSL and verify the Windows AMD driver." >&2
  exit 2
fi
command -v "$PYTHON_BIN" >/dev/null || { echo "Python 3.12 is required." >&2; exit 2; }
if ! "$PYTHON_BIN" -c 'import ensurepip' >/dev/null 2>&1; then
  echo "Install Ubuntu's venv package first: sudo apt-get update && sudo apt-get install -y python3.12-venv" >&2
  exit 2
fi

mkdir -p "$MODEL_DIR/cache/huggingface" "$MODEL_DIR/reports"
export HF_HOME="$MODEL_DIR/cache/huggingface"
"$PYTHON_BIN" -m venv "$VENV"
"$VENV/bin/python" -m pip install --upgrade pip==25.3

# AMD's official ROCm 10.0 wheel build targets gfx1201 (Radeon RX 9070).
"$VENV/bin/python" -m pip install --index-url https://stable.repo.amd.com/rocm/whl-next/ \
  'torch[device-gfx1201]==2.13.0+rocm10.0.0' \
  'torchvision[device-gfx1201]==0.28.0+rocm10.0.0' \
  'torchaudio==2.11.0.2+rocm10.0.0'
"$VENV/bin/python" -m pip install -r "$MODEL_DIR/requirements-rocm.txt"

echo "Environment installed. Run scripts/preflight.py before downloading the model or any dataset."
