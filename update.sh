#!/bin/bash

# CloudMC Shop - Update Script for Linux
# Updates the application with zero downtime

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================"
echo "CloudMC Shop - Update"
echo -e "======================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

cd /opt/cloudmc-shop

echo -e "${CYAN}Step 1: Creating backup...${NC}"
./backup.sh

echo -e "${CYAN}Step 2: Pulling latest changes...${NC}"
if [ -d ".git" ]; then
    git pull
else
    echo -e "${YELLOW}Not a git repository. Please manually update files.${NC}"
fi

echo -e "${CYAN}Step 3: Rebuilding containers...${NC}"
docker compose build --no-cache

echo -e "${CYAN}Step 4: Restarting services...${NC}"
docker compose up -d

echo -e "${CYAN}Step 5: Running migrations...${NC}"
sleep 5
docker exec shop_backend npm run migrate

echo -e "${CYAN}Step 6: Cleaning up old images...${NC}"
docker image prune -f

echo ""
echo -e "${GREEN}Update completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Verify the update:${NC}"
echo "docker compose ps"
echo "docker compose logs -f"
echo ""
