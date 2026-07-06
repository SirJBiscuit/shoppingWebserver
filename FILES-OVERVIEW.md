# Project Files Overview

## 📁 Project Structure

```
shopWebserver/
├── backend/                    # Node.js backend API
│   ├── src/
│   │   ├── database/
│   │   │   ├── db.js          # Database connection
│   │   │   ├── migrate.js     # Migration runner
│   │   │   └── schema.sql     # Database schema
│   │   ├── middleware/
│   │   │   └── auth.js        # JWT authentication
│   │   ├── routes/
│   │   │   ├── auth.js        # Login/register endpoints
│   │   │   ├── shopping.js    # Shopping list endpoints
│   │   │   ├── suggestions.js # Smart suggestions
│   │   │   └── inventory.js   # Inventory management
│   │   └── server.js          # Main server file
│   ├── Dockerfile             # Backend container config
│   └── package.json           # Backend dependencies
│
├── frontend/                   # React frontend
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── ItemList.js    # Shopping list items
│   │   │   ├── SmartSuggestions.js
│   │   │   └── InventoryPanel.js
│   │   ├── context/
│   │   │   └── AuthContext.js # Authentication state
│   │   ├── pages/
│   │   │   ├── Login.js       # Login page
│   │   │   ├── Register.js    # Registration page
│   │   │   └── Dashboard.js   # Main app page
│   │   ├── services/
│   │   │   └── api.js         # API client
│   │   ├── App.js             # Main app component
│   │   ├── index.js           # Entry point
│   │   └── index.css          # Global styles
│   ├── Dockerfile             # Frontend container config
│   ├── nginx.conf             # Nginx configuration
│   ├── package.json           # Frontend dependencies
│   ├── tailwind.config.js     # TailwindCSS config
│   └── postcss.config.js      # PostCSS config
│
├── docker-compose.yml          # Development Docker config
├── docker-compose.prod.yml     # Production Docker config
├── .env                        # Environment variables
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
│
├── deploy-linux.sh             # Linux deployment script
├── setup-cloudflare-tunnel.sh # Cloudflare tunnel setup
├── backup.sh                   # Database backup script
├── update.sh                   # Update script
├── monitor.sh                  # Monitoring script
├── start.ps1                   # Windows start script
├── stop.ps1                    # Windows stop script
│
├── README.md                   # Main documentation
├── DEPLOYMENT.md               # Full deployment guide
├── LINUX-QUICKSTART.md         # Quick Linux setup
└── FILES-OVERVIEW.md           # This file
```

## 📄 Key Files Explained

### Configuration Files

**`.env`**
- Contains sensitive environment variables
- Database password, JWT secret
- **IMPORTANT:** Never commit to git

**`docker-compose.yml`**
- Development configuration
- Exposes all ports for local access

**`docker-compose.prod.yml`**
- Production configuration
- Binds to localhost only (127.0.0.1)
- Includes health checks and logging

### Backend Files

**`backend/src/server.js`**
- Main Express server
- Configures middleware (CORS, Helmet, rate limiting)
- Mounts route handlers

**`backend/src/database/schema.sql`**
- Complete database schema
- 8 tables for users, items, lists, inventory, statistics
- Indexes for performance

**`backend/src/routes/shopping.js`**
- Shopping list CRUD operations
- Auto-organization by category
- Complete shopping trip with inventory updates

**`backend/src/routes/suggestions.js`**
- Smart suggestion algorithms
- Recurring item detection
- Low inventory alerts
- Search functionality

**`backend/src/routes/inventory.js`**
- Inventory tracking
- Purchase history
- Statistics and analytics

### Frontend Files

**`frontend/src/pages/Dashboard.js`**
- Main application interface
- Shopping list management
- Smart suggestions panel
- Inventory tracking panel

**`frontend/src/services/api.js`**
- Axios API client
- JWT token management
- Automatic token refresh
- Error handling

**`frontend/src/context/AuthContext.js`**
- Global authentication state
- Login/logout functions
- User session management

### Deployment Scripts

**`deploy-linux.sh`** (Linux)
- Automated deployment for Debian Bookworm 12
- Installs Docker, configures firewall
- Sets up systemd service
- Creates backup cron job

**`setup-cloudflare-tunnel.sh`** (Linux)
- Installs cloudflared
- Provides setup instructions
- Configures tunnel service

**`backup.sh`** (Linux)
- PostgreSQL database backup
- Automatic compression
- 30-day retention

**`update.sh`** (Linux)
- Pull latest code
- Rebuild containers
- Run migrations
- Zero-downtime update

**`monitor.sh`** (Linux)
- Real-time service status
- Health checks
- Resource usage
- Recent logs

**`start.ps1`** (Windows)
- Start application on Windows
- Check Docker status
- Run migrations

**`stop.ps1`** (Windows)
- Stop application on Windows

## 🚀 Deployment Workflows

### Linux Production Deployment

1. Upload files to `/opt/cloudmc-shop`
2. Run `./deploy-linux.sh`
3. Edit `.env` with secure credentials
4. Copy `docker-compose.prod.yml` to `docker-compose.yml`
5. Start: `systemctl start cloudmc-shop`
6. Setup Cloudflare tunnel: `./setup-cloudflare-tunnel.sh`

### Windows Development

1. Navigate to project directory
2. Run `.\start.ps1`
3. Access at http://localhost:3006

## 🔧 Common Tasks

### View Logs
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
```

### Database Operations
```bash
# Backup
./backup.sh

# Migrate
docker exec shop_backend npm run migrate

# Access console
docker exec -it shop_postgres psql -U shopuser -d shopdb
```

### Service Management (Linux)
```bash
systemctl start cloudmc-shop
systemctl stop cloudmc-shop
systemctl restart cloudmc-shop
systemctl status cloudmc-shop
```

### Monitoring
```bash
# Quick status
./monitor.sh

# Live monitoring
./monitor.sh -f

# Docker stats
docker stats
```

## 🔐 Security Files

**`.env`**
- Never commit to version control
- Contains all secrets
- Use strong, unique values

**`backend/src/middleware/auth.js`**
- JWT verification
- Token validation
- Protected route middleware

## 📊 Database Schema

See `backend/src/database/schema.sql` for complete schema.

**Main tables:**
- `users` - User accounts
- `profiles` - Shopping profiles
- `items` - Item catalog
- `shopping_lists` - List metadata
- `shopping_list_items` - List items
- `purchase_history` - Historical data
- `inventory` - Current stock
- `item_statistics` - Analytics

## 🌐 API Endpoints

See `README.md` for complete API documentation.

**Base URL:** `/api`

**Authentication:** Bearer token in Authorization header

## 📝 Documentation Files

- **README.md** - Main project documentation
- **DEPLOYMENT.md** - Comprehensive deployment guide
- **LINUX-QUICKSTART.md** - Fast Linux deployment
- **FILES-OVERVIEW.md** - This file

## 🛠️ Development vs Production

### Development (docker-compose.yml)
- Ports exposed to host
- Development mode
- Hot reloading (if configured)
- Verbose logging

### Production (docker-compose.prod.yml)
- Ports bound to localhost only
- Production mode
- Health checks enabled
- Log rotation configured
- Restart policies

## 📦 Dependencies

### Backend
- express - Web framework
- pg - PostgreSQL client
- bcryptjs - Password hashing
- jsonwebtoken - JWT authentication
- helmet - Security headers
- cors - CORS middleware
- express-rate-limit - Rate limiting
- express-validator - Input validation

### Frontend
- react - UI framework
- react-router-dom - Routing
- axios - HTTP client
- tailwindcss - Styling
- lucide-react - Icons
- date-fns - Date formatting

## 🔄 Update Process

1. Backup: `./backup.sh`
2. Pull changes: `git pull` or upload new files
3. Update: `./update.sh`
4. Verify: `./monitor.sh`

## 🆘 Troubleshooting

Check these files when debugging:
- Docker logs: `docker compose logs`
- System logs: `journalctl -xe`
- Cloudflare logs: `journalctl -u cloudflared`
- Application logs: `docker compose logs -f backend`
