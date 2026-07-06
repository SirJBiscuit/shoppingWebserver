#!/bin/bash

# CloudMC Shop - Cloudflare Tunnel Setup for Linux
# This script helps configure Cloudflare Tunnel on Debian Bookworm 12

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}======================================"
echo "Cloudflare Tunnel Setup"
echo -e "======================================${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${CYAN}Installing Cloudflare Tunnel (cloudflared)...${NC}"

# Download and install cloudflared
if ! command -v cloudflared &> /dev/null; then
    # Add cloudflare gpg key
    mkdir -p --mode=0755 /usr/share/keyrings
    curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

    # Add cloudflare repository
    echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared $(lsb_release -cs) main" | tee /etc/apt/sources.list.d/cloudflared.list

    # Update and install
    apt-get update
    apt-get install -y cloudflared
    
    echo -e "${GREEN}cloudflared installed successfully${NC}"
else
    echo -e "${GREEN}cloudflared is already installed${NC}"
fi

echo ""
echo -e "${YELLOW}======================================"
echo "Manual Configuration Required"
echo -e "======================================${NC}"
echo ""
echo "1. Login to Cloudflare:"
echo "   cloudflared tunnel login"
echo ""
echo "2. Create a tunnel:"
echo "   cloudflared tunnel create shop-cloudmc"
echo ""
echo "3. Create config file at ~/.cloudflared/config.yml:"
echo ""
cat << 'EOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: shop.cloudmc.online
    service: http://localhost:3006
  - service: http_status:404
EOF
echo ""
echo "4. Route DNS to your tunnel:"
echo "   cloudflared tunnel route dns shop-cloudmc shop.cloudmc.online"
echo ""
echo "5. Install tunnel as a service:"
echo "   cloudflared service install"
echo ""
echo "6. Start the tunnel:"
echo "   systemctl start cloudflared"
echo "   systemctl enable cloudflared"
echo ""
echo -e "${GREEN}After setup, your app will be available at: https://shop.cloudmc.online${NC}"
echo ""
