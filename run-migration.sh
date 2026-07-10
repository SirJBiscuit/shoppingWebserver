#!/bin/bash

echo "🗄️  Running Cosmetics System Database Migration..."
echo ""

# Copy SQL file to container
echo "Copying migration file to database container..."
docker cp /opt/cloudmc-shop/backend/migrations/add_cosmetics_system.sql shop_postgres:/tmp/

# Run migration
echo "Running migration..."
docker exec -it shop_postgres psql -U postgres -d shopping_app -f /tmp/add_cosmetics_system.sql

# Check if successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "New tables created:"
    echo "  - icons"
    echo "  - user_icons"
    echo "  - user_xp_transactions"
    echo "  - cart_skins"
    echo "  - color_themes"
    echo "  - note_styles"
    echo "  - border_styles"
    echo "  - background_patterns"
    echo "  - check_animations"
    echo "  - loot_box_types"
    echo "  - user_customization"
    echo ""
else
    echo ""
    echo "❌ Migration failed! Check the error above."
    echo ""
fi
