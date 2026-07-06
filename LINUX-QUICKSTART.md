# Linux Quick Start Guide - Debian Bookworm 12

## 🚀 Fast Deployment (5 Minutes)

### Step 1: Get Files on Server

**Option A: Clone from GitHub (Recommended)**

```bash
ssh root@YOUR_SERVER_IP
cd /opt
git clone https://github.com/SirJBiscuit/shoppingWebserver.git cloudmc-shop
cd cloudmc-shop
```

**Option B: Upload from Windows**

```powershell
# Using SCP (replace YOUR_SERVER_IP with actual IP)
scp -r "c:\Users\Jeremiah Payne\CascadeProjects\shopWebserver" root@YOUR_SERVER_IP:/opt/cloudmc-shop
```

**Or use WinSCP/FileZilla** to upload to `/opt/cloudmc-shop`

### Step 2: SSH into Server

```bash
ssh root@YOUR_SERVER_IP
```

### Step 3: Run Deployment Script

```bash
cd /opt/cloudmc-shop
chmod +x *.sh
./deploy-linux.sh
```

This installs Docker, configures firewall, and sets up the application.

### Step 4: Configure Environment

```bash
nano /opt/cloudmc-shop/.env
```

**Change these values:**
```env
DB_PASSWORD=YourSecurePassword123!
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
NODE_ENV=production
```

Save with `Ctrl+X`, then `Y`, then `Enter`

### Step 5: Start Application

```bash
# Use production config
cp docker-compose.prod.yml docker-compose.yml

# Start services
systemctl start cloudmc-shop
systemctl enable cloudmc-shop

# Run database migrations
sleep 10
docker exec shop_backend npm run migrate
```

### Step 6: Setup Cloudflare Tunnel

```bash
./setup-cloudflare-tunnel.sh

# Then follow the prompts:
cloudflared tunnel login
cloudflared tunnel create shop-cloudmc

# Create config
nano ~/.cloudflared/config.yml
```

**Add this (replace YOUR_TUNNEL_ID):**
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: shop.cloudmc.online
    service: http://localhost:3006
  - service: http_status:404
```

**Finish setup:**
```bash
cloudflared tunnel route dns shop-cloudmc shop.cloudmc.online
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

### Step 7: Verify

```bash
# Check all services
./monitor.sh

# Or manually:
docker ps
curl http://localhost:3006
curl http://localhost:3001/api/health
```

**Visit:** https://shop.cloudmc.online

---

## 📋 Common Commands

### Service Control
```bash
systemctl start cloudmc-shop      # Start
systemctl stop cloudmc-shop       # Stop
systemctl restart cloudmc-shop    # Restart
systemctl status cloudmc-shop     # Status
```

### View Logs
```bash
docker compose logs -f            # All logs
docker compose logs -f backend    # Backend only
docker compose logs -f frontend   # Frontend only
```

### Monitoring
```bash
./monitor.sh                      # Quick status
./monitor.sh -f                   # Live monitoring
docker stats                      # Resource usage
```

### Backup & Restore
```bash
./backup.sh                       # Manual backup
ls -lh /opt/cloudmc-shop/backups/ # List backups
```

### Updates
```bash
./update.sh                       # Update application
```

---

## 🔧 Troubleshooting

### Containers won't start
```bash
docker compose logs
systemctl status docker
df -h  # Check disk space
```

### Can't access website
```bash
# Check firewall
ufw status

# Check Cloudflare tunnel
systemctl status cloudflared
journalctl -u cloudflared -f

# Verify DNS
nslookup shop.cloudmc.online
```

### Database errors
```bash
docker compose logs postgres
docker exec -it shop_postgres psql -U shopuser -d shopdb
```

### Reset everything
```bash
cd /opt/cloudmc-shop
docker compose down -v
docker compose up -d --build
docker exec shop_backend npm run migrate
```

---

## 🔒 Security Checklist

- [ ] Changed default passwords in `.env`
- [ ] Firewall enabled (UFW)
- [ ] SSH key authentication configured
- [ ] Regular backups running (check cron)
- [ ] System updates applied
- [ ] Cloudflare tunnel configured with HTTPS

---

## 📊 File Locations

- **Application:** `/opt/cloudmc-shop/`
- **Backups:** `/opt/cloudmc-shop/backups/`
- **Logs:** `docker compose logs`
- **Config:** `/opt/cloudmc-shop/.env`
- **Cloudflare:** `~/.cloudflared/`

---

## 🆘 Need Help?

1. Check logs: `docker compose logs -f`
2. Run monitor: `./monitor.sh`
3. Check system: `journalctl -xe`
4. Review full docs: `DEPLOYMENT.md`
