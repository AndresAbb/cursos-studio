@echo off
setlocal
title CursosStudio - MongoDB auth setup
cd /d "%~dp0"

:: =============================================================================
:: Creates the MongoDB users the app needs, using the credentials from .env
:: (MONGO_USER / MONGO_PASS, and optionally MONGO_ADMIN_USER / MONGO_ADMIN_PASS).
:: Run this ONCE while MongoDB still has auth disabled. It prints the exact
:: steps to turn authorization on afterwards.
:: =============================================================================

echo ==================================================
echo   CursosStudio - MongoDB auth setup
echo ==================================================
echo.

if not exist "node_modules" (
  echo [..] Instalando dependencias (npm install)...
  call npm install
)

node server\setupAuth.js
set "RC=%errorlevel%"

echo.
if not "%RC%"=="0" (
  echo [ERROR] La configuracion fallo. Revisa el mensaje de arriba.
)
pause
endlocal
