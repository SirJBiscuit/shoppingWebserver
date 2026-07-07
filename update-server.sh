#!/bin/bash

# CloudMC Shop - Server Update Script
# This script pulls the latest code and rebuilds the application

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  CloudMC Shop - Update Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Navigate to project directory
cd /opt/cloudmc-shop

# Stash any local changes
echo -e "${YELLOW}Stashing local changes...${NC}"
git stash

# Pull latest code
echo -e "${YELLOW}Pulling latest code from GitHub...${NC}"
git pull origin main

# If pull fails, force reset
if [ $? -ne 0 ]; then
    echo -e "${RED}Pull failed, forcing reset to origin/main...${NC}"
    git fetch origin
    git reset --hard origin/main
fi

# Copy production config
echo -e "${YELLOW}Setting up production configuration...${NC}"
cp docker-compose.prod.yml docker-compose.yml

# Stop containers
echo -e "${YELLOW}Stopping containers...${NC}"
docker compose down

# Rebuild and start
echo -e "${YELLOW}Building and starting containers...${NC}"
docker compose up -d --build

# Wait for containers to be ready
echo -e "${YELLOW}Waiting for containers to start...${NC}"
sleep 10

# Auto-run new migrations if they exist
echo ""
echo -e "${YELLOW}Checking for new database migrations...${NC}"
for migration in backend/src/database/schema-v*.sql; do
    if [ -f "$migration" ]; then
        version=$(basename "$migration" .sql | sed 's/schema-v//')
        echo -e "${CYAN}Found migration: v${version}${NC}"
        
        # Check if migration script exists
        if [ -f "backend/src/database/migrate-v${version}.js" ]; then
            echo -e "${YELLOW}Running migration v${version}...${NC}"
            docker exec shop_backend npm run migrate-v${version} || echo -e "${RED}Migration v${version} failed or already applied${NC}"
        fi
    fi
done

# Check status
echo ""
echo -e "${GREEN}Checking container status...${NC}"
docker compose ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Access your app at:${NC}"
echo -e "  - Frontend: http://localhost:3006"
echo -e "  - Backend API: http://localhost:3007"
echo -e "  - Production: https://shop.cloudmc.online"
echo ""
echo -e "${YELLOW}To view logs:${NC} docker compose logs -f"
echo -e "${YELLOW}To check status:${NC} ./monitor.sh"
echo ""
