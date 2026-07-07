# Webhook Server Setup

This webhook server allows the admin panel to trigger updates directly from the web interface.

## Installation

### 1. Generate a secure secret key

```bash
openssl rand -hex 32
```

Copy the output - you'll use this as your webhook secret.

### 2. Set the webhook secret

Edit the `.env` file and add:

```bash
WEBHOOK_SECRET=your-generated-secret-here
```

### 3. Install the systemd service

```bash
cd /opt/cloudmc-shop

# Copy the service file
sudo cp shop-webhook.service /etc/systemd/system/

# Edit the service file to set your secret
sudo nano /etc/systemd/system/shop-webhook.service
# Replace "your-secret-key-here" with your generated secret

# Reload systemd
sudo systemctl daemon-reload

# Enable the service to start on boot
sudo systemctl enable shop-webhook

# Start the service
sudo systemctl start shop-webhook

# Check status
sudo systemctl status shop-webhook
```

### 4. Update Docker Compose

The backend container needs to be able to reach the host. Add this to `docker-compose.prod.yml`:

```yaml
backend:
  extra_hosts:
    - "host.docker.internal:host-gateway"
  environment:
    WEBHOOK_SECRET: ${WEBHOOK_SECRET}
```

### 5. Restart containers

```bash
./update-server.sh
```

## Usage

Once set up, the "Update Webserver" button in the admin panel will work automatically!

## Troubleshooting

### Check webhook server logs
```bash
sudo journalctl -u shop-webhook -f
```

### Restart webhook server
```bash
sudo systemctl restart shop-webhook
```

### Test webhook manually
```bash
curl -X POST http://localhost:9000/update \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret-here" \
  -d '{"trigger":"update"}'
```

## Security

- The webhook server only listens on `127.0.0.1` (localhost)
- Requires a secret key for authentication
- Only accessible from the Docker backend container
- Runs as a systemd service with automatic restart
