#!/usr/bin/env bash

# ============================================================
# CulinaryOS — 1-Click Zero-Config Launcher for macOS & Linux
# ============================================================

set -e

# Change directory to repo root
cd "$(dirname "$0")"

echo "========================================================================"
echo "       CulinaryOS — Turnkey Restaurant Operating System (1-Click)"
echo "========================================================================"
echo ""

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js LTS (v20+) from https://nodejs.org or via your package manager (brew install node / apt install nodejs)."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js detected: $NODE_VERSION"

# 2. Check or install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚡ Installing pnpm package manager..."
    npm install -g pnpm || sudo npm install -g pnpm
fi

echo "✅ pnpm detected: $(pnpm -v)"

# 3. Ensure .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        echo "⚡ Initializing .env configuration from template..."
        cp .env.example .env
        echo "✅ .env created."
    fi
fi

# 4. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 First-time setup: installing dependencies..."
    pnpm install
fi

# 5. Pre-build core libraries if needed
if [ ! -d "packages/ui/dist" ]; then
    echo "🔨 Pre-building core design and calculation engines..."
    pnpm --filter @culinaryos/ratio-engine build
    pnpm --filter @culinaryos/ui build
fi

# 6. Launch all services
echo ""
echo "========================================================================"
echo " 🚀 Starting all CulinaryOS restaurant applications..."
echo " 🌐 Opening browser at http://localhost:5180"
echo "========================================================================"
echo ""

pnpm quickstart
