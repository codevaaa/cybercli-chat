from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = MODEL_DIR.parents[1]
CONFIG_FILE = MODEL_DIR / "config" / "training.json"
