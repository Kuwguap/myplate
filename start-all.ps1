# PowerShell script to start all PDF Generator services
# This script opens separate terminal windows for each service

Write-Host "Starting PDF Generator Application..." -ForegroundColor Green
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if Python is installed
$pythonCommand = $null
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
    $pythonCommand = "python"
} catch {
    try {
        $pythonVersion = py --version 2>&1
        Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
        $pythonCommand = "py"
    } catch {
        try {
            $pythonVersion = python3 --version 2>&1
            Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
            $pythonCommand = "python3"
        } catch {
            Write-Host "[ERROR] Python is not installed or not in PATH" -ForegroundColor Red
            Write-Host "Please install Python from https://www.python.org/" -ForegroundColor Yellow
            Write-Host "Make sure to check 'Add Python to PATH' during installation." -ForegroundColor Yellow
            exit 1
        }
    }
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow

# Install frontend dependencies
Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
Set-Location $scriptDir
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "Frontend dependencies already installed" -ForegroundColor Gray
}

# Install backend dependencies
Write-Host "Installing backend dependencies..." -ForegroundColor Cyan
Set-Location $backendDir
if (-not (Test-Path "node_modules")) {
    npm install
} else {
    Write-Host "Backend dependencies already installed" -ForegroundColor Gray
}

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Cyan
if (Test-Path "requirements.txt") {
    $pipCommand = $null
    
    # Try different ways to call pip on Windows
    # First try standalone pip
    try {
        $null = Get-Command pip -ErrorAction Stop
        $pipCommand = "pip"
    } catch {
        # If pip not found, use the detected Python command with -m pip
        if ($pythonCommand) {
            $pipCommand = "$pythonCommand -m pip"
        } else {
            # Fallback: try common Python commands
            try {
                $null = Get-Command python -ErrorAction Stop
                $pipCommand = "python -m pip"
            } catch {
                try {
                    $null = Get-Command py -ErrorAction Stop
                    $pipCommand = "py -m pip"
                } catch {
                    Write-Host "[WARNING] Could not find pip. Skipping Python dependencies." -ForegroundColor Yellow
                    Write-Host "You may need to install Python dependencies manually:" -ForegroundColor Yellow
                    Write-Host "  pip install -r requirements.txt" -ForegroundColor Gray
                    Write-Host "  OR: python -m pip install -r requirements.txt" -ForegroundColor Gray
                    Write-Host "  OR: py -m pip install -r requirements.txt" -ForegroundColor Gray
                    $pipCommand = $null
                }
            }
        }
    }
    
    if ($pipCommand) {
        try {
            Invoke-Expression "$pipCommand install -r requirements.txt --quiet"
            Write-Host "Python dependencies installed" -ForegroundColor Gray
        } catch {
            Write-Host "[WARNING] Failed to install Python dependencies automatically." -ForegroundColor Yellow
            Write-Host "Please install manually: $pipCommand install -r requirements.txt" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Starting services in separate windows..." -ForegroundColor Yellow
Write-Host ""

# Start Backend Server (Terminal 1)
Write-Host "Starting Backend Server (Port 3002)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendDir'; Write-Host 'Backend Server - Port 3002' -ForegroundColor Green; Write-Host ''; npm run dev"

# Wait a bit for backend to initialize (backend also serves /api/telegram - no separate Telegram Server)
Start-Sleep -Seconds 3

# Start Telegram Bot (Terminal 2) - uses main backend at 3002 for webhook + API
Write-Host "Starting Telegram Bot..." -ForegroundColor Cyan
if (-not $pythonCommand) { $pythonCommand = "python" }
$apiUrl = "http://localhost:3002/api"
$telegramBotCommand = "cd '$backendDir'; `$env:API_URL='$apiUrl'; `$env:TELEGRAM_SERVER_URL='$apiUrl'; Write-Host 'Telegram Bot (backend at $apiUrl)' -ForegroundColor Green; Write-Host ''; $pythonCommand telegram_bot.py"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $telegramBotCommand

# Wait a bit
Start-Sleep -Seconds 2

# Start Frontend (Terminal 3)
Write-Host "Starting Frontend (Port 3000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$scriptDir'; Write-Host 'Frontend - Port 3000' -ForegroundColor Green; Write-Host ''; npm run dev"

Write-Host ""
Write-Host "[SUCCESS] All 3 services are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Services:" -ForegroundColor Yellow
Write-Host "  - Backend API:    http://localhost:3002 (includes /api/telegram)" -ForegroundColor White
Write-Host "  - Telegram Bot:   Running (polling, uses backend 3002)" -ForegroundColor White
Write-Host "  - Frontend:       http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Note: Wait a few seconds for all services to initialize." -ForegroundColor Gray
Write-Host "Then open http://localhost:3000 in your browser." -ForegroundColor Gray
Write-Host ""
Write-Host "To stop all services, close the PowerShell windows." -ForegroundColor Yellow

