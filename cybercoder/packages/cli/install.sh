#!/usr/bin/env bash
# CyberCoder CLI Installer
# Usage: curl -fsSL https://cybermindcli.info/install.sh | bash

set -e

CYBERCODER_VERSION="${CYBERCODER_VERSION:-latest}"
NPM_REGISTRY="https://registry.npmjs.org"
PACKAGE="@cybercli_chat/cli"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info()  { echo -e "${CYAN}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}   $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }

# Check Node.js version
check_node() {
  if ! command -v node >/dev/null 2>&1; then
    log_error "Node.js is not installed. Please install Node.js >= 20.0.0 first."
    log_info "Visit: https://nodejs.org/"
    exit 1
  fi

  NODE_VERSION=$(node -v | sed 's/v//')
  REQUIRED="20.0.0"

  if [ "$(printf '%s\n' "$REQUIRED" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED" ]; then
    log_error "Node.js >= 20.0.0 is required. Found: $NODE_VERSION"
    exit 1
  fi

  log_ok "Node.js $NODE_VERSION detected"
}

# Check npm
check_npm() {
  if ! command -v npm >/dev/null 2>&1; then
    log_error "npm is not installed."
    exit 1
  fi
  log_ok "npm detected"
}

# Install the CLI
install_cli() {
  log_info "Installing CyberCoder CLI..."

  if [ "$CYBERCODER_VERSION" = "latest" ]; then
    npm install -g "$PACKAGE" --force
  else
    npm install -g "$PACKAGE@$CYBERCODER_VERSION" --force
  fi

  log_ok "CyberCoder CLI installed successfully!"
}

# Verify installation
verify() {
  if command -v cm >/dev/null 2>&1; then
    VERSION=$(cm --version 2>/dev/null || echo "unknown")
    log_ok "cm is available: $VERSION"
  else
    log_warn "cm command not found in PATH. You may need to restart your terminal."
  fi
}

# Main
main() {
  echo ""
  echo "  ╭────────────────────────────────────────────────╮"
  echo "  │     Welcome to CyberCoder CLI Installer       │"
  echo "  │     Fullstack agentic coding assistant          │"
  echo "  ╰────────────────────────────────────────────────╯"
  echo ""

  check_node
  check_npm
  install_cli
  verify

  echo ""
  log_ok "Installation complete!"
  log_info "Get started:"
  echo "    cm --version     # Check version"
  echo "    cm               # Launch interactive mode"
  echo "    cm /init         # Create AGENTS.md for your project"
  echo "    cm /help         # List all commands"
  echo ""
  log_info "Documentation: https://cybermindcli.info/docs"
  echo ""
}

main "$@"
