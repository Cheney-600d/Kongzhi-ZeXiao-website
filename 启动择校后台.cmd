@echo off
setlocal
set "SITE_ROOT=%~dp0"
set "SITE_PYTHONW=D:\workspace\conda_envs\llm-zhuo\pythonw.exe"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ready=$false; try{$response=Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 'http://127.0.0.1:8767/api/exam-resources'; $ready=($response.StatusCode -eq 200)}catch{}; if(-not $ready){Start-Process -FilePath '%SITE_PYTHONW%' -ArgumentList @('serve.py','8767') -WorkingDirectory '%SITE_ROOT%' -WindowStyle Hidden; Start-Sleep -Milliseconds 900}"
start "" "http://127.0.0.1:8767/数据库/admin.html"

endlocal
