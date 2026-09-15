#!/bin/bash
# Deploy MDL User Preferences Migration

echo "🚀 Deploying MDL User Preferences System..."

# Pull latest code
echo "📥 Pulling latest code..."
git pull

# Run migration
echo "🔄 Running database migration..."
cd backend
node src/database/migrate.js

# Restart backend
echo "🔄 Restarting backend..."
pm2 restart shopping-backend

# Rebuild frontend
echo "🏗️  Rebuilding frontend..."
cd ../frontend
npm run build

# Restart frontend
echo "🔄 Restarting frontend..."
pm2 restart shopping-frontend

echo "✅ Deployment complete!"
echo ""
echo "📋 What's new:"
echo "  ✅ Flying animations fixed (items fly to cart correctly)"
echo "  ✅ AnimatedCart only shows checked items"
echo "  ✅ Checkmark animation from Looking for Next works"
echo "  ✅ MDL User Preferences system (cross-device sync)"
echo "  ✅ Last active list persists across devices"
echo ""
echo "🔍 Test the features:"
echo "  1. Check off items - they should fly to the 3D cart"
echo "  2. Cart should start empty until items are checked"
echo "  3. Mark Found in Looking for Next - checkmark flies to item"
echo "  4. Switch devices - last active list should persist"
