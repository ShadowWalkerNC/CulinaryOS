@echo off
:: This script runs the Web ERP development server using the portable Node/NPM installation.
set "PATH=C:\Users\User\node_portable\node-v20.11.0-win-x64;%PATH%"
echo Starting KitchenFlow Web ERP Dev Server...
cd web
npm run dev
