#!/usr/bin/env bash
set -e

echo "========================================================"
echo "         CulinaryOS One-Command Turnkey Launcher         "
echo "========================================================"
echo ""

if ! command -v pnpm &> /dev/null; then
    echo "[ERROR] pnpm is required but was not found."
    echo "Please install pnpm via: npm install -g pnpm"
    exit 1
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    echo "[INFO] Copying .env.example to .env..."
    cp .env.example .env
fi

echo "[INFO] Starting CulinaryOS full stack in demo mode..."
pnpm quickstart
