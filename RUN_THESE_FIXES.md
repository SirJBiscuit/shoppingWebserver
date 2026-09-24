# 🔧 Database Fixes - Copy and Paste These Commands

## Run these in your SSH terminal (root@cup2cup:/opt/cloudmc-shop#)

### Fix 1: Add missing pantry_inventory columns
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb <<EOF
ALTER TABLE pantry_inventory 
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS storage_location VARCHAR(50) DEFAULT 'pantry',
ADD COLUMN IF NOT EXISTS profile_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_pantry_user_item ON pantry_inventory(user_id, item_name);
CREATE INDEX IF NOT EXISTS idx_pantry_expiry ON pantry_inventory(expiry_date) WHERE expiry_date IS NOT NULL;

SELECT 'Pantry columns added!' AS status;
EOF
```

### Fix 2: Add missing shopping_list_recipes.is_completed column
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "ALTER TABLE shopping_list_recipes ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT FALSE;"
```

### Fix 3: Verify the fixes
```bash
# Check pantry_inventory columns
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d pantry_inventory"

# Check shopping_list_recipes columns
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_list_recipes"
```

### Fix 4: Restart backend to clear any cached errors
```bash
docker-compose restart backend
```

### Fix 5: Watch logs to confirm no more errors
```bash
docker-compose logs -f backend
```

---

## What These Fixes Do:

✅ **Pantry will load** - Added missing columns (barcode, image_url, source, storage_location, profile_id)
✅ **Recipes won't error** - Added is_completed column to shopping_list_recipes
✅ **Add items will work** - item_icon column already exists

## After Running These:

1. Refresh your browser
2. Try adding an item to your shopping list
3. Navigate to Pantry (/pantry) and verify it loads
4. Check browser console for any remaining errors

## If you still see errors:

Paste the new error messages and I'll fix them immediately!
