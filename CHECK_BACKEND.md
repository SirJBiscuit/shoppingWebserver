# Backend Diagnostic Commands

Run these on the server to diagnose the backend crash:

## 1. Check Backend Logs
```bash
cd /opt/cloudmc-shop
docker-compose logs backend --tail=100
```

Look for:
- Database connection errors
- Missing table errors
- SQL syntax errors
- Port conflicts

## 2. Check Backend Status
```bash
docker-compose ps
docker-compose logs backend --tail=50 | grep -E "(error|Error|failed|Failed|500|404)"
```

## 3. Restart Backend
```bash
docker-compose restart backend
docker-compose logs -f backend
```

## 4. Check Database Connection
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT COUNT(*) FROM shopping_lists;"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\dt"
```

## 5. Common Issues

### Issue: "relation does not exist"
**Fix:** Run database migrations
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/fix_missing_columns.sql
```

### Issue: "column does not exist"
**Fix:** Check FIX_ALL_BUGS.sql was applied
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb < FIX_ALL_BUGS.sql
```

### Issue: MDL routes 404
**Likely:** Backend didn't load MDL routes
**Check:** `backend/routes/mdl.js` exists and is registered in `backend/server.js`

### Issue: Shopping lists 500 error
**Likely:** Database table missing or column missing
**Check:** 
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_lists"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_list_items"
```

## 6. Full Backend Restart
```bash
docker-compose down
docker-compose up -d
docker-compose logs -f backend
```

## Expected Output

**Healthy backend logs:**
```
shop_backend  | Server running on port 5000
shop_backend  | Database connected successfully
shop_backend  | ✓ All routes loaded
```

**Unhealthy backend logs:**
```
shop_backend  | Error: connect ECONNREFUSED
shop_backend  | Error: relation "shopping_lists" does not exist
shop_backend  | Error: column "store_name" does not exist
```

## Quick Fix Script

If backend keeps crashing, run this:
```bash
cd /opt/cloudmc-shop
docker-compose down
docker-compose up -d postgres
sleep 5
docker exec -i shop_postgres psql -U shopuser -d shopdb < FIX_ALL_BUGS.sql
docker-compose up -d backend
docker-compose logs -f backend
```
