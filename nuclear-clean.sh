#!/bin/bash

echo "🧹 NUCLEAR CLEANUP - Removing ALL old versions..."

# Stop all containers
echo "Stopping all containers..."
docker-compose down

# Kill any npm processes on port 3006
echo "Killing any processes on port 3006..."
sudo lsof -ti:3006 | xargs -r kill -9

# Remove ALL Docker images for this project
echo "Removing Docker images..."
docker rmi cloudmc-shop-frontend cloudmc-shop-backend 2>/dev/null || true

# Clear Docker build cache
echo "Clearing Docker build cache..."
docker builder prune -af

# Remove node_modules and package-lock to force fresh install
echo "Cleaning frontend dependencies..."
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
cd ..

echo "Cleaning backend dependencies..."
cd backend
rm -rf node_modules package-lock.json
npm cache clean --force
cd ..

# Pull latest code
echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main

# Fresh install
echo "Installing fresh dependencies..."
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Rebuild and start with no cache
echo "Building and starting containers (no cache)..."
docker-compose build --no-cache
docker-compose up -d

echo ""
echo "✅ NUCLEAR CLEANUP COMPLETE!"
echo ""
echo "Containers running:"
docker ps
echo ""
echo "🎉 Everything is fresh! Visit your site and do ONE Ctrl+F5"
