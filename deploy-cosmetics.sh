#!/bin/bash

echo "🚀 Deploying Cosmetics System to Listzy..."
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Update code
echo -e "${BLUE}Step 1: Updating code from GitHub...${NC}"
cd /opt/cloudmc-shop
git pull origin main
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Install backend dependencies
echo -e "${BLUE}Step 2: Installing backend dependencies...${NC}"
cd /opt/cloudmc-shop/backend
npm install multer
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Step 3: Install frontend dependencies
echo -e "${BLUE}Step 3: Installing frontend dependencies...${NC}"
cd /opt/cloudmc-shop/frontend
npm install lucide-react
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Step 4: Create icons directory
echo -e "${BLUE}Step 4: Creating icons directory...${NC}"
mkdir -p /opt/cloudmc-shop/backend/public/icons
chmod 755 /opt/cloudmc-shop/backend/public/icons
echo -e "${GREEN}✓ Icons directory created${NC}"
echo ""

# Step 5: Run database migration
echo -e "${BLUE}Step 5: Running database migration...${NC}"
echo -e "${YELLOW}⚠ You need to run the SQL migration manually${NC}"
echo ""
echo "Run this command:"
echo "docker exec -it shop_postgres psql -U postgres -d shopping_app -f /opt/cloudmc-shop/backend/migrations/add_cosmetics_system.sql"
echo ""
echo "Or copy the SQL file into the container first:"
echo "docker cp /opt/cloudmc-shop/backend/migrations/add_cosmetics_system.sql shop_postgres:/tmp/"
echo "docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/add_cosmetics_system.sql"
echo ""

# Step 6: Rebuild and restart services
echo -e "${BLUE}Step 6: Rebuilding and restarting services...${NC}"
cd /opt/cloudmc-shop
./update-server.sh
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run the database migration (see command above)"
echo "2. Visit https://listzy.app/icons to test"
echo "3. Visit https://listzy.app/admin/icons to upload icons"
echo ""
