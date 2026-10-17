@echo off
REM Start the CulinaryOS Intelligence API + GUI dashboard.
REM Opens http://127.0.0.1:3100 in your browser. No install needed (Node 20+).
set PORT=3100
start "" "http://127.0.0.1:3100"
node "%~dp0src\cli.ts" serve --port 3100
pause
