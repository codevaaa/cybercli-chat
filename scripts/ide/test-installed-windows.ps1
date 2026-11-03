param([switch]$KeepInstalled)
$ErrorActionPreference = 'Stop'
$codevaRoot = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$codevaOutput = Join-Path $codevaRoot 'artifacts/codeva-editor'
$codevaInstaller = Join-Path $codevaOutput 'MrCodevaa-win-x64-setup.exe'
$codevaInstallDir = Join-Path $env:LOCALAPPDATA 'Programs/MrCodevaa'
$codevaExecutable = Join-Path $codevaInstallDir 'MrCodevaa.exe'
$codevaShortcut = Join-Path $env:APPDATA 'Microsoft/Windows/Start Menu/Programs/MrCodevaa/MrCodevaa.lnk'
if (Test-Path -LiteralPath $codevaInstallDir) { throw 'This smoke test requires an absent MrCodevaa install. It will not uninstall an existing user installation.' }
if (!(Test-Path -LiteralPath $codevaInstaller)) { throw 'Build the actual Windows installer first.' }
$codevaInstallLog = Join-Path $codevaOutput 'install.log'
$codevaInstalled = Start-Process -FilePath $codevaInstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART', '/MERGETASKS=!runcode,!associatewithfiles,!addtopath', "/DIR=`"$codevaInstallDir`"", "/LOG=`"$codevaInstallLog`"") -WindowStyle Hidden -Wait -PassThru
if ($codevaInstalled.ExitCode -ne 0) { throw "Actual installer failed: $($codevaInstalled.ExitCode)" }
if (!(Test-Path -LiteralPath $codevaExecutable) -or !(Test-Path -LiteralPath $codevaShortcut)) { throw 'Actual app/Start Menu shortcut is missing.' }
$codevaShell = New-Object -ComObject WScript.Shell
$codevaLink = $codevaShell.CreateShortcut($codevaShortcut)
if ($codevaLink.TargetPath -ne $codevaExecutable) { throw 'Start Menu does not point at the installed MrCodevaa.' }
New-Item -ItemType Directory -Force -Path (Join-Path $codevaOutput 'installed-smoke') | Out-Null
Add-Type -AssemblyName System.Drawing
$codevaNativeIcon = [System.Drawing.Icon]::ExtractAssociatedIcon($codevaExecutable)
$codevaIconBitmap = $codevaNativeIcon.ToBitmap()
$codevaIconBitmap.Save((Join-Path $codevaOutput 'installed-smoke/shortcut-icon.png'), [System.Drawing.Imaging.ImageFormat]::Png)
$codevaFaceColors = @{}
for ($codevaY = 0; $codevaY -lt $codevaIconBitmap.Height; $codevaY++) { for ($codevaX = 0; $codevaX -lt $codevaIconBitmap.Width; $codevaX++) { $codevaColor = $codevaIconBitmap.GetPixel($codevaX, $codevaY); $codevaFaceColors['{0:X2}{1:X2}{2:X2}' -f $codevaColor.R,$codevaColor.G,$codevaColor.B] = $true } }
$codevaIconBitmap.Dispose(); $codevaNativeIcon.Dispose()
foreach ($codevaFace in @('8C3E1C','E7A27A','F6F1E7')) { if (!$codevaFaceColors.ContainsKey($codevaFace)) { throw "Installed shortcut icon is missing Prism face $codevaFace" } }
# User requested opening the installed IDE; launch its real Start Menu shortcut.
Start-Process -FilePath $codevaShortcut
$codevaWindow = $null
for ($codevaAttempt = 0; $codevaAttempt -lt 60; $codevaAttempt++) {
  $codevaWindow = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $codevaExecutable -and $_.MainWindowTitle -like '*MrCodevaa*' } | Select-Object -First 1
  if ($codevaWindow) { break }
  Start-Sleep -Milliseconds 500
}
if (!$codevaWindow) { throw 'Start Menu did not open a branded IDE window.' }
$codevaTitle = $codevaWindow.MainWindowTitle
[void]$codevaWindow.CloseMainWindow()
$codevaWindow.WaitForExit(15000) | Out-Null
& node (Join-Path $PSScriptRoot 'verify-installed-ide.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Installed Electron workbench checks failed.' }
$codevaVsix = Join-Path $codevaRoot 'cybercoder/packages/vscode-extension/cybercoder.vsix'
if (Test-Path -LiteralPath $codevaVsix) {
  & (Join-Path $codevaInstallDir 'bin/mrcodevaa.cmd') --install-extension $codevaVsix --extensions-dir (Join-Path $codevaOutput 'installed-smoke/extensions')
  if ($LASTEXITCODE -ne 0) { throw 'Original CyberCoder VSIX failed to install in the installed IDE.' }
}
$codevaRemoved = $false
if (!$KeepInstalled) {
  $codevaUninstaller = Join-Path $codevaInstallDir 'unins000.exe'
  if (!(Test-Path -LiteralPath $codevaUninstaller)) { throw 'Actual uninstaller is missing.' }
  $codevaUninstall = Start-Process -FilePath $codevaUninstaller -ArgumentList @('/VERYSILENT', '/SUPPRESSMSGBOXES', '/NORESTART') -WindowStyle Hidden -Wait -PassThru
  if ($codevaUninstall.ExitCode -ne 0) { throw 'Actual uninstaller failed.' }
  for ($codevaAttempt = 0; $codevaAttempt -lt 30 -and (Test-Path -LiteralPath $codevaExecutable); $codevaAttempt++) { Start-Sleep -Milliseconds 500 }
  if ((Test-Path -LiteralPath $codevaExecutable) -or (Test-Path -LiteralPath $codevaShortcut)) { throw 'Uninstall left the executable or Start Menu shortcut.' }
  $codevaRemoved = $true
}
@{ installed = $true; start_menu_target = $codevaLink.TargetPath; start_menu_window_title = $codevaTitle; uninstalled = $codevaRemoved; windows_user = $env:USERNAME; clean_windows_runner = ($env:GITHUB_ACTIONS -eq 'true'); scope = 'Current Windows account; absence of product install asserted before setup, native window and uninstaller executed'; executed_at = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $codevaOutput 'windows-install-smoke.json')
Write-Output 'Actual current-user install, Start Menu and native workbench checks passed; uninstall status recorded.'
