@echo off
chcp 65001 >nul
echo.
echo  Encerrando servidor na porta 3000 (se estiver rodando)...
echo.

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo  Encerrando processo PID %%p
  taskkill /F /PID %%p >nul 2>&1
)

echo  Pronto. Agora pode rodar iniciar.bat ou node server.js
echo.
pause
