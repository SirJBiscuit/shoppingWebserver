# Deployment Checklist - Debian Bookworm 12

## Pre-Deployment

- [ ] Server running Debian Bookworm 12
- [ ] Root or sudo access to server
- [ ] Domain `shop.cloudmc.online` configured in Cloudflare
- [ ] Cloudflare account with tunnel capability
- [ ] SSH access configured
- [ ] Server has at least 2GB RAM, 20GB disk

## Step 1: Upload Files

- [ ] Upload project to `/opt/cloudmc-shop` via SCP, SFTP, or Git
- [ ] Verify all files present: `ls -la /opt/cloudmc-shop`

## Step 2: Run Deployment Script

```bash
cd /opt/cloudmc-shop
chmod +x *.sh
./deploy-linux.sh
```

- [ ] Script completed without errors
- [ ] Docker installed: `docker --version`
- [ ] Docker Compose installed: `docker compose version`
- [ ] Firewall configured: `ufw status`

## Step 3: Configure Environment

```bash
nano /opt/cloudmc-shop/.env
```

- [ ] Changed `DB_PASSWORD` to secure value
- [ ] Changed `JWT_SECRET` to 32+ character random string
- [ ] Set `NODE_ENV=production`
- [ ] Saved file (Ctrl+X, Y, Enter)

## Step 4: Start Application

```bash
cp docker-compose.prod.yml docker-compose.yml
systemctl start cloudmc-shop
systemctl enable cloudmc-shop
```

- [ ] Service started: `systemctl status cloudmc-shop`
- [ ] Wait 10 seconds for database to initialize
- [ ] Run migrations: `docker exec shop_backend npm run migrate`
- [ ] Migrations completed successfully

## Step 5: Verify Application

```bash
docker ps
```

- [ ] 3 containers running: `shop_postgres`, `shop_backend`, `shop_frontend`
- [ ] All containers show "Up" status
- [ ] Test backend: `curl http://localhost:3001/api/health`
- [ ] Test frontend: `curl http://localhost:3006`

## Step 6: Setup Cloudflare Tunnel

```bash
./setup-cloudflare-tunnel.sh
```

- [ ] cloudflared installed
- [ ] Login completed: `cloudflared tunnel login`
- [ ] Tunnel created: `cloudflared tunnel create shop-cloudmc`
- [ ] Noted tunnel ID from output

### Create Config File

```bash
nano ~/.cloudflared/config.yml
```

Add (replace YOUR_TUNNEL_ID):
```yaml
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: shop.cloudmc.online
    service: http://localhost:3006
  - service: http_status:404
```

- [ ] Config file created
- [ ] Tunnel ID correct
- [ ] Credentials file path correct

### Finish Tunnel Setup

```bash
cloudflared tunnel route dns shop-cloudmc shop.cloudmc.online
cloudflared service install
systemctl start cloudflared
systemctl enable cloudflared
```

- [ ] DNS routed
- [ ] Service installed
- [ ] Service started: `systemctl status cloudflared`
- [ ] Service enabled for auto-start

## Step 7: Final Verification

### Test Local Access
- [ ] Backend health: `curl http://localhost:3001/api/health`
- [ ] Frontend: `curl http://localhost:3006`
- [ ] Database: `docker exec shop_postgres pg_isready -U shopuser`

### Test External Access
- [ ] Visit https://shop.cloudmc.online
- [ ] Page loads correctly
- [ ] Can access registration page
- [ ] Can create account
- [ ] Can login
- [ ] Can create shopping list
- [ ] Can add items

### Check Services
```bash
./monitor.sh
```

- [ ] All containers running
- [ ] All health checks passing
- [ ] Cloudflare tunnel active

## Step 8: Security Verification

- [ ] Firewall enabled: `ufw status`
- [ ] Only necessary ports open (22, 80, 443, 3000)
- [ ] Strong passwords in `.env`
- [ ] JWT secret is 32+ characters
- [ ] `.env` file permissions: `chmod 600 /opt/cloudmc-shop/.env`

## Step 9: Backup Configuration

- [ ] Backup script exists: `ls -la /opt/cloudmc-shop/backup.sh`
- [ ] Backup script executable: `chmod +x /opt/cloudmc-shop/backup.sh`
- [ ] Test backup: `./backup.sh`
- [ ] Backup created: `ls -lh /opt/cloudmc-shop/backups/`
- [ ] Cron job configured: `crontab -l | grep backup`

## Step 10: Documentation

- [ ] Note server IP address: ___________________
- [ ] Note Cloudflare tunnel ID: ___________________
- [ ] Save `.env` values securely (password manager)
- [ ] Document any custom configurations

## Post-Deployment

### Monitoring Setup
- [ ] Test monitoring: `./monitor.sh`
- [ ] Check logs: `docker compose logs -f`
- [ ] Verify log rotation: `ls -la /etc/logrotate.d/cloudmc-shop`

### Test Updates
- [ ] Test update script: `./update.sh` (optional)
- [ ] Verify application still works after update

### Performance Check
- [ ] Check resource usage: `docker stats`
- [ ] Monitor for 24 hours
- [ ] Verify no memory leaks
- [ ] Check disk space: `df -h`

## Maintenance Schedule

### Daily (Automated)
- [x] Database backups (2 AM via cron)

### Weekly
- [ ] Check logs for errors
- [ ] Verify backups are working
- [ ] Check disk space

### Monthly
- [ ] Update system packages: `apt-get update && apt-get upgrade`
- [ ] Review security logs
- [ ] Test restore from backup
- [ ] Check for application updates

## Emergency Contacts

- Server Provider: ___________________
- Cloudflare Support: https://support.cloudflare.com
- Domain Registrar: ___________________

## Rollback Plan

If something goes wrong:

```bash
# Stop services
systemctl stop cloudmc-shop
systemctl stop cloudflared

# Restore from backup
gunzip -c /opt/cloudmc-shop/backups/LATEST_BACKUP.sql.gz | \
  docker exec -i shop_postgres psql -U shopuser -d shopdb

# Restart services
systemctl start cloudmc-shop
systemctl start cloudflared
```

## Success Criteria

✅ Application accessible at https://shop.cloudmc.online
✅ Users can register and login
✅ Shopping lists can be created and managed
✅ Smart suggestions working
✅ Inventory tracking functional
✅ All services auto-start on reboot
✅ Backups running daily
✅ Monitoring in place

---

## Deployment Completed

**Date:** ___________________
**Deployed By:** ___________________
**Server IP:** ___________________
**Tunnel ID:** ___________________

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
