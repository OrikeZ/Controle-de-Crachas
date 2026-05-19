@echo off
chcp 65001 >nul
echo.
echo  Encerrando servidores nas portas 3000 a 3010...
echo.

for %%port in (3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010) do (
  for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%%port" ^| findstr "LISTENING"') do (
    echo  Porta %%port — encerrando PID %%p
    taskkill /F /PID %%p >nul 2>&1
  )
)

echo.
echo  Pronto. Execute iniciar.bat para subir o servidor com o codigo atualizado.
echo.
pause
