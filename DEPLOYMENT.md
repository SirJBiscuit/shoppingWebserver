# Deployment Guide - Debian Bookworm 12

This guide covers deploying CloudMC Shop on a dedicated Linux server running Debian Bookworm 12.

## Prerequisites

- Debian Bookworm 12 server with root access
- At least 2GB RAM, 20GB disk space
- Domain configured: shop.cloudmc.online
- Cloudflare account with tunnel access

## Quick Deployment

### 1. Prepare Your Server

SSH into your server:
```bash
ssh root@YOUR_SERVER_IP
```

### 2. Upload Application Files

**Option A: Using Git (Recommended)**
```bash
# On the server
cd /opt
git clone https://github.com/SirJBiscuit/shoppingWebserver.git cloudmc-shop
cd cloudmc-shop
```

**Option B: Using SCP (from PowerShell/CMD)**
```powershell
scp -r "c:\Users\Jeremiah Payne\CascadeProjects\shopWebserver" root@YOUR_SERVER_IP:/opt/cloudmc-shop
```

**Option C: Manual Upload**
Use WinSCP, FileZilla, or similar SFTP client to upload the entire project to `/opt/cloudmc-shop`

### 3. Run Deployment Script

```bash
cd /opt/cloudmc-shop
chmod +x deploy-linux.sh
./deploy-linux.sh
```

This script will:
- Update system packages
- Install Docker and Docker Compose
- Configure firewall (UFW)
- Create systemd service
- Set up log rotation
- Create backup script with daily cron job

### 4. Configure Environment

Edit the `.env` file with secure credentials:
```bash
nano /opt/cloudmc-shop/.env
```

**Important:** Change these values:
```env
DB_PASSWORD=YOUR_SECURE_DATABASE_PASSWORD
JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY_MIN_32_CHARS
NODE_ENV=production
```

### 5. Start the Application

```bash
# Copy production docker-compose
cp docker-compose.prod.yml docker-compose.yml

# Start services
systemctl start cloudmc-shop
systemctl enable cloudmc-shop

# Check status
systemctl status cloudmc-shop

# View logs
docker compose logs -f
```

### 6. Run Database Migrations

```bash
cd /opt/cloudmc-shop
docker exec shop_backend npm run migrate
```

### 7. Setup Cloudflare Tunnel

```bash
chmod +x setup-cloudflare-tunnel.sh
./setup-cloudflare-tunnel.sh
```

Then follow the manual steps:

```bash
# Login to Cloudflare
cloudflared tunnel login

# Create tunnel (if not already created)
cloudflared tunnel create shop-cloudmc

# Note the tunnel ID from output
# Create config file
nano ~/.cloudflared/config.yml
```

Add this configuration (replace YOUR_TUNNEL_ID):
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: shop.cloudmc.online
    service: http://localhost:3006
  - service: http_status:404
```

Route DNS and start tunnel:
```bash
# Route DNS
cloudflared tunnel route dns shop-cloudmc shop.cloudmc.online

# Install as service
cloudflared service install

# Start tunnel
systemctl start cloudflared
systemctl enable cloudflared

# Check status
systemctl status cloudflared
```

## Verification

1. **Check Docker containers:**
```bash
docker ps
```
You should see 3 containers running: shop_postgres, shop_backend, shop_frontend

2. **Test local access:**
```bash
curl http://localhost:3000
curl http://localhost:3001/api/health
```

3. **Test external access:**
Visit https://shop.cloudmc.online in your browser

## Updating the Application

### Quick Update (Recommended)
```bash
cd /opt/cloudmc-shop
chmod +x update-server.sh
./update-server.sh
```

This script automatically:
- Pulls latest code from GitHub
- Copies production configuration
- Rebuilds and restarts containers
- Shows container status

### Manual Update
```bash
cd /opt/cloudmc-shop
git pull
cp docker-compose.prod.yml docker-compose.yml
docker compose down
docker compose up -d --build
```

### Run Database Migrations (if needed)
```bash
docker exec shop_backend npm run migrate-v2
```

## Management Commands

### Service Management
```bash
# Start
systemctl start cloudmc-shop

# Stop
systemctl stop cloudmc-shop

# Restart
systemctl restart cloudmc-shop

# Status
systemctl status cloudmc-shop

# Enable auto-start
systemctl enable cloudmc-shop
```

### Docker Commands
```bash
# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Restart specific service
docker compose restart backend

# Rebuild and restart
docker compose up -d --build

# Stop all containers
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

### Database Management
```bash
# Backup database
/opt/cloudmc-shop/backup.sh

# Restore from backup
gunzip -c /opt/cloudmc-shop/backups/db_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker exec -i shop_postgres psql -U shopuser -d shopdb

# Access database console
docker exec -it shop_postgres psql -U shopuser -d shopdb

# Run migrations
docker exec shop_backend npm run migrate
```

### Cloudflare Tunnel
```bash
# Status
systemctl status cloudflared

# Restart
systemctl restart cloudflared

# View logs
journalctl -u cloudflared -f

# Test tunnel
cloudflared tunnel info shop-cloudmc
```

## Monitoring

### View Application Logs
```bash
# All services
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100

# Specific timeframe
docker compose logs --since 1h
```

### System Resources
```bash
# Docker stats
docker stats

# Disk usage
df -h
docker system df

# Memory usage
free -h
```

### Health Checks
```bash
# Backend health
curl http://localhost:3001/api/health

# Frontend health
curl http://localhost:3000

# Database health
docker exec shop_postgres pg_isready -U shopuser
```

## Backup & Restore

### Automatic Backups
Backups run daily at 2 AM via cron. Backups are kept for 30 days.

Location: `/opt/cloudmc-shop/backups/`

### Manual Backup
```bash
/opt/cloudmc-shop/backup.sh
```

### Restore Database
```bash
# List backups
ls -lh /opt/cloudmc-shop/backups/

# Restore (replace FILENAME with actual backup file)
gunzip -c /opt/cloudmc-shop/backups/FILENAME.sql.gz | \
  docker exec -i shop_postgres psql -U shopuser -d shopdb
```

## Updating the Application

### Update Code
```bash
cd /opt/cloudmc-shop

# If using git
git pull

# Rebuild and restart
docker compose down
docker compose up -d --build

# Run any new migrations
docker exec shop_backend npm run migrate
```

### Update Dependencies
```bash
# Backend
cd /opt/cloudmc-shop/backend
docker exec -it shop_backend npm update

# Frontend
cd /opt/cloudmc-shop/frontend
docker exec -it shop_frontend npm update

# Rebuild
cd /opt/cloudmc-shop
docker compose up -d --build
```

## Security Recommendations

1. **Change default passwords** in `.env`
2. **Enable firewall** (done by script)
3. **Keep system updated:**
```bash
apt-get update && apt-get upgrade -y
```

4. **Monitor logs regularly:**
```bash
docker compose logs --tail=100
journalctl -u cloudmc-shop -n 100
```

5. **Set up fail2ban** (optional):
```bash
apt-get install -y fail2ban
systemctl enable fail2ban
```

6. **Use SSH keys** instead of passwords
7. **Disable root SSH login** after setup
8. **Regular backups** - verify backup cron is running

## Troubleshooting

### Containers won't start
```bash
# Check logs
docker compose logs

# Check disk space
df -h

# Check Docker status
systemctl status docker
```

### Database connection errors
```bash
# Check if postgres is running
docker ps | grep postgres

# Check database logs
docker compose logs postgres

# Verify credentials in .env
cat /opt/cloudmc-shop/.env
```

### Frontend can't reach backend
```bash
# Check network
docker network ls
docker network inspect shop_network

# Verify backend is responding
curl http://localhost:3001/api/health
```

### Cloudflare tunnel not working
```bash
# Check tunnel status
systemctl status cloudflared
cloudflared tunnel info shop-cloudmc

# Check tunnel logs
journalctl -u cloudflared -f

# Verify DNS
nslookup shop.cloudmc.online
```

## Performance Tuning

### PostgreSQL
Edit `docker-compose.yml` to add:
```yaml
postgres:
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Nginx (Frontend)
Already optimized in the Dockerfile with gzip compression.

### Node.js (Backend)
For high traffic, consider adding:
```yaml
backend:
  environment:
    NODE_OPTIONS: --max-old-space-size=2048
```

## Support

For issues, check:
1. Application logs: `docker compose logs -f`
2. System logs: `journalctl -xe`
3. Cloudflare tunnel logs: `journalctl -u cloudflared -f`
