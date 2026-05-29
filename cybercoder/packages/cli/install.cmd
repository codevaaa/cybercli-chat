@echo off
:: CyberCoder CLI Installer for Windows CMD
:: Usage: curl -fsSL https://cybermindcli.info/install.cmd -o install.cmd && install.cmd && del install.cmd

echo.
echo   Welcome to CyberCoder CLI Installer
echo   Fullstack agentic coding assistant
echo.

:: Check Node.js
node -v >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js is not installed. Please install Node.js ^>= 20.0.0 first.
  echo [INFO]  Visit: https://nodejs.org/
  exit /b 1
)

for /f "tokens=*" %%a in ('node -v') do set NODE_VERSION=%%a
set NODE_VERSION=%NODE_VERSION:v=%
echo [OK]    Node.js %NODE_VERSION% detected

:: Check npm
npm -v >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm is not installed.
  exit /b 1
)
echo [OK]    npm detected

:: Install
if "%CYBERCODER_VERSION%"=="" (
  set CYBERCODER_VERSION=latest
)

echo [INFO]  Installing CyberCoder CLI...
if "%CYBERCODER_VERSION%"=="latest" (
  call npm install -g @cybercli_chat/cli --force
) else (
  call npm install -g @cybercli_chat/cli@%CYBERCODER_VERSION% --force
)

if errorlevel 1 (
  echo [ERROR] Installation failed.
  exit /b 1
)

echo [OK]    CyberCoder CLI installed successfully!

cm --version >nul 2>&1
if errorlevel 1 (
  echo [WARN]  cm command not found in PATH. Restart your terminal.
) else (
  for /f "tokens=*" %%a in ('cm --version') do set CM_VERSION=%%a
  echo [OK]    cm is available: %CM_VERSION%
)

echo.
echo [OK]    Installation complete!
echo [INFO]  Get started:
echo     cm --version     ^| Check version
echo     cm               ^| Launch interactive mode
echo     cm /init         ^| Create AGENTS.md for your project
echo     cm /help         ^| List all commands
echo.
echo [INFO]  Documentation: https://cybermindcli.info/docs
echo.
