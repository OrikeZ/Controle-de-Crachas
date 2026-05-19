@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Controle de Crachas

echo.
echo  Iniciando servidor local...
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo  ERRO: Node.js nao encontrado.
  echo  Instale em https://nodejs.org e tente de novo.
  echo.
  pause
  exit /b 1
)

node server.js
echo.
pause
