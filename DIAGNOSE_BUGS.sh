#!/bin/bash

# Bug Diagnostic Script for CloudMC Shop
# Run this on the server to diagnose all critical issues

echo "=========================================="
echo "CloudMC Shop - Bug Diagnostic Script"
echo "=========================================="
echo ""

cd /opt/cloudmc-shop

echo "1. Checking Backend Status..."
echo "----------------------------------------"
docker-compose ps backend
echo ""

echo "2. Checking Recent Backend Errors..."
echo "----------------------------------------"
docker-compose logs backend --tail=100 | grep -E "(error|Error|ERROR|failed|Failed|FAILED|500|404)" | tail -20
echo ""

echo "3. Checking Database Connection..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT version();"
echo ""

echo "4. Checking shopping_list_items Schema..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_list_items"
echo ""

echo "5. Checking for item_icon column..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'shopping_list_items' AND column_name = 'item_icon';"
echo ""

echo "6. Checking pantry_inventory table..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d pantry_inventory"
echo ""

echo "7. Checking inventory table (Home Inventory)..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d inventory"
echo ""

echo "8. Checking beta_codes table..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d beta_codes"
echo ""

echo "9. Checking AVE tables..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\dt ave_*"
echo ""

echo "10. Checking MDL tables..."
echo "----------------------------------------"
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\dt mdl_*"
echo ""

echo "11. Recent Pantry API Calls..."
echo "----------------------------------------"
docker-compose logs backend --tail=200 | grep -i "pantry" | tail -10
echo ""

echo "12. Recent Shopping List API Calls..."
echo "----------------------------------------"
docker-compose logs backend --tail=200 | grep -i "shopping.*list" | tail -10
echo ""

echo "13. Recent Beta API Calls..."
echo "----------------------------------------"
docker-compose logs backend --tail=200 | grep -i "beta" | tail -10
echo ""

echo "=========================================="
echo "Diagnostic Complete!"
echo "=========================================="
echo ""
echo "Next Steps:"
echo "1. Review the output above for errors"
echo "2. Check if tables exist"
echo "3. Run fix scripts if needed"
echo ""
