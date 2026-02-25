# How to Start the PDF Generator Application

This guide explains how to start all components of the PDF Generator application: Frontend, Backend Server, and Telegram Service.

## Prerequisites

Before starting, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **Python** (3.7 or higher)
- **npm** or **yarn** package manager

## Component Overview

The application consists of 4 main components:

1. **Frontend** (Next.js) - Port 3000
2. **Backend API** (Express/TypeScript) - Port 3002
3. **Telegram Server** (Node.js) - Port 3003
4. **Telegram Bot** (Python) - Polling service

## Quick Start (Automated)

**Windows Users:** You can use the provided scripts to start all services automatically:

- **PowerShell:** Double-click `start-all.ps1` or run `.\start-all.ps1` in PowerShell
- **Batch File:** Double-click `start-all.bat` or run `start-all.bat` in Command Prompt

These scripts will:
- Check for required dependencies (Node.js, Python)
- Install missing npm and pip packages
- Start all 4 services in separate terminal windows

## Step-by-Step Startup Instructions

### Step 1: Install Dependencies

#### Frontend Dependencies
```bash
# From the root directory
npm install
```

#### Backend Dependencies
```bash
# Navigate to backend directory
cd backend
npm install
cd ..
```

#### Python Dependencies (for Telegram Bot)
```bash
# From the backend directory
cd backend
pip install -r requirements.txt
cd ..
```

### Step 2: Start the Backend Server

The backend server must be started first as other services depend on it.

```bash
# Navigate to backend directory
cd backend

# For development (with hot reload)
npm run dev

# OR for production (after building)
npm run build
npm start
```

**Expected Output:**
```
Uploads directory ready at: ...
Database initialized
Database migrations completed
Server running on port 3002
Frontend URL: ...
```

The backend server will be available at: `http://localhost:3002`

### Step 3: Start the Telegram Server

Open a **new terminal window** and run:

```bash
# Navigate to backend directory
cd backend

# Start the Telegram server
node telegram-server.js
```

**Expected Output:**
```
Telegram server listening at http://localhost:3003
```

The Telegram server will be available at: `http://localhost:3003`

### Step 4: Start the Telegram Bot

Open a **new terminal window** and run:

```bash
# Navigate to backend directory
cd backend

# Start the Telegram bot
python telegram_bot.py
```

**Expected Output:**
```
Starting Telegram bot polling...
API URL: http://localhost:3002/api
Frontend URL: http://localhost:3000
User preferences loaded successfully
```

The bot will start polling for messages from Telegram.

### Step 5: Start the Frontend

Open a **new terminal window** and run:

```bash
# From the root directory
npm run dev
```

**Expected Output:**
```
  ▲ Next.js 15.0.3
  - Local:        http://localhost:3000
  - ready in X.Xs
```

The frontend will be available at: `http://localhost:3000`

## Quick Start (All Services)

If you want to start all services at once, you can use separate terminal windows:

### Terminal 1 - Backend Server
```bash
cd backend
npm run dev
```

### Terminal 2 - Telegram Server
```bash
cd backend
node telegram-server.js
```

### Terminal 3 - Telegram Bot
```bash
cd backend
python telegram_bot.py
```

### Terminal 4 - Frontend
```bash
npm run dev
```

## Port Summary

| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend API | 3002 | http://localhost:3002 |
| Telegram Server | 3003 | http://localhost:3003 |
| Telegram Bot | - | Polling service |

## Verification

After starting all services, verify they're running:

1. **Frontend**: Open http://localhost:3000 in your browser
2. **Backend API**: Check http://localhost:3002/api/health (if available)
3. **Telegram Bot**: Send `/start` to your Telegram bot to test

## Troubleshooting

### Port Already in Use
If you see "Port X is already in use" error:
- Check if another instance is running: `netstat -ano | findstr :PORT` (Windows)
- Kill the process using that port or change the port in the configuration

### Backend Dependencies Not Installed
```bash
cd backend
npm install
```

### Python Dependencies Not Installed
```bash
cd backend
pip install -r requirements.txt
```

### Database Issues
The backend will automatically create and migrate the database on first startup. If you encounter database errors:
- Delete `backend/data.db` and `backend/database.sqlite` (if they exist)
- Restart the backend server to recreate the database

### Telegram Bot Not Responding
- Ensure the backend server (port 3002) is running
- Check that the `BOT_TOKEN` in `backend/telegram_bot.py` is valid
- Verify the Telegram server (port 3003) is running

## Environment Variables (Optional)

The application uses default values, but you can customize them:

### Backend (.env file in backend directory)
```
PORT=3002
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local file in root directory)
```
NEXT_PUBLIC_API_URL=http://localhost:3002/api
```

## Notes

- The **Backend Server** must be started before the Telegram Bot
- The **Telegram Server** must be started before the Telegram Bot
- All services can run simultaneously in separate terminal windows
- The Telegram Bot uses long polling, so it will continuously check for new messages

