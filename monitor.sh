#!/bin/bash

# CloudMC Shop - Monitoring Script
# Displays real-time status of all services

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

clear
echo -e "${CYAN}======================================"
echo "CloudMC Shop - System Monitor"
echo -e "======================================${NC}"
echo ""

# Docker containers status
echo -e "${CYAN}Docker Containers:${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep shop || echo -e "${RED}No containers running${NC}"
echo ""

# Service health checks
echo -e "${CYAN}Health Checks:${NC}"

# Backend
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend API: Running${NC}"
else
    echo -e "${RED}✗ Backend API: Down${NC}"
fi

# Frontend
if curl -s http://localhost:3006 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend: Running${NC}"
else
    echo -e "${RED}✗ Frontend: Down${NC}"
fi

# Database
if docker exec shop_postgres pg_isready -U shopuser > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database: Running${NC}"
else
    echo -e "${RED}✗ Database: Down${NC}"
fi

# Cloudflare Tunnel
if systemctl is-active --quiet cloudflared 2>/dev/null; then
    echo -e "${GREEN}✓ Cloudflare Tunnel: Running${NC}"
else
    echo -e "${YELLOW}⚠ Cloudflare Tunnel: Not configured or stopped${NC}"
fi

echo ""

# Resource usage
echo -e "${CYAN}Resource Usage:${NC}"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep shop
echo ""

# Disk usage
echo -e "${CYAN}Disk Usage:${NC}"
df -h / | tail -n 1
echo ""

# Recent logs (last 5 lines)
echo -e "${CYAN}Recent Logs (last 5 lines):${NC}"
docker compose logs --tail=5 2>/dev/null || echo "No logs available"
echo ""

echo -e "${YELLOW}Press Ctrl+C to exit, or run with -f flag for live monitoring${NC}"

# If -f flag is provided, follow logs
if [ "$1" == "-f" ]; then
    echo ""
    docker compose logs -f
fi
