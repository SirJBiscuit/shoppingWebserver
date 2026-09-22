#!/bin/bash

###############################################################################
# Start All Services Script
# Purpose: Start all Docker containers and services for the shopping app
# Usage: sudo ./scripts/start-all.sh
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Log function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    error "Docker is not installed!"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    error "Docker Compose is not installed!"
    exit 1
fi

log "Starting all services for Shopping App..."
echo ""

# Navigate to project directory
PROJECT_DIR="/opt/cloudmc-shop"
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"
log "Working directory: $(pwd)"

# 1. Check if containers are already running
log "Checking current container status..."
RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)
if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
    warning "Some containers are already running:"
    docker-compose ps
    echo ""
    read -p "Do you want to restart them? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        info "Keeping existing containers running"
        exit 0
    fi
    log "Stopping existing containers..."
    docker-compose down
fi

# 2. Pull latest images (optional, comment out if you want faster startup)
log "Pulling latest images..."
docker-compose pull || warning "Failed to pull some images (continuing anyway)"

# 3. Build containers
log "Building containers..."
docker-compose build

# 4. Start all containers
log "Starting all containers..."
docker-compose up -d

# 5. Wait for containers to be healthy
log "Waiting for containers to start..."
sleep 5

# 6. Check container status
log "Container status:"
docker-compose ps

# 7. Check if all services are running
EXPECTED_SERVICES=("frontend" "backend" "db")
ALL_RUNNING=true

for service in "${EXPECTED_SERVICES[@]}"; do
    if docker-compose ps | grep -q "$service.*Up"; then
        log "✓ $service is running"
    else
        error "✗ $service is NOT running"
        ALL_RUNNING=false
    fi
done

echo ""

# 8. Show logs from all containers (last 20 lines)
log "Recent logs from all containers:"
docker-compose logs --tail=20

echo ""

# 9. Show service URLs
if [ "$ALL_RUNNING" = true ]; then
    log "=========================================="
    log "✓ All services started successfully!"
    log "=========================================="
    info "Frontend: http://localhost:3000"
    info "Backend API: http://localhost:5000"
    info "Database: localhost:5432"
    echo ""
    info "To view logs: docker-compose logs -f"
    info "To stop all: docker-compose down"
    info "To restart: docker-compose restart"
else
    error "=========================================="
    error "Some services failed to start!"
    error "=========================================="
    warning "Check logs with: docker-compose logs"
    exit 1
fi
