@echo off
:: This script builds and starts the POS, KDS, and Inventory MCP servers.
set "PATH=C:\Users\User\node_portable\node-v20.11.0-win-x64;%PATH%"
echo Building MCP TypeScript sources...
cd mcp
call npm run build
if %ERRORLEVEL% neq 0 (
    echo TypeScript build failed!
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo Starting POS, KDS, and Inventory MCP servers in separate terminals...
start "CulinaryOS POS Server" cmd /k "node dist/pos-server.js"
start "CulinaryOS KDS Server" cmd /k "node dist/kds-server.js"
start "CulinaryOS Inventory Server" cmd /k "node dist/inventory-server.js"
