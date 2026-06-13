@echo off
setlocal

echo Stopping OpenTask local stack...

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ports = 8545,5173,8787; $connections = Get-NetTCPConnection -LocalPort $ports -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' -and $_.OwningProcess -ne 0 }; $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique; if (-not $processIds) { Write-Output 'No listening project processes found.'; exit 0 }; foreach ($processId in $processIds) { try { Stop-Process -Id $processId -Force -ErrorAction Stop; Write-Output ('Stopped PID ' + $processId) } catch { Write-Output ('Could not stop PID ' + $processId + ': ' + $_.Exception.Message) } }"

echo Done.
endlocal
