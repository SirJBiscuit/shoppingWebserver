#!/bin/bash

echo "=== Checking Feature Flags Table ==="
echo ""

echo "1. Checking if feature_flags table exists..."
docker exec -it shop_postgres psql -U shopuser -d shopdb -c "\dt feature_flags"

echo ""
echo "2. Counting features in table..."
docker exec -it shop_postgres psql -U shopuser -d shopdb -c "SELECT COUNT(*) FROM feature_flags;"

echo ""
echo "3. Listing all features..."
docker exec -it shop_postgres psql -U shopuser -d shopdb -c "SELECT feature_key, feature_name, is_enabled, min_tier FROM feature_flags ORDER BY feature_key;"

echo ""
echo "4. Checking table structure..."
docker exec -it shop_postgres psql -U shopuser -d shopdb -c "\d feature_flags"

echo ""
echo "=== Done ==="
