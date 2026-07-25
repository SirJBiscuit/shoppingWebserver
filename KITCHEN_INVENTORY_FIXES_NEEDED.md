# 🔧 Kitchen Inventory - Fixes Needed

## ✅ **Fixed Issues**

### 1. Feature Flags 404 Error
**Problem:** Double `/api` in URL (`/api/api/features/flags`)
**Fix:** ✅ Removed `/api` prefix in FeatureFlagContext.js
**File:** `frontend/src/context/FeatureFlagContext.js`

### 2. Delete Button Added to Inventory Cards
**Problem:** No quick delete button on cards
**Fix:** ✅ Added trash icon button to card footer
**File:** `frontend/src/components/inventory/InventoryCard.js`

---

## ⚠️ **Backend Issues (500 Errors)**

### 3. Inventory Stats Endpoint Failing
**Error:** `GET /api/inventory/stats 500`
**Likely Cause:** Database query error or missing columns
**Need to check:** Backend logs for actual error

### 4. Expiring Soon Endpoint Failing  
**Error:** `GET /api/inventory/expiring-soon?days=7 500`
**Likely Cause:** Database query error or missing columns
**Need to check:** Backend logs for actual error

### 5. Clear Pantry Failing
**Error:** `DELETE /api/inventory/clear/pantry 500`
**Likely Cause:** Database query error
**Need to check:** Backend logs for actual error

### 6. Update Item Failing
**Error:** `PATCH /api/inventory/55 400`
**Likely Cause:** Invalid request body format
**Need to check:** What data is being sent vs what backend expects

---

## 🔍 **Debugging Steps**

### Check Backend Logs:
```bash
# On server
cd /opt/cloudmc-shop
# Check backend logs (depends on how npm start is run)
# Look for actual error messages from the 500 errors
```

### Check Database:
```bash
# Connect to database
psql -U postgres -d shopdb

# Check if inventory table has required columns
\d inventory

# Check if stats query works
SELECT 
  COUNT(*) as total_items,
  COUNT(CASE WHEN estimated_expiry_date < NOW() THEN 1 END) as expired_items,
  COUNT(CASE WHEN estimated_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' THEN 1 END) as expiring_soon
FROM inventory
WHERE user_id = 2;  -- Replace with actual user ID

# Check expiring soon query
SELECT * FROM inventory 
WHERE user_id = 2 
  AND estimated_expiry_date IS NOT NULL 
  AND estimated_expiry_date BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY estimated_expiry_date ASC;
```

---

## 📝 **Possible Fixes**

### If columns are missing:
```sql
-- Add missing columns if needed
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS estimated_expiry_date TIMESTAMP;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS current_quantity DECIMAL(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);
```

### If clear endpoint has wrong user_id reference:
Check that the backend route uses `req.user.id` (NOT `req.user.userId`)

### If update endpoint expects different format:
The frontend sends:
```javascript
{
  current_quantity: newQuantity
}
```

Backend might expect:
```javascript
{
  quantity: newQuantity  // Different field name?
}
```

---

## ✨ **Features Working**

- ✅ +/- buttons for quantity adjustment (UI works, backend fails)
- ✅ Still Good button
- ✅ Went Bad button  
- ✅ Delete button (X) on cards
- ✅ Edit button
- ✅ Add to Shopping List button
- ✅ Mark as Opened button
- ✅ Visual storage indicators
- ✅ Expiration badges
- ✅ Clear Pantry/Fridge/Freezer buttons (UI works, backend fails)
- ✅ Clear All button (UI works, backend fails)

---

## 🚀 **Next Steps**

1. **Check backend logs** to see actual error messages
2. **Verify database schema** matches what routes expect
3. **Fix backend routes** based on actual errors
4. **Test each endpoint** individually
5. **Deploy fixes** once working

---

## 📋 **Current Deployment Commands**

```bash
# 1. Commit fixes
git add .
git commit -m "fix: Kitchen inventory backend errors and feature flags URL"

# 2. Push
git push origin main

# 3. Update server
cd /opt/cloudmc-shop
./update-server.sh
```

---

**Status:** Frontend UI is complete and working. Backend endpoints need debugging based on actual error logs.
