# ============================================================
# CulinaryOS — PowerShell Firewall Configuration for LAN
# ============================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     🛡️ Configuring Firewall for CulinaryOS LAN Access     " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan

$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚡ Requesting Administrator elevation..." -ForegroundColor Yellow
    Start-Process powershell -Verb RunAs -ArgumentList "-ExecutionPolicy Bypass -File `"$PSCommandPath`""
    exit
}

$ruleName = "CulinaryOS Local Restaurant Network"
$ports = @("3000", "5172", "5173", "5174", "5175", "5176", "5177", "5180")

try {
    Remove-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
    New-NetFirewallRule -DisplayName $ruleName `
                        -Direction Inbound `
                        -Action Allow `
                        -Protocol TCP `
                        -LocalPort $ports `
                        -Profile Domain, Private `
                        -Description "Allows incoming LAN connections for CulinaryOS restaurant devices (POS, KDS, Admin, Storefront, API)" | Out-Null
    Write-Host "✅ Firewall rule created successfully!" -ForegroundColor Green
    Write-Host "📱 Other devices on your local Wi-Fi can now connect freely to CulinaryOS." -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to create firewall rule: $_" -ForegroundColor Red
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
