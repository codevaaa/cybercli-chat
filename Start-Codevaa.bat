@echo off
title Codevaa AI IDE
cd /d "%~dp0"

REM Always launch via subst X: — the monorepo path has spaces ("webof _up_nz"),
REM which breaks Electron/network service + workbench module loads (DevTools-only / hundreds of errors).
set "UPSTREAM=%~dp0upstream\vscode"
subst X: "%UPSTREAM%" >nul 2>&1
if not exist "X:\.build\electron\Codevaa.exe" (
    echo.
    echo  [ERROR] Codevaa.exe not found after subst X: -^> "%UPSTREAM%"
    echo  Build Electron first:
    echo    subst X: "%UPSTREAM%"
    echo    cd /d X:\
    echo    npm run electron
    echo.
    pause
    exit /b 1
)

REM Ensure node-pty conpty.dll is present (post-install may have been skipped).
REM Without this, integrated terminal fails: Cannot find conpty.dll ... error code 3.
if not exist "X:\node_modules\node-pty\build\Release\conpty\conpty.dll" (
  if exist "X:\node_modules\node-pty\scripts\post-install.js" (
    echo  [fix] Restoring conpty.dll for integrated terminal...
    pushd "X:\node_modules\node-pty"
    node scripts\post-install.js
    popd
  )
)
if not exist "X:\node_modules\node-pty\build\Release\conpty\conpty.dll" (
  echo.
  echo  [WARN] conpty.dll still missing — terminal may fail to launch.
  echo  Run: node X:\node_modules\node-pty\scripts\post-install.js
  echo.
)

REM Clear hung / half-open instances that block a real workbench window
taskkill /F /IM Codevaa.exe >nul 2>&1

set NODE_ENV=development
set VSCODE_DEV=1
set VSCODE_CLI=1
set VSCODE_SKIP_PRELAUNCH=1
set ELECTRON_ENABLE_LOGGING=
set ELECTRON_ENABLE_STACK_DUMPING=

echo.
echo  Starting Codevaa AI IDE...
echo  X:\.build\electron\Codevaa.exe
echo.

REM Detached start from X:\ so argv/cwd have no spaces
start "" /D "X:\" "X:\.build\electron\Codevaa.exe" . --disable-extension=vscode.vscode-api-tests %*
exit /b 0
