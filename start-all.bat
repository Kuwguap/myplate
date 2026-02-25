@echo off
REM Batch script to start all PDF Generator services
REM This script opens separate terminal windows for each service

echo Starting PDF Generator Application...
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
set BACKEND_DIR=%SCRIPT_DIR%backend

REM Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo Please install Python from https://www.python.org/
    pause
    exit /b 1
)

echo Installing dependencies...
echo.

REM Install frontend dependencies
echo Installing frontend dependencies...
cd /d "%SCRIPT_DIR%"
if not exist "node_modules" (
    call npm install
) else (
    echo Frontend dependencies already installed
)

REM Install backend dependencies
echo Installing backend dependencies...
cd /d "%BACKEND_DIR%"
if not exist "node_modules" (
    call npm install
) else (
    echo Backend dependencies already installed
)

REM Install Python dependencies
echo Installing Python dependencies...
if exist "requirements.txt" (
    pip install -r requirements.txt --quiet
    echo Python dependencies installed
)

echo.
echo Starting services in separate windows...
echo.

REM Start Backend Server
echo Starting Backend Server (Port 3002)...
start "Backend Server - Port 3002" cmd /k "cd /d %BACKEND_DIR% && echo Backend Server - Port 3002 && echo. && npm run dev"

REM Wait a bit for backend to initialize
timeout /t 3 /nobreak >nul

REM Start Telegram Server
echo Starting Telegram Server (Port 3003)...
start "Telegram Server - Port 3003" cmd /k "cd /d %BACKEND_DIR% && echo Telegram Server - Port 3003 && echo. && node telegram-server.js"

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Start Telegram Bot
echo Starting Telegram Bot...
start "Telegram Bot" cmd /k "cd /d %BACKEND_DIR% && echo Telegram Bot && echo. && python telegram_bot.py"

REM Wait a bit
timeout /t 2 /nobreak >nul

REM Start Frontend
echo Starting Frontend (Port 3000)...
start "Frontend - Port 3000" cmd /k "cd /d %SCRIPT_DIR% && echo Frontend - Port 3000 && echo. && npm run dev"

echo.
echo [SUCCESS] All services are starting in separate windows!
echo.
echo Services:
echo   - Backend API:    http://localhost:3002
echo   - Telegram Server: http://localhost:3003
echo   - Frontend:       http://localhost:3000
echo   - Telegram Bot:   Running (polling)
echo.
echo Note: Wait a few seconds for all services to initialize.
echo Then open http://localhost:3000 in your browser.
echo.
echo To stop all services, close the command prompt windows.
echo.
pause


