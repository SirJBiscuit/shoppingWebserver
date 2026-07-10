#!/bin/bash

# Quick fix script for backend issues
# Run this on your server when you get 502 errors

echo "🔍 Checking backend status..."
docker ps | grep shop_backend

echo ""
echo "📋 Checking backend logs..."
docker logs shop_backend --tail 50

echo ""
echo "🔄 Restarting backend container..."
docker restart shop_backend

echo ""
echo "⏳ Waiting for backend to start..."
sleep 5

echo ""
echo "✅ Checking if backend is responding..."
curl -s http://localhost:3007/api/health || echo "❌ Backend still not responding"

echo ""
echo "📊 Final status:"
docker ps | grep shop_backend

echo ""
echo "If backend is still down, check logs with:"
echo "  docker logs shop_backend --tail 100"
