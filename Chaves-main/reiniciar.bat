@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Controle de Crachas - Reiniciar

echo.
echo  Parando servidores antigos (portas 3000-3010)...

for %%port in (3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%port" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
  )
)

echo  Iniciando servidor atualizado...
echo.
node server.js
pause
