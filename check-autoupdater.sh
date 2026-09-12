#!/bin/bash

# Check Auto-Updater Status
echo "========================================="
echo "  Auto-Updater Diagnostic"
echo "========================================="
echo ""

# Check if running in production
echo "1. Checking NODE_ENV..."
docker exec shop_backend printenv NODE_ENV
echo ""

# Check backend logs for auto-updater
echo "2. Checking backend logs for auto-updater messages..."
docker logs shop_backend 2>&1 | grep -i "auto-updater\|update" | tail -20
echo ""

# Check if autoUpdater.js exists
echo "3. Checking if autoUpdater service exists..."
docker exec shop_backend ls -la /app/src/services/autoUpdater.js
echo ""

# Check current git status
echo "4. Checking git status..."
cd /opt/cloudmc-shop
git fetch origin
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)
echo "Local commit:  $LOCAL"
echo "Remote commit: $REMOTE"
if [ "$LOCAL" = "$REMOTE" ]; then
    echo "✓ Up to date"
else
    echo "⚠ Updates available!"
fi
echo ""

# Check system_status table
echo "5. Checking system_status table..."
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT * FROM system_status;" 2>/dev/null || echo "Table doesn't exist yet"
echo ""

echo "========================================="
echo "  Diagnostic Complete"
echo "========================================="
