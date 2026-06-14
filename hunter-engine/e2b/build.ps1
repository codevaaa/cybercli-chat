# ============================================================
# Codeva Hunter — E2B Template Builder (PowerShell)
# Run from: hunter-engine/e2b/
# ============================================================

Write-Host ""
Write-Host "=============================================="
Write-Host "  Codeva Hunter — E2B Template Builder"
Write-Host "=============================================="
Write-Host ""
Write-Host "Building Ubuntu sandbox with 300+ security tools."
Write-Host "Build time: ~15-20 minutes (one time only)."
Write-Host "After build: hunts start instantly."
Write-Host ""

# Check e2b CLI
$e2bPath = Get-Command "e2b" -ErrorAction SilentlyContinue
if (-not $e2bPath) {
    Write-Host "[ERROR] e2b CLI not found. Run:" -ForegroundColor Red
    Write-Host "  npm install -g @e2b/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "[*] E2B CLI found: $($e2bPath.Source)"
Write-Host "[*] Building template (this takes 15-20 min)..."
Write-Host ""

# Build the template from Dockerfile in current directory
& e2b template build --dockerfile ./Dockerfile --name "codeva-hunter-v1" --cpu-count 2 --memory-mb 2048

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Build failed. Check output above." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=============================================="
Write-Host "[SUCCESS] Template built!" -ForegroundColor Green
Write-Host "=============================================="
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Copy the template ID shown above"
Write-Host "2. Add to backend/.env on Render:"
Write-Host "   E2B_SANDBOX_TEMPLATE_ID=<template-id>"
Write-Host ""
Write-Host "Done! Hunts will now start in under 5 seconds."
