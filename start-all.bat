@echo off
setlocal

set "ROOT=%~dp0"

echo Starting OpenTask local stack...
echo Root: %ROOT%

start "OpenTask - Hardhat Node" cmd /k "cd /d ""%ROOT%"" && npx hardhat node --hostname 0.0.0.0"

echo Waiting for Hardhat node to initialize...
timeout /t 6 /nobreak >nul

start "OpenTask - Deploy Contracts" cmd /k "cd /d ""%ROOT%"" && npx hardhat run .\scripts\deploy.js --network localhost"

echo Waiting for deployment to finish...
timeout /t 8 /nobreak >nul

start "OpenTask - IPFS Upload API" cmd /k "cd /d ""%ROOT%"" && npm run ipfs:server"

start "OpenTask - Dispute Watcher" cmd /k "cd /d ""%ROOT%"" && npm run watcher"

start "OpenTask - Frontend" cmd /k "cd /d ""%ROOT%frontend"" && npm run dev -- --host 0.0.0.0"

echo.
echo Started:
echo   Hardhat node:      http://127.0.0.1:8545
echo   IPFS upload API:   http://localhost:8787/api/health
echo   Dispute watcher:   auto progress expired dispute rounds
echo   Frontend:          http://localhost:5173
echo.
echo Use stop-all.bat to stop ports 8545, 5173, and 8787.

endlocal
