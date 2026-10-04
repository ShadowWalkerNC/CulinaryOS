@echo off
REM Double-click installer: copies this extension into the CulinaryOS checkout.
powershell -ExecutionPolicy Bypass -File "%~dp0install-to-culinaryos.ps1" %*
pause
