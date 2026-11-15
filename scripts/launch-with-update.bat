@echo off
setlocal enabledelayedexpansion

title CulinaryOS Workstation

cd /d "%~dp0\.."

echo ========================================================================
echo        CulinaryOS — Turnkey Restaurant Workstation Launching
echo ========================================================================
echo.

:: Launch the installed checkout. Updates are a separate operator maintenance task.
echo [INFO] Starting the installed version. No automatic updates are applied.

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
