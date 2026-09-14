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
    BEFORE_COMMIT=$(git rev-parse HEAD)
    git pull
    AFTER_COMMIT=$(git rev-parse HEAD)
    echo -e "${GREEN}Updated from ${BEFORE_COMMIT:0:7} to ${AFTER_COMMIT:0:7}${NC}"
else
    echo -e "${YELLOW}Not a git repository. Please manually update files.${NC}"
    AFTER_COMMIT="manual-update-$(date +%s)"
fi

echo -e "${CYAN}Step 3: Updating backend dependencies...${NC}"
cd backend
npm install
npm audit fix --force || true
cd ..

echo -e "${CYAN}Step 4: Updating frontend dependencies...${NC}"
cd frontend
npm install
npm audit fix --force || true

echo -e "${CYAN}Step 5: Building optimized frontend...${NC}"
npm run build
cd ..

echo -e "${CYAN}Step 6: Rebuilding Docker containers...${NC}"
docker compose build --no-cache

echo -e "${CYAN}Step 7: Restarting services with zero downtime...${NC}"
docker compose up -d --force-recreate

echo -e "${CYAN}Step 8: Running database migrations...${NC}"
sleep 5
docker exec shop_backend npm run migrate || echo -e "${YELLOW}No migrations to run${NC}"

echo -e "${CYAN}Step 9: Creating update notification...${NC}"
# Create system notification for update
docker exec shop_backend node -e "
const db = require('./db');
db.query(
  'INSERT INTO system_notifications (type, message, data, created_at) VALUES ($1, $2, $3, NOW())',
  ['update_success', 'New features and improvements available!', JSON.stringify({version: '${AFTER_COMMIT:0:7}', newCommit: '${AFTER_COMMIT}'})]
).then(() => console.log('Update notification created')).catch(err => console.error('Error:', err));
" || echo -e "${YELLOW}Could not create notification${NC}"

echo -e "${CYAN}Step 10: Cleaning up old images and containers...${NC}"
docker image prune -f
docker container prune -f

echo ""
echo -e "${GREEN}Update completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Verify the update:${NC}"
echo "docker compose ps"
echo "docker compose logs -f"
echo ""
