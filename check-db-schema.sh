#!/bin/bash

# Check if preferred_icon column exists in items table

echo "🔍 Checking database schema for items table..."
echo ""

docker exec -it shop_postgres psql -U postgres -d shopping_app -c "\d items"

echo ""
echo "✅ If you see 'preferred_icon' in the list above, the column exists."
echo "❌ If not, run the migration manually:"
echo ""
echo "docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/migration.sql"
