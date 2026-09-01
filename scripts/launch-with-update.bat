@echo off
setlocal enabledelayedexpansion

title CulinaryOS Workstation — Auto-Updating Launcher

cd /d "%~dp0\.."

echo ========================================================================
echo        CulinaryOS — Turnkey Restaurant Workstation Launching
echo ========================================================================
echo.

:: 1. Auto-update to newest repository version via git pull
where git >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Checking for updates from newest repository...
    git pull --rebase origin main >nul 2>&1
    if !errorlevel! equ 0 (
        echo [SUCCESS] CulinaryOS updated to latest commit.
    ) else (
        echo [INFO] Continuing with local repository version.
    )
    echo.
)

:: 2. Ensure environment configuration
if not exist ".env" (
    if exist ".env.example" (
        copy /y ".env.example" ".env" >nul
    )
)

:: 3. Launch the restaurant OS services and auto-open browser
call pnpm quickstart

if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] CulinaryOS session stopped.
    pause
)
