# 🚀 Phase 1 Deployment Guide - Admin Training System

## What's New

### Backend
- ✅ `price_history` table with indexes and views
- ✅ Admin training API routes (`/api/admin/training/*`)
- ✅ Outlier detection algorithm
- ✅ Price approval/rejection workflow

### Frontend
- ✅ Admin Training page (`/admin/training`)
- ✅ Price review interface
- ✅ Sidebar integration (admin-only)

---

## Deployment Steps

### On Production Server

```bash
cd /opt/cloudmc-shop
./update-server.sh
```

**That's it!** The script will automatically:
1. Pull latest code from GitHub
2. Rebuild Docker containers
3. **Run `create_price_history.sql` migration automatically**
4. Start all services

---

## Verification

### 1. Check Migration Ran Successfully

```bash
docker exec -it shop_postgres psql -U shopuser -d shopdb -c "\d price_history"
```

You should see the table structure.

### 2. Check Backend Routes

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  http://localhost:3007/api/admin/training/prices/stats
```

Should return price statistics.

### 3. Check Frontend

1. Login as admin user
2. Look for "Training System" in sidebar (purple gradient button)
3. Click to access `/admin/training`
4. Should see stats dashboard

---

## Testing the System

### Add Test Price Data

```sql
-- Connect to database
docker exec -it shop_postgres psql -U shopuser -d shopdb

-- Insert test price
INSERT INTO price_history (
  user_id, item_name, item_icon, category, store_name,
  price, quantity, unit, status
) VALUES (
  1, 'Milk', '🥛', 'Dairy', 'Walmart',
  3.99, 1, 'gallon', 'pending'
);

-- Insert outlier price
INSERT INTO price_history (
  user_id, item_name, item_icon, category, store_name,
  price, quantity, unit, status, is_outlier, outlier_score
) VALUES (
  1, 'Milk', '🥛', 'Dairy', 'Target',
  15.99, 1, 'gallon', 'pending', true, 75.5
);

-- Check data
SELECT * FROM price_history;
```

### Test Workflow

1. **View Pending**: Should see test prices
2. **Run Outlier Detection**: Click button, should detect outliers
3. **Approve Price**: Click approve, status should change
4. **Reject Price**: Click reject, enter reason
5. **Edit Price**: Click edit, modify values
6. **View Stats**: Stats should update after actions

---

## Troubleshooting

### Migration Didn't Run

```bash
# Manually run migration
docker cp backend/migrations/create_price_history.sql shop_postgres:/tmp/
docker exec -it shop_postgres psql -U shopuser -d shopdb -f /tmp/create_price_history.sql
```

### Routes Not Working

```bash
# Check backend logs
docker compose logs backend | grep training

# Restart backend
docker compose restart backend
```

### Frontend Not Showing

1. Clear browser cache (Ctrl+Shift+R)
2. Check if user is admin: `SELECT * FROM users WHERE id = YOUR_ID;`
3. Check console for errors (F12)

---

## Rollback (If Needed)

```bash
cd /opt/cloudmc-shop

# Revert to previous commit
git reset --hard HEAD~1

# Rebuild
docker compose down
docker compose up -d --build

# Drop price_history table if needed
docker exec -it shop_postgres psql -U shopuser -d shopdb -c "DROP TABLE IF EXISTS price_history CASCADE;"
```

---

## Next Steps

After successful deployment:

1. ✅ Test with real user price submissions
2. ✅ Monitor outlier detection accuracy
3. ✅ Gather admin feedback on workflow
4. 🔜 Begin Phase 2: Product Management
5. 🔜 Begin Phase 3: Data Quality Dashboard

---

## Notes

- Migration is idempotent (safe to run multiple times)
- Uses `IF NOT EXISTS` and `CREATE OR REPLACE` for safety
- All admin actions are logged (reviewed_by, reviewed_at)
- Outlier detection can be run manually or scheduled

---

**Deployment Date:** Sep 11, 2026  
**Version:** Phase 1 - Admin Training System  
**Commit:** 39c6a1d
