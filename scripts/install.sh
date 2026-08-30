#!/usr/bin/env bash
# ============================================================
# CulinaryOS — 1-Click Turnkey macOS / Linux Installer & Launcher
# ============================================================
set -e

echo -e "\x1b[1;36m============================================================\x1b[0m"
echo -e "\x1b[1;33m     🍳 Installing CulinaryOS (Turnkey Restaurant OS)       \x1b[0m"
echo -e "\x1b[1;36m============================================================\x1b[0m"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "\x1b[1;31m❌ Node.js is required (>= 18.0.0). Please install from https://nodejs.org/\x1b[0m"
    exit 1
fi

# 2. Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "\x1b[1;33m⚡ Installing pnpm package manager...\x1b[0m"
    npm install -g pnpm
fi

# 3. Initialize .env
if [ ! -f ".env" ]; then
    echo -e "\x1b[1;33m⚡ Creating .env for zero-config offline demo...\x1b[0m"
    cp .env.example .env
fi

# 4. Install dependencies
echo -e "\x1b[1;33m⚡ Installing monorepo dependencies...\x1b[0m"
pnpm install

# 5. Pre-build core engines
echo -e "\x1b[1;33m⚡ Pre-building calculation engines...\x1b[0m"
pnpm --filter @culinaryos/ratio-engine build
pnpm --filter @culinaryos/ui build

echo -e "\x1b[1;32m✅ Installation complete!\x1b[0m"
echo -e "\x1b[1;36m🚀 Launching CulinaryOS Workstation...\x1b[0m"
pnpm start
