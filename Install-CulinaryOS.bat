@echo off
setlocal enabledelayedexpansion

title CulinaryOS — Turnkey 1-Click Windows Installation & Setup

echo ========================================================================
echo        CulinaryOS — Turnkey Windows Workstation Installer
echo ========================================================================
echo.

:: Check if PowerShell is available to run full turnkey installer
where powershell >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Launching CulinaryOS Turnkey PowerShell Installer...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows-turnkey.ps1"
    exit /b %errorlevel%
)

:: Fallback Native Command Prompt Installer
echo [INFO] Running native fallback installation...
echo.

:: 1. Profile Selection Menu
echo Please select your installation profile:
echo.
echo   [1] 🍽️  Demo Sandbox (Recommended for Testing)
echo       - Pre-loaded with sample "The Golden Fork" bistro
echo       - Complete sample menu (pizzas, burgers, appetizers, drinks)
echo       - Pre-configured tables, 3D dining floor, and staff PINs (1234 / 5678)
echo       - Opens unified Desktop Workstation (:5180)
echo.
echo   [2] 🧼  Clean Production Slate (Blank Slate for Live Restaurant)
echo       - Blank database & empty catalog with zero demo orders or fake menus
echo       - Ready to connect to live Supabase / PostgreSQL database
echo       - Opens Admin Onboarding & Menu Setup Wizard (:5174)
echo.
echo   [3] 🚀  Marketing & Platform Showcase
echo       - Opens the public Marketing Landing Page & interactive feature tour
echo       - Live ROI calculator, feature matrices, and architecture overview (:5176)
echo.
set /p PROFILE_CHOICE="Enter profile choice [1-3] (Default is 1): "

set INSTALL_PROFILE=demo
if "%PROFILE_CHOICE%"=="2" (
    set INSTALL_PROFILE=clean
)
if "%PROFILE_CHOICE%"=="3" (
    set INSTALL_PROFILE=marketing
)

echo.
echo [INFO] Selected profile: %INSTALL_PROFILE%
echo.

:: 2. Verify / Install Node.js LTS
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js not found.
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo [INFO] Installing Node.js LTS automatically via Windows Package Manager...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        echo [SUCCESS] Node.js installed!
    ) else (
        echo [INFO] Opening official Node.js installer...
        start https://nodejs.org/
        echo Please complete Node.js LTS installation, then re-run Install-CulinaryOS.bat.
        pause
        exit /b 1
    )
)

:: 3. Verify / Install pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing pnpm package manager globally...
    call npm install -g pnpm
)

:: 4. Create .env configuration with profile
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
    )
)

findstr /v "INSTALL_PROFILE=" .env > .env.tmp 2>nul
echo INSTALL_PROFILE=%INSTALL_PROFILE%>> .env.tmp
move /y .env.tmp .env >nul

:: 5. Install Node modules
echo [INFO] Installing monorepo dependencies...
call pnpm install

:: 6. Pre-build core UI and engines
echo [INFO] Building core calculation & UI engines...
call pnpm --filter @culinaryos/ratio-engine build
call pnpm --filter @culinaryos/shared build
call pnpm --filter @culinaryos/ui build

:: 7. Create Desktop Shortcut
echo [INFO] Creating Desktop shortcut 'CulinaryOS' on your Desktop...
where powershell >nul 2>nul
if %errorlevel% equ 0 (
    powershell -ExecutionPolicy Bypass -File "%~dp0scripts\create-desktop-shortcut.ps1"
)

:: 8. Configure Firewall
where netsh >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Configuring Windows Firewall rules for ports 3000, 5172-5180, 5188...
    netsh advfirewall firewall add rule name="CulinaryOS Local Restaurant Network" dir=in action=allow protocol=TCP localport=3000,5172,5173,5174,5175,5176,5177,5180,5188 profile=private,domain >nul 2>&1
)

:: 9. Run Diagnostics Preflight
echo [INFO] Running diagnostics preflight...
call pnpm doctor

echo.
echo ========================================================================
echo  🎉 INSTALLATION COMPLETE! (Profile: %INSTALL_PROFILE%)
echo.
echo  A 'CulinaryOS' shortcut has been added to your Windows Desktop.
echo  Double-clicking it will auto-update to the latest version and start
echo  the full restaurant workstation with 1 click!
echo ========================================================================
echo.

set /p START_NOW="Would you like to start CulinaryOS right now? (Y/N, Default: Y): "
if "%START_NOW%"=="" set START_NOW=Y
if /i "%START_NOW%"=="Y" (
    call "%~dp0scripts\launch-with-update.bat" --profile=%INSTALL_PROFILE%
)
