#!/bin/bash

###############################################################################
# Production Stop Script for PDF Generator
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Stopping all PDF Generator services...${NC}"

if command -v pm2 >/dev/null 2>&1; then
    if pm2 list | grep -q "pdf-generator"; then
        pm2 stop all
        pm2 delete all
        echo -e "${GREEN}✓ All services stopped${NC}"
    else
        echo -e "${YELLOW}No services running${NC}"
    fi
else
    echo -e "${RED}PM2 is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Done!${NC}"


