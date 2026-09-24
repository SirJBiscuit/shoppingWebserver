# Bug Fix Commands - Run These in Order

## Step 1: Diagnose Issues

```bash
# SSH into server
ssh root@cup2cup

# Navigate to project
cd /opt/cloudmc-shop

# Run diagnostic script
chmod +x DIAGNOSE_BUGS.sh
./DIAGNOSE_BUGS.sh > diagnostic_output.txt

# View output
cat diagnostic_output.txt
```

## Step 2: Apply Database Fixes

```bash
# Run the comprehensive fix script
docker exec -i shop_postgres psql -U shopuser -d shopdb < FIX_ALL_BUGS.sql
```

## Step 3: Restart Backend

```bash
# Restart backend to apply changes
docker-compose restart backend

# Check if it started successfully
docker-compose ps backend

# View logs
docker-compose logs -f backend
```

## Step 4: Test Frontend

1. Open browser to https://shop.cloudmc.online
2. Open Developer Console (F12)
3. Try adding an item to shopping list
4. Check for errors in console
5. Try navigating to Home Inventory (/pantry-new-v2)
6. Check for errors

## Step 5: Pull Frontend Changes

```bash
# On your local machine
cd "c:/Users/Jeremiah Payne/CascadeProjects/shopWebserver"

# Commit your changes
git add .
git commit -m "Add bug fix scripts and documentation"
git push origin main

# On server
cd /opt/cloudmc-shop
git pull origin main

# Rebuild frontend
docker-compose up -d --build frontend

# Check status
docker-compose ps
```

## Quick Reference Commands

### View Backend Logs
```bash
docker-compose logs -f backend
```

### View Frontend Logs
```bash
docker-compose logs -f frontend
```

### Check Database Tables
```bash
docker exec -it shop_postgres psql -U shopuser -d shopdb
\dt
\q
```

### Restart Everything
```bash
docker-compose restart
```

### Rebuild Everything
```bash
docker-compose down
docker-compose up -d --build
```

## Expected Results

After running these fixes:

✅ **Add Item** - Should work without black screen
✅ **Home Inventory** - Should load at /pantry-new-v2
✅ **AVE Tables** - Created and ready for use
✅ **Beta System** - Tables created, code generation should work
✅ **MDL/ASI** - Tables ready for aisle predictions

## If Issues Persist

1. Check `diagnostic_output.txt` for specific errors
2. Share the output with me
3. Check browser console for frontend errors
4. Check backend logs for API errors

## Next Steps After Fixes

1. Fix AVE editing tools (Settings, Help, Grid, Resize)
2. Implement ASI frontend (NextItemSuggestion, MyStores)
3. Test all features
4. Deploy to production
