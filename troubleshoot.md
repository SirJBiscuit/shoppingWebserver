# Troubleshooting Guide

## Service Failed to Start

Run these commands to diagnose:

```bash
# Check service status
systemctl status cloudmc-shop.service

# Check detailed logs
journalctl -xeu cloudmc-shop.service

# Check if Docker is running
systemctl status docker

# Check if docker-compose.yml exists
ls -la /opt/cloudmc-shop/docker-compose.yml

# Check if .env file exists
ls -la /opt/cloudmc-shop/.env

# Try starting manually
cd /opt/cloudmc-shop
docker compose up
```

## Common Issues:

### 1. Docker not running
```bash
systemctl start docker
systemctl enable docker
```

### 2. Missing docker-compose.yml
```bash
cd /opt/cloudmc-shop
cp docker-compose.prod.yml docker-compose.yml
```

### 3. Missing .env file
```bash
cd /opt/cloudmc-shop
cp .env.example .env
nano .env
# Add your secure values
```

### 4. Permission issues
```bash
cd /opt/cloudmc-shop
chmod +x *.sh
```

### 5. Port conflicts
```bash
# Check if ports are in use
netstat -tulpn | grep 3006
netstat -tulpn | grep 3001
netstat -tulpn | grep 5432
```

## Manual Start (for testing)

```bash
cd /opt/cloudmc-shop
docker compose down
docker compose up -d --build
docker compose logs -f
```
