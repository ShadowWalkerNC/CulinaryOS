@echo off
echo ========================================================
echo          CulinaryOS One-Click Turnkey Launcher          
echo ========================================================
echo.

where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] pnpm is required but was not found in PATH.
    echo Please install pnpm via: npm install -g pnpm
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Copying .env.example to .env...
        copy .env.example .env >nul
    )
)

echo [INFO] Starting CulinaryOS full stack in demo mode...
pnpm quickstart
