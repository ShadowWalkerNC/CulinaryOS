<#
  Install culinaryos-intelligence into the CulinaryOS monorepo as an extension.

  Usage (from this repo root):
    powershell -ExecutionPolicy Bypass -File scripts\install-to-culinaryos.ps1
    powershell -ExecutionPolicy Bypass -File scripts\install-to-culinaryos.ps1 -CulinaryOSRoot "D:\Other\CulinaryOS" -Build

  Copies source + GUI + manifest to:
    <CulinaryOSRoot>\extensions\culinaryos-intelligence\

  Flags:
    -Build   also run npm install + npm run build in the installed copy
             (needs network for dev dependencies; skip for zero-install use)
#>
param(
  [string]$CulinaryOSRoot = "C:\Users\white\Documents\GitHub\CulinaryOS",
  [switch]$Build
)

$ErrorActionPreference = "Stop"
$src = Split-Path -Parent $PSScriptRoot
$dest = Join-Path $CulinaryOSRoot "extensions\culinaryos-intelligence"

if (-not (Test-Path (Join-Path $CulinaryOSRoot "pnpm-workspace.yaml"))) {
  throw "Not a CulinaryOS checkout (missing pnpm-workspace.yaml): $CulinaryOSRoot"
}

$exclude = @("node_modules", "dist", ".npm-cache", "data", ".git", "probe")
New-Item -ItemType Directory -Force -Path $dest | Out-Null

Get-ChildItem -Force -Path $src | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
  $target = Join-Path $dest $_.Name
  if (Test-Path $target) { Remove-Item -Recurse -Force $target }
  Copy-Item -Recurse -Force $_.FullName $target
}

Write-Host "Installed to $dest" -ForegroundColor Green

if ($Build) {
  Push-Location $dest
  try {
    npm install --no-audit --no-fund
    npm run build
  } finally {
    Pop-Location
  }
  Write-Host "Build complete." -ForegroundColor Green
} else {
  Write-Host "Skipped build. Zero-install usage from the installed folder:" -ForegroundColor Yellow
  Write-Host "  node src\cli.ts serve    # API + GUI at http://127.0.0.1:3100"
  Write-Host "  node src\cli.ts mcp      # MCP stdio server"
}

Write-Host ""
Write-Host "MCP host config (Claude Desktop / Codex / Gemini / Ollama host):"
Write-Host (@{
  mcpServers = @{
    "culinaryos-intelligence" = @{
      command = "node"
      args    = @("$dest\src\mcp\serve.ts")
      env     = @{ CULINARYOS_MODE = "mock" }
    }
  }
} | ConvertTo-Json -Depth 5)
