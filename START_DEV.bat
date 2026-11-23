@echo off
echo ========================================
echo   KIDSCODE Development Server Startup
echo ========================================
echo.
echo This will start BOTH servers:
echo   1. Backend API (Port 3000)
echo   2. Frontend React (Port 3001)
echo.
echo Press Ctrl+C to stop all servers
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] Starting Backend Server...
start "KIDSCODE Backend" cmd /k "cd backend && node server.js"
timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend Server...
start "KIDSCODE Frontend" cmd /k "cd frontend-react && npm start"

echo.
echo ========================================
echo   Servers Starting...
echo ========================================
echo.
echo Backend:  http://localhost:3000 (API only)
echo Frontend: http://localhost:3001 (Open this!)
echo.
echo Wait for both servers to start, then:
echo   1. Browser will auto-open to http://localhost:3001
echo   2. If not, manually open: http://localhost:3001
echo.
echo To stop: Close both terminal windows
echo ========================================
pause
