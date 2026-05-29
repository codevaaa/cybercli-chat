# CyberCoder CLI Installer for Windows PowerShell
# Usage: irm https://cybermindcli.info/install.ps1 | iex

$ErrorActionPreference = "Stop"

$CYBERCODER_VERSION = if ($env:CYBERCODER_VERSION) { $env:CYBERCODER_VERSION } else { "latest" }
$PACKAGE = "@cybercli_chat/cli"

function Write-Info  { param($msg) Write-Host "[INFO]  $msg" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "[OK]    $msg" -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow }
function Write-Error { param($msg) Write-Host "[ERROR] $msg" -ForegroundColor Red }

function Test-Node {
  try {
    $nodeVersion = (node -v).Trim().Replace("v", "")
    $required = [Version]::new(20, 0, 0)
    $current = [Version]::new($nodeVersion)

    if ($current -lt $required) {
      Write-Error "Node.js >= 20.0.0 is required. Found: $nodeVersion"
      exit 1
    }
    Write-Ok "Node.js $nodeVersion detected"
  } catch {
    Write-Error "Node.js is not installed. Please install Node.js >= 20.0.0 first."
    Write-Info "Visit: https://nodejs.org/"
    exit 1
  }
}

function Test-Npm {
  try {
    $null = Get-Command npm -ErrorAction Stop
    Write-Ok "npm detected"
  } catch {
    Write-Error "npm is not installed."
    exit 1
  }
}

function Install-CyberCoder {
  Write-Info "Installing CyberCoder CLI..."

  if ($CYBERCODER_VERSION -eq "latest") {
    npm install -g $PACKAGE --force
  } else {
    npm install -g "$PACKAGE@$CYBERCODER_VERSION" --force
  }

  Write-Ok "CyberCoder CLI installed successfully!"
}

function Test-Installation {
  try {
    $version = cm --version 2>$null
    Write-Ok "cm is available: $version"
  } catch {
    Write-Warn "cm command not found in PATH. You may need to restart your terminal."
  }
}

# Main
Write-Host ""
Write-Host "  Welcome to CyberCoder CLI Installer"
Write-Host "  Fullstack agentic coding assistant"
Write-Host ""

Test-Node
Test-Npm
Install-CyberCoder
Test-Installation

Write-Host ""
Write-Ok "Installation complete!"
Write-Info "Get started:"
Write-Host "    cm --version     # Check version"
Write-Host "    cm               # Launch interactive mode"
Write-Host "    cm /init         # Create AGENTS.md for your project"
Write-Host "    cm /help         # List all commands"
Write-Host ""
Write-Info "Documentation: https://cybermindcli.info/docs"
Write-Host ""
