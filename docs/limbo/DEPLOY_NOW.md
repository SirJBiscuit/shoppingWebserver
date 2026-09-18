# 🚀 DEPLOY COSMETICS SYSTEM - STEP BY STEP

## ✅ Code Already Pushed to GitHub!

Your code is live on GitHub. Now let's deploy to your server.

---

## 📋 DEPLOYMENT STEPS

### **Step 1: SSH into Your Server**

```bash
ssh root@your-server-ip
```

### **Step 2: Pull Latest Code**

```bash
cd /opt/cloudmc-shop
git pull origin main
```

You should see:
```
Updating 2bd4f2c..6cf5347
Fast-forward
 15 files changed, 4390 insertions(+)
 create mode 100644 backend/migrations/add_cosmetics_system.sql
 create mode 100644 backend/src/routes/cosmetics.js
 create mode 100644 backend/src/routes/xp.js
 ... (more files)
```

### **Step 3: Install Dependencies**

```bash
# Backend
cd /opt/cloudmc-shop/backend
npm install multer

# Frontend
cd /opt/cloudmc-shop/frontend
npm install lucide-react
```

### **Step 4: Create Icons Directory**

```bash
mkdir -p /opt/cloudmc-shop/backend/public/icons
chmod 755 /opt/cloudmc-shop/backend/public/icons
```

### **Step 5: Run Database Migration**

```bash
# Copy migration to container
docker cp /opt/cloudmc-shop/backend/migrations/add_cosmetics_system.sql shop_postgres:/tmp/

# Run migration
docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/add_cosmetics_system.sql
```

**Expected output:**
```
CREATE TABLE
CREATE TABLE
CREATE TABLE
... (lots of CREATE TABLE statements)
INSERT 0 1
INSERT 0 1
... (seed data)
COMMIT
```

### **Step 6: Rebuild and Restart**

```bash
cd /opt/cloudmc-shop
./update-server.sh
```

Wait for containers to rebuild and restart (2-3 minutes).

---

## ✅ VERIFY DEPLOYMENT

### **1. Check Containers Are Healthy**

```bash
docker ps | grep shop
```

Should show:
```
shop_frontend   Up X minutes (healthy)
shop_backend    Up X minutes (healthy)
shop_postgres   Up X minutes (healthy)
```

### **2. Test Backend API**

```bash
# Get a token first (login)
TOKEN="your-jwt-token"

# Test XP endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3007/api/xp/progress

# Test cosmetics endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:3007/api/cosmetics/icons/admin/stats
```

### **3. Test Frontend**

Visit these URLs:
- https://listzy.app/icons
- https://listzy.app/customize
- https://listzy.app/admin/icons (admin only)

---

## 🎯 QUICK DEPLOYMENT (All-in-One)

If you want to run everything at once:

```bash
cd /opt/cloudmc-shop && \
git pull origin main && \
cd backend && npm install multer && \
cd ../frontend && npm install lucide-react && \
mkdir -p /opt/cloudmc-shop/backend/public/icons && \
docker cp /opt/cloudmc-shop/backend/migrations/add_cosmetics_system.sql shop_postgres:/tmp/ && \
docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/add_cosmetics_system.sql && \
cd /opt/cloudmc-shop && ./update-server.sh
```

---

## 🐛 TROUBLESHOOTING

### **Migration Fails**

If you get "relation already exists" errors:
```bash
# Check if tables exist
docker exec -it shop_postgres psql -U postgres -d shopping_app -c "\dt"

# If cosmetics tables exist, migration already ran
```

### **Containers Unhealthy**

```bash
# Check logs
docker logs shop_frontend --tail 50
docker logs shop_backend --tail 50

# Restart containers
docker restart shop_frontend shop_backend
```

### **404 on New Routes**

```bash
# Make sure backend restarted
docker restart shop_backend

# Check backend logs
docker logs shop_backend --tail 100
```

### **Missing Dependencies**

```bash
# Reinstall
cd /opt/cloudmc-shop/backend
npm install

cd /opt/cloudmc-shop/frontend
npm install
```

---

## 🎉 SUCCESS CHECKLIST

- [ ] Code pulled from GitHub
- [ ] Dependencies installed (multer, lucide-react)
- [ ] Icons directory created
- [ ] Database migration ran successfully
- [ ] Containers rebuilt and healthy
- [ ] Can access `/icons` page
- [ ] Can access `/customize` page
- [ ] Can access `/admin/icons` page (admin)
- [ ] Backend API responds to XP/cosmetics endpoints

---

## 📊 WHAT'S NOW LIVE

### **User Features:**
- Icon collection gallery at `/icons`
- Customization hub at `/customize`
- XP progress tracking (ready to integrate)
- Level up system (ready to integrate)

### **Admin Features:**
- Icon upload panel at `/admin/icons`
- Bulk upload with auto-parsing
- Icon management and statistics

### **API Endpoints:**
- `GET /api/xp/progress` - User XP progress
- `GET /api/xp/history` - XP transaction history
- `POST /api/xp/complete-trip` - Award XP for shopping
- `GET /api/cosmetics/icons/my-collection` - User's icons
- `GET /api/cosmetics/icons/available` - Available icons
- `POST /api/cosmetics/icons/admin/bulk-upload` - Upload icons
- `GET /api/cosmetics/themes` - Color themes
- `GET /api/cosmetics/cart-skins` - Cart skins
- And 15+ more!

---

## 🚀 NEXT STEPS

1. **Upload starter icons** via `/admin/icons`
2. **Test icon collection** at `/icons`
3. **Customize themes** at `/customize`
4. **Hook up XP** to shopping list (optional)
5. **Add navigation links** to sidebar (optional)

---

**Ready to deploy? Run the commands above on your server!** 🎉
