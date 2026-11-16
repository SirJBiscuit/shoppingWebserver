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
BEFORE_COMMIT=$(git rev-parse HEAD)
git pull origin main

# If pull fails, force reset
if [ $? -ne 0 ]; then
    echo -e "${RED}Pull failed, forcing reset to origin/main...${NC}"
    git fetch origin
    git reset --hard origin/main
fi

# Show what was updated
AFTER_COMMIT=$(git rev-parse HEAD)
if [ "$BEFORE_COMMIT" != "$AFTER_COMMIT" ]; then
    echo -e "${GREEN}✓ Code updated successfully!${NC}"
    echo -e "${CYAN}Recent changes:${NC}"
    git log --oneline --no-decorate $BEFORE_COMMIT..$AFTER_COMMIT | head -5
    echo ""
else
    echo -e "${GREEN}✓ Already up to date${NC}"
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

# Update database with new version
echo -e "${YELLOW}Updating system_status table...${NC}"
docker exec -i shop_postgres psql -U shopuser -d shopdb << EOSQL
UPDATE system_status 
SET current_version = '${CURRENT_COMMIT}',
    last_successful_update = CURRENT_TIMESTAMP,
    update_available = false,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;
EOSQL

# Remove update flag file if it exists
if [ -f ".update-requested" ]; then
    echo -e "${YELLOW}Removing update flag file...${NC}"
    rm -f .update-requested
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

# Run pending database migrations — shared tracked runner inside the
# backend container. Each file in backend/migrations/ runs exactly once
# (tracked in schema_migrations), so dropping a new .sql file in and
# pushing is all that's needed — nothing to register here.
echo ""
echo -e "${YELLOW}Running database migrations...${NC}"
if [ -d "backend/migrations" ]; then
    docker exec shop_backend node src/database/runMigrations.js \
        || echo -e "${RED}⚠ Migration runner reported failures — check output above${NC}"
    echo -e "${GREEN}Migrations finished${NC}"
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
