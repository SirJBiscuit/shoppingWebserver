#!/bin/bash

###############################################################################
# Stop All Services Script
# Purpose: Stop all Docker containers for the shopping app
# Usage: sudo ./scripts/stop-all.sh
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

# Navigate to project directory
PROJECT_DIR="/opt/cloudmc-shop"
if [ ! -d "$PROJECT_DIR" ]; then
    error "Project directory not found: $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

log "Stopping all services for Shopping App..."
echo ""

# Check if any containers are running
RUNNING_CONTAINERS=$(docker-compose ps --services --filter "status=running" 2>/dev/null | wc -l)

if [ "$RUNNING_CONTAINERS" -eq 0 ]; then
    info "No containers are currently running"
    exit 0
fi

# Show what's running
log "Currently running containers:"
docker-compose ps

echo ""
read -p "Do you want to stop all containers? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    info "Cancelled - containers still running"
    exit 0
fi

# Stop all containers
log "Stopping all containers..."
docker-compose down

log "✓ All containers stopped successfully!"
