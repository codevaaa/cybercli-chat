# Run once as administrator for the existing dossier Docker sandbox host.
# No restart is performed by this script.
$ErrorActionPreference = 'Stop'
$codevaStatuses = @()
foreach ($codevaFeature in @('VirtualMachinePlatform','Microsoft-Windows-Subsystem-Linux')) {
    $codevaState = Get-WindowsOptionalFeature -Online -FeatureName $codevaFeature
    if ($codevaState.State -ne 'Enabled') {
        $codevaChanged = Enable-WindowsOptionalFeature -Online -FeatureName $codevaFeature -All -NoRestart
        $codevaStatuses += @{ name = $codevaFeature; state = 'Enable requested'; restart_needed = $codevaChanged.RestartNeeded }
    } else { $codevaStatuses += @{ name = $codevaFeature; state = 'Enabled'; restart_needed = $false } }
}
$codevaRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$codevaDirectory = Join-Path $codevaRoot 'artifacts\codeva-editor'
New-Item -ItemType Directory -Force -Path $codevaDirectory | Out-Null
$codevaStatuses | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $codevaDirectory 'host-setup-status.json') -Encoding utf8
