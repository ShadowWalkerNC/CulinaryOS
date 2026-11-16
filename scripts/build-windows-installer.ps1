<#
.SYNOPSIS
    Builds the standalone 1-click Windows release package and installer for CulinaryOS.
.DESCRIPTION
    Compiles release Rust binary, stages all pre-compiled production web assets,
    generates 1-click installer and uninstaller scripts, and compresses into a distributable zip.
#>
param(
    [string]$Version = "1.3.1"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CulinaryOS Standalone Windows Release Packager v$Version" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Compile Release Binary
Write-Host "[1/5] Compiling native release binary..." -ForegroundColor Yellow
cargo build --release --manifest-path apps/desktop/src-tauri/Cargo.toml
if ($LASTEXITCODE -ne 0) {
    throw "Cargo build failed with code $LASTEXITCODE"
}

$ExeSource = Join-Path $RepoRoot "target\release\culinaryos-desktop.exe"
if (-not (Test-Path $ExeSource)) {
    throw "Release executable not found at $ExeSource"
}

# 2. Setup Staging Directory
$DistDir = Join-Path $RepoRoot "dist-installer"
$StagingDir = Join-Path $DistDir "staging\CulinaryOS"
if (Test-Path $DistDir) {
    Remove-Item -Recurse -Force $DistDir
}
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

Write-Host "[2/5] Copying release binary and assets..." -ForegroundColor Yellow
Copy-Item $ExeSource (Join-Path $StagingDir "culinaryos-desktop.exe")

# 3. Copy Application Dist Bundles
$AppsToBundle = @("admin", "pos", "kds", "kitchenkit", "web", "ops", "display", "desktop")
foreach ($app in $AppsToBundle) {
    $srcDist = Join-Path $RepoRoot "apps\$app\dist"
    $targetDist = Join-Path $StagingDir "apps\$app\dist"
    if (Test-Path $srcDist) {
        Write-Host "  -> Bundling app: $app" -ForegroundColor Green
        New-Item -ItemType Directory -Path (Split-Path -Parent $targetDist) -Force | Out-Null
        Copy-Item -Recurse $srcDist $targetDist
    } else {
        Write-Warning "Dist folder for $app not found at $srcDist; building now..."
        pnpm --filter "@culinaryos/app-$app" build
        Copy-Item -Recurse $srcDist $targetDist
    }
}

# 4. Generate 1-Click Installer and Uninstaller Scripts
Write-Host "[3/5] Generating installer scripts..." -ForegroundColor Yellow

$InstallerPs1Content = @'
param(
    [switch]$Unattended,
    [switch]$NoLaunch
)

$Host.UI.RawUI.WindowTitle = "CulinaryOS Workstation Installer"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CulinaryOS Standalone Workstation Installer v1.3.1" -ForegroundColor Cyan
Write-Host "  Industrial Open-Source Alternative to Toast and Square" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$TargetDir = Join-Path $env:LOCALAPPDATA "CulinaryOS"
Write-Host "[*] Installing to: $TargetDir" -ForegroundColor Yellow

if (-not (Test-Path $TargetDir)) {
    New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null
}

Write-Host "[*] Copying application binaries and web assets..." -ForegroundColor Yellow
$SourceDir = $PSScriptRoot
Get-ChildItem -Path $SourceDir | Where-Object { $_.Name -notin @("installer.ps1", "uninstaller.ps1") } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $TargetDir -Recurse -Force
}
Copy-Item (Join-Path $SourceDir "uninstaller.ps1") (Join-Path $TargetDir "uninstaller.ps1") -Force

Write-Host "[*] Creating Desktop and Start Menu shortcuts..." -ForegroundColor Yellow
$WshShell = New-Object -ComObject WScript.Shell
$Desktop = [System.Environment]::GetFolderPath('Desktop')
$DesktopShortcut = $WshShell.CreateShortcut((Join-Path $Desktop 'CulinaryOS Workstation.lnk'))
$DesktopShortcut.TargetPath = (Join-Path $TargetDir 'culinaryos-desktop.exe')
$DesktopShortcut.WorkingDirectory = $TargetDir
$DesktopShortcut.Description = 'CulinaryOS POS, KDS and Restaurant Management Workstation'
$DesktopShortcut.Save()

$Programs = [System.Environment]::GetFolderPath('Programs')
$StartMenuDir = Join-Path $Programs 'CulinaryOS'
if (-not (Test-Path $StartMenuDir)) {
    New-Item -ItemType Directory -Path $StartMenuDir -Force | Out-Null
}
$StartMenuShortcut = $WshShell.CreateShortcut((Join-Path $StartMenuDir 'CulinaryOS Workstation.lnk'))
$StartMenuShortcut.TargetPath = (Join-Path $TargetDir 'culinaryos-desktop.exe')
$StartMenuShortcut.WorkingDirectory = $TargetDir
$StartMenuShortcut.Description = 'CulinaryOS POS, KDS and Restaurant Management Workstation'
$StartMenuShortcut.Save()

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "  A desktop shortcut has been created: CulinaryOS Workstation" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

if ($NoLaunch) {
    exit 0
}

if ($Unattended) {
    Start-Process (Join-Path $TargetDir "culinaryos-desktop.exe")
    exit 0
}

$choice = Read-Host "Would you like to launch CulinaryOS Workstation now? (Y/N)"
if ($choice -eq 'Y' -or $choice -eq 'y') {
    Start-Process (Join-Path $TargetDir "culinaryos-desktop.exe")
}
'@
Set-Content -Path (Join-Path $StagingDir "installer.ps1") -Value $InstallerPs1Content -Encoding UTF8

$InstallCmdContent = @"
@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer.ps1" %*
"@
Set-Content -Path (Join-Path $StagingDir "Install-CulinaryOS.cmd") -Value $InstallCmdContent -Encoding Ascii

$UninstallerPs1Content = @'
$Host.UI.RawUI.WindowTitle = "CulinaryOS Workstation Uninstaller"
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CulinaryOS Standalone Workstation Uninstaller" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$TargetDir = Join-Path $env:LOCALAPPDATA "CulinaryOS"
Write-Host "[*] Removing application files from: $TargetDir" -ForegroundColor Yellow

$Desktop = [System.Environment]::GetFolderPath('Desktop')
$DesktopShortcut = Join-Path $Desktop 'CulinaryOS Workstation.lnk'
if (Test-Path $DesktopShortcut) { Remove-Item -Force $DesktopShortcut }

$Programs = [System.Environment]::GetFolderPath('Programs')
$StartMenuDir = Join-Path $Programs 'CulinaryOS'
if (Test-Path $StartMenuDir) { Remove-Item -Recurse -Force $StartMenuDir }

if (Test-Path $TargetDir) {
    Remove-Item -Recurse -Force $TargetDir
}

Write-Host "[*] CulinaryOS has been cleanly removed from this system." -ForegroundColor Green
Write-Host ""
Read-Host "Press Enter to exit"
'@
Set-Content -Path (Join-Path $StagingDir "uninstaller.ps1") -Value $UninstallerPs1Content -Encoding UTF8

$UninstallCmdContent = @"
@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstaller.ps1" %*
"@
Set-Content -Path (Join-Path $StagingDir "Uninstall-CulinaryOS.cmd") -Value $UninstallCmdContent -Encoding Ascii

# Generate Readme
$ReadmeContent = @"
==========================================================
CulinaryOS Standalone Native Workstation (Windows x64)
Version $Version
==========================================================

CulinaryOS is an industrial open-source restaurant operating system 
built to compete directly with Toast POS and Square.

HOW TO INSTALL:
1. Double-click 'Install-CulinaryOS.cmd'.
2. The workstation files will install to:
   %LOCALAPPDATA%\CulinaryOS
3. A desktop shortcut 'CulinaryOS Workstation' will be created.

HOW TO RUN:
- Click the Desktop shortcut, or run:
  culinaryos-desktop.exe

KEYBOARD SHORTCUTS IN WORKSTATION:
  F1: Point of Sale (POS)
  F2: Kitchen Display System (KDS)
  F3: Back Office Admin & Menu
  F4: KitchenKit Prep & Conversions
  F5: Digital Menu Board
  F6: Operations & Shifts
  F8: Kick Cash Drawer (ESC/POS pin 2 pulse)
  F9: End of Day Z-Report Summary
  F10: Mobile QR Code Pairing
  F11: Toggle Fullscreen Kiosk Mode

PORTS & ARCHITECTURE:
- Unified Workstation & 32-Route API: http://127.0.0.1:3000
- Embedded Database: %APPDATA%\CulinaryOS\culinaryos.db
- Fully offline-first: Zero internet required for local operations.
"@
Set-Content -Path (Join-Path $StagingDir "README.txt") -Value $ReadmeContent -Encoding Ascii

# 5. Compress into Distribution Zip
Write-Host "[4/5] Packaging into ZIP distribution..." -ForegroundColor Yellow
$ZipTarget = Join-Path $DistDir "CulinaryOS-v$Version-Windows-x64.zip"
Compress-Archive -Path "$StagingDir\*" -DestinationPath $ZipTarget -Force

Write-Host "[5/5] Verification & SHA-256 Checksum..." -ForegroundColor Yellow
$Hash = (Get-FileHash -Path $ZipTarget -Algorithm SHA256).Hash
$SizeMB = [math]::Round((Get-Item $ZipTarget).Length / 1MB, 2)

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  PACKAGE BUILT SUCCESSFULLY!" -ForegroundColor Green
Write-Host "  File: $ZipTarget ($SizeMB MB)" -ForegroundColor Green
Write-Host "  SHA256: $Hash" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
