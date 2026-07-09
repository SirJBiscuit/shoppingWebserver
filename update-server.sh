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

# Save current commit hash to version file
echo -e "${YELLOW}Saving version information...${NC}"
CURRENT_COMMIT=$(git rev-parse HEAD)
PREVIOUS_COMMIT=$(git rev-parse HEAD~1 2>/dev/null || echo "none")
cat > version.json << EOF
{
  "current": "${CURRENT_COMMIT}",
  "previous": "${PREVIOUS_COMMIT}",
  "updated": "$(date -Iseconds)"
}
EOF

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

# Auto-run all database migrations
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"

# Check if migrations directory exists
if [ -d "backend/src/database/migrations" ]; then
    # Run each migration file in order
    for migration in backend/src/database/migrations/*.sql; do
        if [ -f "$migration" ]; then
            migration_name=$(basename "$migration")
            echo -e "${CYAN}Running migration: ${migration_name}${NC}"
            
            # Execute migration
            docker exec -i shop_postgres psql -U shopuser -d shopdb < "$migration" 2>&1 | while IFS= read -r line; do
                if [[ "$line" == *"ERROR"* ]]; then
                    echo -e "${RED}  ⚠ $line${NC}"
                elif [[ "$line" == *"NOTICE"* ]]; then
                    echo -e "${GREEN}  ✓ $line${NC}"
                else
                    echo -e "${CYAN}  $line${NC}"
                fi
            done
            
            echo -e "${GREEN}  ✓ Migration ${migration_name} completed${NC}"
        fi
    done
    echo -e "${GREEN}All migrations completed successfully!${NC}"
else
    echo -e "${YELLOW}No migrations directory found, skipping...${NC}"
fi

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
