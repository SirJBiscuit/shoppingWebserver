#!/bin/bash

# CloudMC Shop - Linux Deployment Script for Debian Bookworm 12
# This script sets up and deploys the application on a dedicated Linux server

set -e

echo "======================================"
echo "CloudMC Shop - Linux Deployment"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${CYAN}Step 1: Updating system packages...${NC}"
apt-get update
apt-get upgrade -y

echo -e "${CYAN}Step 2: Installing required packages...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw

echo -e "${CYAN}Step 3: Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Start and enable Docker
    systemctl start docker
    systemctl enable docker
    
    echo -e "${GREEN}Docker installed successfully${NC}"
else
    echo -e "${GREEN}Docker is already installed${NC}"
fi

echo -e "${CYAN}Step 4: Configuring firewall...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3000/tcp  # Frontend (for Cloudflare tunnel)
ufw allow 3001/tcp  # Backend API (optional, can be blocked if only accessed via frontend)
ufw status

echo -e "${CYAN}Step 5: Creating application directory...${NC}"
APP_DIR="/opt/cloudmc-shop"
mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${CYAN}Step 6: Setting up environment...${NC}"
if [ ! -f ".env" ]; then
    cat > .env << 'EOF'
DB_PASSWORD=SecureShopDB2024!
JWT_SECRET=cloudmc-shop-super-secret-jwt-key-2024-minimum-32-characters
NODE_ENV=production
EOF
    echo -e "${YELLOW}Created .env file. Please update with secure credentials!${NC}"
    echo -e "${YELLOW}Edit: nano $APP_DIR/.env${NC}"
else
    echo -e "${GREEN}.env file already exists${NC}"
fi

echo -e "${CYAN}Step 7: Creating systemd service...${NC}"
cat > /etc/systemd/system/cloudmc-shop.service << 'EOF'
[Unit]
Description=CloudMC Shop - Smart Shopping List
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/cloudmc-shop
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

echo -e "${CYAN}Step 8: Setting up log rotation...${NC}"
cat > /etc/logrotate.d/cloudmc-shop << 'EOF'
/opt/cloudmc-shop/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF

echo -e "${CYAN}Step 9: Creating backup script...${NC}"
mkdir -p /opt/cloudmc-shop/backups
cat > /opt/cloudmc-shop/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/cloudmc-shop/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

# Backup PostgreSQL database
docker exec shop_postgres pg_dump -U shopuser shopdb > $BACKUP_FILE
gzip $BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /opt/cloudmc-shop/backup.sh

# Add daily backup cron job
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/cloudmc-shop/backup.sh >> /var/log/cloudmc-shop-backup.log 2>&1") | crontab -

echo ""
echo -e "${GREEN}======================================"
echo -e "Installation Complete!"
echo -e "======================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Copy your application files to: $APP_DIR"
echo "2. Edit .env file: nano $APP_DIR/.env"
echo "3. Start the service: systemctl start cloudmc-shop"
echo "4. Enable auto-start: systemctl enable cloudmc-shop"
echo "5. Check status: systemctl status cloudmc-shop"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo "- View logs: docker compose logs -f"
echo "- Restart: systemctl restart cloudmc-shop"
echo "- Stop: systemctl stop cloudmc-shop"
echo "- Backup database: /opt/cloudmc-shop/backup.sh"
echo ""
echo -e "${CYAN}Application will be available at:${NC}"
echo "- Frontend: http://YOUR_SERVER_IP:3006"
echo "- Backend: http://YOUR_SERVER_IP:3001"
echo ""
