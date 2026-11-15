# ============================================================
# CulinaryOS — 1-Click Turnkey Windows Installer & Launcher
# ============================================================
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     🍳 Installing CulinaryOS (Turnkey Restaurant OS)       " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
Write-Host "Development/demo setup only. Production self-host installation is not yet available." -ForegroundColor Yellow

# 1. Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is required (>= 22.0.0). Please install from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'
if ($LASTEXITCODE -ne 0) {
    Write-Host "Node.js 22 or newer is required. Upgrade Node.js and rerun this installer." -ForegroundColor Red
    exit 1
}

# 2. Check pnpm
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "⚡ Installing pnpm package manager..." -ForegroundColor Yellow
    npm install -g pnpm
    if ($LASTEXITCODE -ne 0) { throw "Setup command failed (exit $LASTEXITCODE). Setup stopped; resolve the failure and rerun." }
}

# 3. Initialize .env
if (-not (Test-Path ".env")) {
    Write-Host "⚡ Creating .env for zero-config offline demo..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 4. Install Dependencies
Write-Host "⚡ Installing monorepo dependencies..." -ForegroundColor Yellow
pnpm install
if ($LASTEXITCODE -ne 0) { throw "Setup command failed (exit $LASTEXITCODE). Setup stopped; resolve the failure and rerun." }

# 5. Pre-build core packages
Write-Host "⚡ Pre-building ratio and shared calculation engines..." -ForegroundColor Yellow
pnpm --filter @culinaryos/ratio-engine build
if ($LASTEXITCODE -ne 0) { throw "Setup command failed (exit $LASTEXITCODE). Setup stopped; resolve the failure and rerun." }
pnpm --filter @culinaryos/ui build
if ($LASTEXITCODE -ne 0) { throw "Setup command failed (exit $LASTEXITCODE). Setup stopped; resolve the failure and rerun." }

Write-Host "✅ Development dependencies installed!" -ForegroundColor Green
Write-Host "🚀 Launching CulinaryOS Workstation..." -ForegroundColor Cyan
pnpm start
if ($LASTEXITCODE -ne 0) { throw "Setup command failed (exit $LASTEXITCODE). Setup stopped; resolve the failure and rerun." }
