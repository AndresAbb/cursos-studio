@echo off
setlocal
title CursosStudio (sin Docker)
cd /d "%~dp0"

:: =============================================================================
:: CursosStudio - arranque SIN Docker
:: Usa el MongoDB nativo de Windows (servicio "MongoDB") en el puerto 27017,
:: que apunta a la MISMA base de datos: cursos_studio.
:: Conexion: mongodb://localhost:27017/cursos_studio
:: =============================================================================

set "MONGO_SERVICE=MongoDB"
set "MONGOD_EXE=C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
set "MONGOD_CFG=C:\Program Files\MongoDB\Server\8.3\bin\mongod.cfg"

echo ==================================================
echo   CursosStudio - arranque sin Docker
echo   DB: mongodb://localhost:27017/cursos_studio
echo ==================================================
echo.

:: 1) Ya hay algo escuchando en 27017? (servicio nativo ya en marcha)
netstat -ano | findstr ":27017" | findstr "LISTENING" >nul
if %errorlevel%==0 (
  echo [OK] MongoDB ya esta escuchando en el puerto 27017.
  goto runapp
)

:: 2) Intentar arrancar el servicio nativo de Windows
echo [..] Iniciando el servicio %MONGO_SERVICE%...
net start "%MONGO_SERVICE%" >nul 2>&1
if %errorlevel%==0 (
  echo [OK] Servicio %MONGO_SERVICE% iniciado.
  goto runapp
)

:: 3) Fallback: lanzar mongod.exe directamente con su misma configuracion
echo [..] No se pudo usar el servicio. Lanzando mongod.exe directamente...
if not exist "%MONGOD_EXE%" (
  echo [ERROR] No se encontro mongod.exe en:
  echo         "%MONGOD_EXE%"
  echo         Instala MongoDB Server o corrige la ruta MONGOD_EXE en este .bat.
  pause
  exit /b 1
)
start "MongoDB" /min "%MONGOD_EXE%" --config "%MONGOD_CFG%"

:: Esperar a que el puerto 27017 acepte conexiones (hasta ~30s)
setlocal enabledelayedexpansion
set /a tries=0
:waitloop
netstat -ano | findstr ":27017" | findstr "LISTENING" >nul && goto mongoup
set /a tries+=1
if !tries! geq 30 (
  echo [ERROR] MongoDB no respondio en el puerto 27017.
  pause
  exit /b 1
)
ping -n 2 127.0.0.1 >nul
goto waitloop
:mongoup
endlocal
echo [OK] mongod.exe en marcha.

:runapp
:: Dependencias de Node (solo la primera vez)
if not exist "node_modules" (
  echo [..] Instalando dependencias con npm install...
  call npm install
)

echo [..] Abriendo navegador y arrancando el servidor...
start "" http://localhost:3000
call npm start

endlocal
