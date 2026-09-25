# Quick Deploy Commands

**Run these on the server to deploy latest changes:**

```bash
# 1. Pull latest code
cd /opt/cloudmc-shop
git pull origin main

# 2. Rebuild frontend (should work now!)
docker-compose up -d --build frontend

# 3. Check status
docker-compose ps

# 4. View logs
docker-compose logs -f frontend
```

## What's Fixed

✅ PantryNewV2 import paths corrected  
✅ ConfirmModal replaced with CustomNotification  
✅ Deprecated components moved to limbo folder  
✅ Database tables created (AVE, Beta, MDL, ASI)  
✅ Backend fixes applied  

## Expected Result

Frontend should build successfully and be accessible at https://shop.cloudmc.online

## If Build Fails

Check logs for missing components and let me know the error.
