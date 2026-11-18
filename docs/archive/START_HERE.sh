#!/usr/bin/env bash

# ============================================================
# CulinaryOS — 1-Click Multi-Profile Launcher for macOS & Linux
# ============================================================

set -e

# Change directory to repo root
cd "$(dirname "$0")"

echo "========================================================================"
echo "       CulinaryOS — Turnkey Restaurant Operating System (1-Click)"
echo "========================================================================"
echo ""

# 1. Profile selection if not passed as flag
PROFILE="demo"
if [ "$1" != "" ]; then
    PROFILE="$1"
else
    echo "Please select your installation profile:"
    echo "  [1] 🍽️  Demo Sandbox (Pre-loaded with sample bistro & menu)"
    echo "  [2] 🧼  Clean Production Slate (Blank canvas for real restaurant)"
    echo "  [3] 🚀  Marketing & Platform Showcase (Landing page & specs)"
    echo ""
    read -p "Enter choice [1-3] (Default: 1): " choice
    case "$choice" in
        2) PROFILE="clean" ;;
        3) PROFILE="marketing" ;;
        *) PROFILE="demo" ;;
    esac
fi

echo "⚡ Launching with profile: $PROFILE"
echo ""

# 2. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed."
    echo "Please install Node.js LTS (v20+) from https://nodejs.org or via brew/apt."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js detected: $NODE_VERSION"

# 3. Check or install pnpm
if ! command -v pnpm &> /dev/null; then
    echo "⚡ Installing pnpm package manager..."
    npm install -g pnpm || sudo npm install -g pnpm
fi

echo "✅ pnpm detected: $(pnpm -v)"

# 4. Ensure .env exists
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ .env created."
    fi
fi

# 5. Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# 6. Pre-build core libraries if needed
if [ ! -d "packages/ui/dist" ]; then
    echo "🔨 Building core design and calculation engines..."
    pnpm --filter @culinaryos/ratio-engine build
    pnpm --filter @culinaryos/ui build
fi

# 7. Launch all services with selected profile
echo ""
echo "========================================================================"
echo " 🚀 Starting CulinaryOS services with profile: $PROFILE"
echo "========================================================================"
echo ""

pnpm quickstart "--profile=$PROFILE"
