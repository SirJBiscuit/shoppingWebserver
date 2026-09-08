#!/bin/bash

echo "=== Fixing Feature Flags & Inventory System ==="
echo ""

echo "Step 1: Checking if feature_flags table exists..."
TABLE_EXISTS=$(docker exec shop_postgres psql -U shopuser -d shopdb -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'feature_flags');")

if [ "$TABLE_EXISTS" = "t" ]; then
    echo "✓ feature_flags table exists"
else
    echo "✗ feature_flags table does NOT exist"
    echo "  Running migration 020_feature_flags.sql..."
    docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/020_feature_flags.sql
    echo "✓ Created feature_flags table"
fi

echo ""
echo "Step 2: Running feature flags migration..."
docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/029_add_feature_flags.sql
echo "✓ Feature flags updated"

echo ""
echo "Step 3: Checking if inventory_history table exists..."
HISTORY_EXISTS=$(docker exec shop_postgres psql -U shopuser -d shopdb -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'inventory_history');")

if [ "$HISTORY_EXISTS" = "t" ]; then
    echo "✓ inventory_history table exists"
else
    echo "✗ inventory_history table does NOT exist"
    echo "  Running migration 030_fix_inventory_history_columns.sql..."
    docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/030_fix_inventory_history_columns.sql
    echo "✓ Created inventory_history table"
fi

echo ""
echo "Step 4: Verifying features..."
FEATURE_COUNT=$(docker exec shop_postgres psql -U shopuser -d shopdb -tAc "SELECT COUNT(*) FROM feature_flags;")
echo "✓ Found $FEATURE_COUNT features in database"

echo ""
echo "Step 5: Listing all features..."
docker exec shop_postgres psql -U shopuser -d shopdb -c "SELECT feature_key, feature_name, is_enabled, min_tier FROM feature_flags ORDER BY feature_key;"

echo ""
echo "=== Fix Complete ==="
echo "You can now refresh the Feature Management page in your browser."
echo "Inventory delete should also work now!"
