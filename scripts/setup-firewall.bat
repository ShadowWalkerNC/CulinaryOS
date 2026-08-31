@echo off
setlocal enabledelayedexpansion

title CulinaryOS — Windows Firewall Port Configuration

echo ========================================================================
echo        CulinaryOS — Windows Defender Firewall Setup for LAN Access
echo ========================================================================
echo.
echo This utility opens incoming ports for CulinaryOS on your local network:
echo   - 3000 (Unified Hono API Server)
echo   - 5172 (POS Terminal)
echo   - 5173 (Kitchen Display KDS)
echo   - 5174 (Back-Office Admin)
echo   - 5175 (KitchenKit & Recipes)
echo   - 5176 (Guest Online Storefront)
echo   - 5177 (CulinaryOps & Costing)
echo   - 5180 (Desktop Workstation)
echo.

:: Check for Administrator permissions
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Administrator permissions required to configure Windows Firewall.
    echo Requesting elevation...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs"
    exit /b
)

echo [INFO] Configuring inbound firewall rule 'CulinaryOS Local Restaurant Network'...
netsh advfirewall firewall delete rule name="CulinaryOS Local Restaurant Network" >nul 2>&1
netsh advfirewall firewall add rule name="CulinaryOS Local Restaurant Network" dir=in action=allow protocol=TCP localport=3000,5172,5173,5174,5175,5176,5177,5180 profile=private,domain

if %errorlevel% equ 0 (
    echo.
    echo ========================================================================
    echo [SUCCESS] Windows Firewall successfully configured for CulinaryOS!
    echo Tablets, iPads, phones, and TVs on your Wi-Fi can now connect.
    echo ========================================================================
) else (
    echo.
    echo [WARNING] Firewall rule creation returned code %errorlevel%.
)

echo.
pause
