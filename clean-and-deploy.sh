#!/bin/bash

# Clean and Deploy Script
# Handles uncommitted changes and deploys latest code

echo "🧹 Cleaning up server workspace..."

# Remove untracked junk files
echo "Removing untracked files..."
rm -f = CACHED ERROR react-scripts
rm -rf "[backend]" "[frontend" "shop-frontend@1.0.0" "transferring"

# Reset any local changes to tracked files
echo "Resetting local changes..."
git reset --hard HEAD

# Clean untracked files
git clean -fd

# Pull latest from origin
echo "📥 Pulling latest code..."
git pull origin main

# Update version.json with current commit
CURRENT_COMMIT=$(git rev-parse HEAD)
PREVIOUS_COMMIT=$(git rev-parse HEAD~1)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "📝 Updating version.json..."
cat > version.json << EOF
{
  "current": "$CURRENT_COMMIT",
  "previous": "$PREVIOUS_COMMIT",
  "updated": "$TIMESTAMP"
}
EOF

# Rebuild and restart containers
echo "🔨 Rebuilding containers..."
docker compose down
docker compose build --no-cache
docker compose up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo "✅ Deployment complete!"
docker compose ps

echo ""
echo "📊 Current version: ${CURRENT_COMMIT:0:7}"
echo "📅 Updated: $TIMESTAMP"
echo ""
echo "🎉 All done! App is running with latest code."
