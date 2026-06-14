#!/bin/bash
# ============================================================
# Build and push Codeva Hunter E2B custom sandbox image
#
# Prerequisites:
#   npm install -g @e2b/cli
#   e2b auth login
#
# Usage:
#   bash hunter-engine/e2b/build.sh
#
# This creates a persistent sandbox template so every hunt
# starts instantly — no tool installation time.
# ============================================================

set -e

echo "=============================================="
echo "  Codeva Hunter — E2B Template Builder"
echo "=============================================="
echo ""
echo "This will build a Ubuntu Linux sandbox with 250+"
echo "security tools pre-installed."
echo ""
echo "Build time: ~15-20 minutes (one time only)"
echo "After build: hunts start instantly"
echo ""

# Check e2b CLI
if ! command -v e2b &>/dev/null; then
    echo "[ERROR] e2b CLI not found. Install with:"
    echo "  npm install -g @e2b/cli"
    echo "  e2b auth login"
    exit 1
fi

# Check auth
echo "[*] Checking E2B auth..."
e2b auth info 2>/dev/null || {
    echo "[ERROR] Not logged in. Run: e2b auth login"
    exit 1
}

# Build template
echo "[*] Building template (this takes 15-20 min)..."
cd "$(dirname "$0")"

e2b template build \
    --dockerfile ./Dockerfile \
    --name "codeva-hunter-v1" \
    --cpu-count 2 \
    --memory-mb 2048

echo ""
echo "[SUCCESS] Template built!"
echo ""
echo "Next steps:"
echo "1. Copy the template ID shown above"
echo "2. Add to your backend .env:"
echo "   E2B_API_KEY=your_key"
echo "   E2B_SANDBOX_TEMPLATE_ID=your_template_id"
echo ""
echo "Hunts will now start in <5 seconds on any OS!"
