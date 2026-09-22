#!/bin/bash

###############################################################################
# Server Update & Maintenance Script
# Purpose: Update system, Docker, and check if reboot is needed
# Usage: sudo ./scripts/server-update.sh
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

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    error "Please run as root (use sudo)"
    exit 1
fi

log "Starting server update and maintenance..."

# 1. Update package lists
log "Updating package lists..."
apt-get update -y

# 2. Upgrade all packages
log "Upgrading all packages..."
apt-get upgrade -y

# 3. Full distribution upgrade
log "Performing full distribution upgrade..."
apt-get dist-upgrade -y

# 4. Remove unused packages
log "Removing unused packages..."
apt-get autoremove -y
apt-get autoclean -y

# 5. Update Docker if installed
if command -v docker &> /dev/null; then
    log "Updating Docker..."
    apt-get install --only-upgrade docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y || warning "Docker update skipped (may not be installed via apt)"
else
    warning "Docker not found"
fi

# 6. Update Docker Compose if installed
if command -v docker-compose &> /dev/null; then
    log "Docker Compose version: $(docker-compose --version)"
else
    warning "Docker Compose not found"
fi

# 7. Clean up Docker
if command -v docker &> /dev/null; then
    log "Cleaning up Docker..."
    docker system prune -f || warning "Docker cleanup failed"
fi

# 8. Check disk space
log "Checking disk space..."
df -h | grep -E '^/dev/'

# 9. Check memory usage
log "Checking memory usage..."
free -h

# 10. Check if reboot is required
log "Checking if reboot is required..."
if [ -f /var/run/reboot-required ]; then
    warning "⚠️  REBOOT REQUIRED ⚠️"
    if [ -f /var/run/reboot-required.pkgs ]; then
        info "Packages requiring reboot:"
        cat /var/run/reboot-required.pkgs
    fi
    echo ""
    warning "Run 'sudo reboot' to restart the server"
else
    log "✓ No reboot required"
fi

# 11. Check running Docker containers
if command -v docker &> /dev/null; then
    log "Running Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
fi

# 12. Summary
echo ""
log "=========================================="
log "Update Summary"
log "=========================================="
info "System: $(lsb_release -d | cut -f2)"
info "Kernel: $(uname -r)"
info "Docker: $(docker --version 2>/dev/null || echo 'Not installed')"
info "Docker Compose: $(docker-compose --version 2>/dev/null || echo 'Not installed')"
log "=========================================="

echo ""
log "✓ Server update completed successfully!"

# Check if reboot is needed and ask
if [ -f /var/run/reboot-required ]; then
    echo ""
    read -p "Do you want to reboot now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Rebooting server in 5 seconds..."
        sleep 5
        reboot
    else
        warning "Remember to reboot later!"
    fi
fi
