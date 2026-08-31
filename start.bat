@echo off
setlocal enabledelayedexpansion

title CulinaryOS — Turnkey Restaurant Operating System

echo ========================================================================
echo        CulinaryOS — Turnkey Restaurant Operating System (Windows)
echo ========================================================================
echo.

:: 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is required (v18 or higher) but was not found.
    echo Please download and install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: 2. Check pnpm
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [INFO] pnpm package manager not found. Installing pnpm globally...
    call npm install -g pnpm
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install pnpm. Please run: npm install -g pnpm
        pause
        exit /b 1
    )
)

:: 3. Setup .env if missing
if not exist ".env" (
    if exist ".env.example" (
        echo [INFO] Initializing .env configuration from .env.example...
        copy /y ".env.example" ".env" >nul
    )
)

:: 4. Launch Quickstart
echo [INFO] Starting CulinaryOS services (POS, KDS, Admin, Storefront, API)...
echo.
call pnpm quickstart

if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] If services stopped unexpectedly, you can restart by double-clicking start.bat again.
    pause
)
