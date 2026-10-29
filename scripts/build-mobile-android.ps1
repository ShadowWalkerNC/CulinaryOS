# ============================================================
# CulinaryOS Mobile Companion (Android / iOS Expo SDK 52)
# Build, Typecheck & ADB Port-Forward Helper
# ============================================================

param(
    [switch]$PortForward,
    [string]$DeviceSerial = "",
    [int]$ApiPort = 3000
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$MobileDir = Join-Path $RepoRoot "mobile"

Write-Host "[>>] Verifying CulinaryOS Mobile Companion TypeScript compilation..." -ForegroundColor Cyan
Push-Location $RepoRoot
try {
    pnpm --filter culinaryos-mobile typecheck
    if ($LASTEXITCODE -ne 0) {
        throw "Mobile Companion typecheck failed"
    }
    Write-Host "[OK] culinaryos-mobile typecheck passed!" -ForegroundColor Green
} finally {
    Pop-Location
}

if ($PortForward) {
    $AdbCandidates = @(
        (Join-Path $env:APPDATA "cleanmytv\tools\platform-tools\adb.exe"),
        "C:\Users\white\Desktop\CleanMyTV\.cytv-build\tools\platform-tools\adb.exe",
        "adb"
    )
    $AdbBin = $AdbCandidates | Where-Object { $_ -eq "adb" -or (Test-Path $_) } | Select-Object -First 1
    $BaseArgs = @()
    if ($DeviceSerial) {
        $BaseArgs += @("-s", $DeviceSerial)
    }
    Write-Host "[>>] Forwarding Android device tcp:$ApiPort -> host tcp:$ApiPort via $AdbBin..." -ForegroundColor Cyan
    & $AdbBin @BaseArgs reverse "tcp:$ApiPort" "tcp:$ApiPort"
    Write-Host "[OK] ADB reverse port-forward active on tcp:$ApiPort" -ForegroundColor Green
}
