#!/bin/bash

# Check if preferred_icon column exists in items table

echo "🔍 Checking database schema for items table..."
echo ""

docker exec -it shop_postgres psql -U shopuser -d shopdb -c "\d items"

echo ""
echo "✅ If you see 'preferred_icon' in the list above, the column exists."
echo "❌ If not, run the migration manually:"
echo ""
echo "docker cp backend/migrations/009_add_item_icon_column.sql shop_postgres:/tmp/"
echo "docker exec -it shop_postgres psql -U shopuser -d shopdb -f /tmp/009_add_item_icon_column.sql"
echo "docker restart shop_backend"
