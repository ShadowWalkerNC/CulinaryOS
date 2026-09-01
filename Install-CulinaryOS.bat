@echo off
setlocal enabledelayedexpansion

title CulinaryOS — 1-Click Windows Installer & Desktop Setup

echo ========================================================================
echo        CulinaryOS — Windows 1-Click Installer & Desktop Setup
echo ========================================================================
echo.
echo Installing CulinaryOS restaurant operating system on your machine...
echo.

:: 1. Verify / Install Node.js LTS
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js not found.
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo [INFO] Installing Node.js LTS automatically via Windows Package Manager...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        echo [SUCCESS] Node.js installed!
    ) else (
        echo [INFO] Opening official Node.js installer...
        start https://nodejs.org/
        echo Please complete Node.js LTS installation, then re-run Install-CulinaryOS.bat.
        pause
        exit /b 1
    )
)

:: 2. Verify / Install pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing pnpm package manager globally...
    call npm install -g pnpm
)

:: 3. Create .env configuration
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Creating .env demo configuration...
        copy /y ".env.example" ".env" >nul
    )
)

:: 4. Install Node modules
if not exist "node_modules" (
    echo [INFO] Installing monorepo dependencies (1-2 minutes)...
    call pnpm install
)

:: 5. Pre-build core UI and engines
echo [INFO] Building core calculation & UI engines...
call pnpm --filter @culinaryos/ratio-engine build
call pnpm --filter @culinaryos/shared build
call pnpm --filter @culinaryos/ui build

:: 6. Create Desktop Shortcut
echo [INFO] Creating Desktop shortcut 'CulinaryOS' on your Desktop...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"

echo.
echo ========================================================================
echo  🎉 INSTALLATION COMPLETE!
echo.
echo  A 'CulinaryOS' shortcut has been added to your Windows Desktop.
echo  Double-clicking it will auto-update to the latest version and start
echo  the full restaurant workstation and API server with 1 click!
echo ========================================================================
echo.

set /p START_NOW="Would you like to start CulinaryOS right now? (Y/N): "
if /i "%START_NOW%"=="Y" (
    call "%~dp0scripts\launch-with-update.bat"
)
