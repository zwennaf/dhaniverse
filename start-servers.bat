@echo off
echo Starting Dhaniverse Servers...
echo.

echo Starting Game Server on port 8000...
start "Game Server" cmd /k "cd /d %~dp0 && npm run server:game"

echo Starting WebSocket Server on port 8001...
start "WebSocket Server" cmd /k "cd /d %~dp0 && npm run server:ws"

echo.
echo Both servers are starting in separate windows...
echo - Game Server: http://localhost:8000
echo - WebSocket Server: http://localhost:8001
echo.
echo Press any key to exit this script (servers will continue running)
pause >nul