# ==============================================================================
# CulinaryOS — Turnkey Zero-Tech Windows Installer & Workstation Setup
#
# Fully automated 1-click setup:
# 1. Self-elevates to Administrator for firewall configuration
# 2. Checks/Installs Node.js LTS via winget
# 3. Checks/Installs pnpm package manager
# 4. Configures environment profile (.env)
# 5. Installs all monorepo dependencies
# 6. Builds core calculation engines and UI components
# 7. Configures Windows Firewall for local restaurant network (ports 3000, 5172-5180)
# 8. Creates Desktop and Start Menu shortcuts
# 9. Runs automated diagnostics preflight
# ==============================================================================

[CmdletBinding()]
param (
    [ValidateSet("demo", "clean", "marketing")]
    [string]$Profile = "demo",
    [switch]$NoPrompt,
    [switch]$AutoStart
)

$ErrorActionPreference = "Stop"

function Write-Banner {
    Clear-Host
    Write-Host "========================================================================" -ForegroundColor DarkCyan
    Write-Host "     🍳 CulinaryOS — Turnkey Windows Workstation Installer              " -ForegroundColor Yellow
    Write-Host "     The Sovereign, Open Restaurant Operating System                   " -ForegroundColor Cyan
    Write-Host "========================================================================" -ForegroundColor DarkCyan
    Write-Host ""
}

# 1. Administrator Check & Self-Elevation
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Banner
    Write-Host "⚡ Administrator privileges required for Windows Firewall & system setup." -ForegroundColor Yellow
    Write-Host "⚡ Requesting elevation..." -ForegroundColor Cyan
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`" -Profile `"$Profile`""
    exit
}

Write-Banner

$repoRoot = (Get-Item $PSScriptRoot).Parent.FullName
Set-Location $repoRoot

# 2. Profile Selection (if interactive)
if (-not $NoPrompt) {
    Write-Host "Please choose your installation profile:" -ForegroundColor White
    Write-Host "  [1] 🍽️  Demo Sandbox (Preloaded with 'The Golden Fork' bistro & sample menu)" -ForegroundColor Green
    Write-Host "  [2] 🧼  Clean Production Slate (Blank catalog ready for live restaurant setup)" -ForegroundColor Cyan
    Write-Host "  [3] 🚀  Marketing & Hub Showcase (Public ROI calculator & feature tour)" -ForegroundColor Magenta
    Write-Host ""
    $choice = Read-Host "Enter choice [1-3] (Default: 1)"
    if ($choice -eq "2") { $Profile = "clean" }
    elseif ($choice -eq "3") { $Profile = "marketing" }
    else { $Profile = "demo" }
}

Write-Host "`n[STEP 1/8] Selected profile: " -NoNewline -ForegroundColor White
Write-Host "$Profile" -ForegroundColor Green

# 3. Check / Install Node.js LTS
Write-Host "`n[STEP 2/8] Verifying Node.js runtime..." -ForegroundColor White
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if (-not $nodeCmd) {
    Write-Host "⚡ Node.js not detected. Attempting automated installation via Windows Package Manager (winget)..." -ForegroundColor Yellow
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "✅ Node.js LTS installed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Windows Package Manager (winget) not found. Opening Node.js download page..." -ForegroundColor Red
        Start-Process "https://nodejs.org/"
        Write-Host "Please complete Node.js LTS installation and re-run this script." -ForegroundColor Yellow
        Read-Host "Press Enter to exit..."
        exit 1
    }
} else {
    $nodeVer = node -v
    Write-Host "✅ Node.js detected: $nodeVer" -ForegroundColor Green
}

# 4. Check / Install pnpm
Write-Host "`n[STEP 3/8] Verifying pnpm package manager..." -ForegroundColor White
$pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue

if (-not $pnpmCmd) {
    Write-Host "⚡ Installing pnpm package manager globally via npm..." -ForegroundColor Yellow
    npm install -g pnpm
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Host "✅ pnpm installed successfully!" -ForegroundColor Green
} else {
    $pnpmVer = pnpm -v
    Write-Host "✅ pnpm detected: v$pnpmVer" -ForegroundColor Green
}

# 5. Configure .env file
Write-Host "`n[STEP 4/8] Configuring environment profile..." -ForegroundColor White
$envPath = Join-Path $repoRoot ".env"
$exampleEnvPath = Join-Path $repoRoot ".env.example"

if (-not (Test-Path $envPath)) {
    if (Test-Path $exampleEnvPath) {
        Copy-Item $exampleEnvPath $envPath
    }
}

# Update or append INSTALL_PROFILE in .env
if (Test-Path $envPath) {
    $envLines = Get-Content $envPath | Where-Object { $_ -notmatch "^INSTALL_PROFILE=" }
    $envLines += "INSTALL_PROFILE=$Profile"
    Set-Content -Path $envPath -Value $envLines
    Write-Host "✅ Configured .env with profile '$Profile'" -ForegroundColor Green
}

# 6. Install Monorepo Dependencies
Write-Host "`n[STEP 5/8] Installing monorepo dependencies..." -ForegroundColor White
pnpm install
Write-Host "✅ All dependencies installed." -ForegroundColor Green

# 7. Pre-build Core Calculation & UI Engines
Write-Host "`n[STEP 6/8] Building core engines and shared packages..." -ForegroundColor White
pnpm --filter @culinaryos/ratio-engine build
pnpm --filter @culinaryos/shared build
pnpm --filter @culinaryos/ui build
Write-Host "✅ Core calculation engines compiled." -ForegroundColor Green

# 8. Configure Windows Firewall
Write-Host "`n[STEP 7/8] Configuring Windows Firewall for LAN access..." -ForegroundColor White
$ruleName = "CulinaryOS Local Restaurant Network"
$ports = @("3000", "5172", "5173", "5174", "5175", "5176", "5177", "5180", "5188")

try {
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $ruleName `
                        -Direction Inbound `
                        -Action Allow `
                        -Protocol TCP `
                        -LocalPort $ports `
                        -Profile Domain, Private `
                        -Description "Allows incoming LAN connections for CulinaryOS restaurant devices (POS, KDS, Admin, Storefront, API, Workstation, Supervisor)" | Out-Null
    Write-Host "✅ Firewall rule created for ports 3000, 5172-5180, 5188 (Domain & Private)." -ForegroundColor Green
} catch {
    Write-Host "⚠️ Warning: Could not configure firewall automatically: $_" -ForegroundColor Yellow
}

# 9. Create Desktop and Start Menu Shortcuts
Write-Host "`n[STEP 8/8] Creating Desktop & Start Menu shortcuts..." -ForegroundColor White
$desktopPath = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktopPath "CulinaryOS.lnk"
$targetScript = Join-Path $repoRoot "scripts\launch-with-update.bat"

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut($shortcutPath)
    $Shortcut.TargetPath = $targetScript
    $Shortcut.WorkingDirectory = $repoRoot
    $Shortcut.Description = "CulinaryOS - Turnkey Restaurant Operating System Workstation"
    $Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
    $Shortcut.Save()
    Write-Host "✅ Desktop shortcut 'CulinaryOS' created on your Desktop." -ForegroundColor Green

    # Start Menu
    $startMenuPrograms = [Environment]::GetFolderPath('Programs')
    if (Test-Path $startMenuPrograms) {
        $smShortcutPath = Join-Path $startMenuPrograms "CulinaryOS.lnk"
        $smShortcut = $WshShell.CreateShortcut($smShortcutPath)
        $smShortcut.TargetPath = $targetScript
        $smShortcut.WorkingDirectory = $repoRoot
        $smShortcut.Description = "CulinaryOS - Restaurant Workstation"
        $smShortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,14"
        $smShortcut.Save()
        Write-Host "✅ Start Menu shortcut created." -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Warning: Could not create desktop shortcuts: $_" -ForegroundColor Yellow
}

# 10. Run Diagnostics Preflight
Write-Host "`n========================================================================" -ForegroundColor DarkCyan
Write-Host "🩺 Running Automated Diagnostics Preflight..." -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor DarkCyan
pnpm doctor

Write-Host "`n========================================================================" -ForegroundColor DarkCyan
Write-Host "  🎉 CULINARYOS INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "  Double-click 'CulinaryOS' on your Desktop at any time to launch." -ForegroundColor White
Write-Host "========================================================================`n" -ForegroundColor DarkCyan

if ($AutoStart -or (-not $NoPrompt)) {
    $startChoice = Read-Host "Would you like to start CulinaryOS right now? (Y/N, Default: Y)"
    if ($startChoice -eq "" -or $startChoice -match "^[Yy]") {
        & "$targetScript" --profile=$Profile
    }
}
