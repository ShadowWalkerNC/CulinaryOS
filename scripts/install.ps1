# ============================================================
# CulinaryOS — 1-Click Turnkey Windows Installer & Launcher
# ============================================================
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     🍳 Installing CulinaryOS (Turnkey Restaurant OS)       " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is required (>= 18.0.0). Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# 2. Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "⚡ Installing pnpm package manager..." -ForegroundColor Yellow
    npm install -g pnpm
}

# 3. Initialize .env
if (-not (Test-Path ".env")) {
    Write-Host "⚡ Creating .env for zero-config offline demo..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 4. Install Dependencies
Write-Host "⚡ Installing monorepo dependencies..." -ForegroundColor Yellow
pnpm install

# 5. Pre-build core packages
Write-Host "⚡ Pre-building ratio and shared calculation engines..." -ForegroundColor Yellow
pnpm --filter @culinaryos/ratio-engine build
pnpm --filter @culinaryos/ui build

Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "🚀 Launching CulinaryOS Workstation..." -ForegroundColor Cyan
pnpm start
