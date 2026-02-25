#!/bin/bash

###############################################################################
# Production Startup Script for PDF Generator
# This script sets up and starts all services on a Linux droplet
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PDF Generator Production Startup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as root (not recommended, but check anyway)
if [ "$EUID" -eq 0 ]; then 
   echo -e "${YELLOW}Warning: Running as root. Consider using a non-root user.${NC}"
fi

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

# Check Node.js
if ! command_exists node; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    echo "Install Node.js: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check npm
if ! command_exists npm; then
    echo -e "${RED}ERROR: npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: $NPM_VERSION${NC}"

# Check Python
if ! command_exists python3; then
    echo -e "${RED}ERROR: Python 3 is not installed${NC}"
    echo "Install Python: sudo apt-get update && sudo apt-get install -y python3 python3-pip"
    exit 1
fi
PYTHON_VERSION=$(python3 --version)
echo -e "${GREEN}✓ Python found: $PYTHON_VERSION${NC}"

# Check PM2
if ! command_exists pm2; then
    echo -e "${YELLOW}PM2 not found. Installing PM2 globally...${NC}"
    sudo npm install -g pm2
    echo -e "${GREEN}✓ PM2 installed${NC}"
else
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}✓ PM2 found: $PM2_VERSION${NC}"
fi

echo ""

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"

# Frontend dependencies
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
if [ ! -d "node_modules" ]; then
    npm install --production=false
    echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi

# Backend dependencies
echo -e "${YELLOW}Installing backend dependencies...${NC}"
cd backend
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✓ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi

# Build backend
echo -e "${YELLOW}Building backend...${NC}"
npm run build
echo -e "${GREEN}✓ Backend built${NC}"

# Python dependencies
echo -e "${YELLOW}Installing Python dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    python3 -m pip install -r requirements.txt --quiet --user
    echo -e "${GREEN}✓ Python dependencies installed${NC}"
fi

cd "$SCRIPT_DIR"

# Build frontend
echo -e "${YELLOW}Building frontend...${NC}"
npm run build
echo -e "${GREEN}✓ Frontend built${NC}"

echo ""

# Create necessary directories
echo -e "${BLUE}Creating necessary directories...${NC}"
mkdir -p logs
mkdir -p backend/temp
mkdir -p backend/uploads/templates
mkdir -p uploads/templates
echo -e "${GREEN}✓ Directories created${NC}"

# Make scripts executable
echo -e "${BLUE}Setting up scripts...${NC}"
chmod +x backend/start-telegram-bot.sh
chmod +x stop-production.sh
echo -e "${GREEN}✓ Scripts configured${NC}"

echo ""

# Check if services are already running
echo -e "${BLUE}Checking for existing services...${NC}"
if pm2 list | grep -q "pdf-generator"; then
    echo -e "${YELLOW}Existing services found. Stopping them...${NC}"
    pm2 delete all
    sleep 2
fi

# Start all services with PM2
echo -e "${BLUE}Starting all services with PM2...${NC}"
pm2 start ecosystem.config.js
echo -e "${GREEN}✓ All services started${NC}"

# Save PM2 configuration
pm2 save
echo -e "${GREEN}✓ PM2 configuration saved${NC}"

# Setup PM2 startup script (optional - requires sudo)
echo ""
echo -e "${BLUE}Setting up PM2 startup script...${NC}"
echo -e "${YELLOW}This will enable services to start on system reboot.${NC}"
read -p "Do you want to set up PM2 startup script? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    pm2 startup
    echo -e "${GREEN}✓ PM2 startup script configured${NC}"
    echo -e "${YELLOW}Please run the command shown above as root/sudo${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}All services are now running!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Service Status:${NC}"
pm2 status
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo -e "  ${YELLOW}pm2 status${NC}              - Check service status"
echo -e "  ${YELLOW}pm2 logs${NC}               - View all logs"
echo -e "  ${YELLOW}pm2 logs pdf-generator-backend${NC} - View backend logs"
echo -e "  ${YELLOW}pm2 logs pdf-generator-telegram-bot${NC} - View bot logs"
echo -e "  ${YELLOW}pm2 restart all${NC}        - Restart all services"
echo -e "  ${YELLOW}pm2 stop all${NC}           - Stop all services"
echo -e "  ${YELLOW}pm2 delete all${NC}         - Stop and remove all services"
echo -e "  ${YELLOW}pm2 monit${NC}              - Monitor services"
echo ""
echo -e "${BLUE}Services are running on:${NC}"
echo -e "  ${GREEN}Backend API:${NC}    http://localhost:3002"
echo -e "  ${GREEN}Telegram Server:${NC} http://localhost:3003"
echo -e "  ${GREEN}Frontend:${NC}        http://localhost:3000"
echo -e "  ${GREEN}Telegram Bot:${NC}    Running (polling)"
echo ""
echo -e "${YELLOW}Note:${NC} Make sure to configure your firewall to allow these ports if needed."
echo -e "${YELLOW}Note:${NC} For production, consider using a reverse proxy (nginx) for the frontend."
echo ""

