@echo off
setlocal enabledelayedexpansion

title CulinaryOS — Turnkey Restaurant Operating System

echo ========================================================================
echo        CulinaryOS — Turnkey Restaurant Operating System (1-Click)
echo ========================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Node.js was not detected on this machine.
    where winget >nul 2>nul
    if !errorlevel! equ 0 (
        echo [INFO] Installing Node.js LTS automatically via Windows Package Manager...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        echo.
        echo [SUCCESS] Node.js installed! Please close and re-run START_HERE.bat.
        pause
        exit /b 0
    ) else (
        echo [INFO] Opening official Node.js installer page...
        start https://nodejs.org/
        echo Please install the LTS version from the browser, then re-run this script.
        pause
        exit /b 1
    )
)

:: 2. Check pnpm package manager
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] Installing pnpm package manager globally...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [WARNING] Global install failed, attempting local npx run...
    )
)

:: 3. Ensure .env file exists
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
    )
)

:: 4. Ensure dependencies are installed
if not exist "node_modules" (
    echo [INFO] First-time setup: installing dependencies (this may take 1-2 minutes)...
    call pnpm install
)

:: 5. Pre-build core packages
if not exist "packages\ui\dist" (
    echo [INFO] Pre-building core design and calculation engines...
    call pnpm --filter @culinaryos/ratio-engine build
    call pnpm --filter @culinaryos/ui build
)

:: 6. Launch full restaurant OS
echo.
echo ========================================================================
echo  🚀 Starting all CulinaryOS restaurant applications...
echo  🌐 Your browser will open automatically!
echo ========================================================================
echo.

call pnpm quickstart %*

if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Services stopped. You can restart anytime by running START_HERE.bat.
    pause
)
