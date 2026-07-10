# 🖥️ SERVER DEPLOYMENT COMMANDS

## Quick Reference - Copy & Paste These

### **FULL DEPLOYMENT (Run on Server)**

```bash
# SSH into server
ssh root@your-server

# Navigate to project
cd /opt/cloudmc-shop

# Pull latest code
git pull origin main

# Install backend dependencies
cd backend && npm install multer && cd ..

# Install frontend dependencies  
cd frontend && npm install lucide-react && cd ..

# Create icons directory
mkdir -p backend/public/icons && chmod 755 backend/public/icons

# Run database migration
docker cp backend/migrations/add_cosmetics_system.sql shop_postgres:/tmp/
docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/add_cosmetics_system.sql

# Rebuild and restart
./update-server.sh
```

---

## **ONE-LINE DEPLOYMENT**

Copy this entire command and paste into your server terminal:

```bash
cd /opt/cloudmc-shop && git pull origin main && cd backend && npm install multer && cd ../frontend && npm install lucide-react && cd .. && mkdir -p backend/public/icons && chmod 755 backend/public/icons && docker cp backend/migrations/add_cosmetics_system.sql shop_postgres:/tmp/ && docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/add_cosmetics_system.sql && ./update-server.sh
```

---

## **VERIFICATION COMMANDS**

```bash
# Check containers are healthy
docker ps | grep shop

# Check backend logs
docker logs shop_backend --tail 50

# Check frontend logs
docker logs shop_frontend --tail 50

# Test backend API
curl http://localhost:3007/api/health

# Check database tables
docker exec -it shop_postgres psql -U postgres -d shopping_app -c "\dt" | grep icons
```

---

## **TROUBLESHOOTING**

```bash
# Restart containers
docker restart shop_frontend shop_backend

# Rebuild everything
cd /opt/cloudmc-shop && ./update-server.sh

# Check database connection
docker exec -it shop_postgres psql -U postgres -d shopping_app

# View all tables
\dt

# Exit database
\q
```

---

## **WHAT TO EXPECT**

After running deployment:

1. **Git pull** - Should show ~15 files updated
2. **npm install** - Should install multer and lucide-react
3. **Database migration** - Should show lots of "CREATE TABLE" messages
4. **update-server.sh** - Should rebuild containers (2-3 minutes)
5. **Containers** - Should show (healthy) status

---

## **TEST URLS**

After deployment, test these:

- https://listzy.app (main app)
- https://listzy.app/icons (icon collection)
- https://listzy.app/customize (customization hub)
- https://listzy.app/admin/icons (admin upload panel)

---

## **QUICK ROLLBACK**

If something breaks:

```bash
cd /opt/cloudmc-shop
git log --oneline -5
git reset --hard <previous-commit-hash>
./update-server.sh
```

---

**Ready to deploy? Copy the ONE-LINE DEPLOYMENT command above!** 🚀
