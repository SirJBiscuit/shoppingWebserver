#!/bin/bash
# Run the store fields migration

echo "Running store fields migration..."
docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/010_add_store_fields_to_lists.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed!"
    exit 1
fi
