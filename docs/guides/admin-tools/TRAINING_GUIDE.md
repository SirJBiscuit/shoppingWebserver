# Admin Training Guide - Shopping App

## Table of Contents
1. [Price Learning System](#price-learning-system)
2. [User Management](#user-management)
3. [Store Management](#store-management)
4. [Analytics & Reports](#analytics--reports)
5. [Feature Flags](#feature-flags)
6. [Phase 1 Completion Checklist](#phase-1-completion-checklist)

---

## Price Learning System

### How It Works
The app learns from user price entries to provide smart price suggestions and detect outliers. The system has three stages:
1. **Collection**: Users enter prices in the app (auto-saved after 3s or when checking off items)
2. **Training**: Admin reviews and validates price data
3. **Deployment**: Approved data is pushed to the MDL (Master Data Layer) system

### Admin Price Training Interface

#### Accessing the Training System
```bash
# API Endpoints
GET  /api/admin/price-training/training-data      # View all training data
GET  /api/admin/price-training/items-summary      # Get item statistics
GET  /api/admin/price-training/item/:name/history # Item price history
POST /api/admin/price-training/approve-to-mdl     # Approve item to MDL
POST /api/admin/price-training/auto-approve-all   # Bulk approve items
GET  /api/admin/price-training/statistics         # System statistics
```

### Training the System

#### 1. **Price History Tracking**
- Every time a user enters a price, it's saved to `price_history` table
- System tracks: item name, price, quantity, store, user, timestamp
- Automatically calculates averages and detects outliers

#### 2. **Viewing Price Data**
```sql
-- See all price entries for an item
SELECT * FROM price_history 
WHERE item_name ILIKE '%milk%' 
ORDER BY created_at DESC;

-- See average prices per store
SELECT 
  store_name,
  item_name,
  AVG(price) as avg_price,
  COUNT(*) as entries,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM price_history
WHERE status = 'active'
GROUP BY store_name, item_name
ORDER BY item_name, avg_price;
```

#### 3. **Outlier Detection**
- System automatically flags prices that are >2 standard deviations from average
- Check outliers:
```sql
SELECT * FROM price_history 
WHERE is_outlier = true 
ORDER BY created_at DESC;
```

#### 4. **Managing Bad Data**
```sql
-- Mark a price entry as invalid
UPDATE price_history 
SET status = 'invalid', notes = 'Typo - should be $3.99 not $39.99'
WHERE id = 123;

-- Delete spam entries
DELETE FROM price_history 
WHERE user_id = (SELECT id FROM users WHERE email = 'spammer@example.com');
```

#### 5. **Price Views (Pre-built Analytics)**

**User Average Prices:**
```sql
SELECT * FROM user_avg_prices 
WHERE user_id = 1 
ORDER BY item_name;
```

**Store Average Prices:**
```sql
SELECT * FROM store_avg_prices 
WHERE store_name = 'Walmart' 
ORDER BY avg_price DESC;
```

**Recent Price Trends:**
```sql
SELECT * FROM recent_price_trends 
WHERE item_name ILIKE '%bread%'
ORDER BY created_at DESC 
LIMIT 20;
```

### Admin Training Workflow

#### Step 1: View All Training Data
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3007/api/admin/price-training/training-data?limit=100"
```

This shows all price entries with:
- User who entered it
- Average price for that item
- Total entries
- Standard deviation
- Outlier status

#### Step 2: Review Items Summary
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3007/api/admin/price-training/items-summary?sort=entry_count&order=DESC"
```

Shows each unique item with:
- Entry count (how many times users entered prices)
- Average, min, max prices
- Number of stores
- Number of users who contributed
- Outlier and invalid counts

#### Step 3: Review Specific Item
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3007/api/admin/price-training/item/Milk%201%20Gallon/history"
```

See all price entries for a specific item to identify patterns.

#### Step 4: Clean Bad Data
```bash
# Mark a single entry as invalid
curl -X PATCH -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"invalid","notes":"Typo - user meant $3.99"}' \
  "http://localhost:3007/api/admin/price-training/entry/123"

# Bulk update multiple entries
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ids":[123,124,125],"status":"invalid"}' \
  "http://localhost:3007/api/admin/price-training/bulk-update"
```

#### Step 5: Approve to MDL System
```bash
# Approve single item
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"item_name":"Milk 1 Gallon"}' \
  "http://localhost:3007/api/admin/price-training/approve-to-mdl"

# Auto-approve all items with good data
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"min_samples":5,"max_stddev_percent":30}' \
  "http://localhost:3007/api/admin/price-training/auto-approve-all"
```

**Auto-Approve Criteria:**
- `min_samples`: Minimum number of price entries (default: 5)
- `max_stddev_percent`: Maximum standard deviation as % of average (default: 30%)

Items meeting these criteria are automatically pushed to MDL.

#### Step 6: Monitor Statistics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3007/api/admin/price-training/statistics"
```

Shows:
- Total entries, unique items, contributing users
- Active vs invalid entries
- Outlier count
- MDL system status

### Best Practices for Price Learning

1. **Seed Initial Data**
   - Add common items with typical prices for your area
   - Use multiple stores to build comparison data
   - Use the manual entry endpoint:
   ```bash
   curl -X POST -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"item_name":"Milk 1 Gallon","price":3.99,"store_name":"Walmart"}' \
     "http://localhost:3007/api/admin/price-training/manual-entry"
   ```
   
2. **Monitor Outliers Weekly**
   - Review flagged outliers
   - Mark invalid entries
   - Look for patterns (e.g., user always enters wrong prices)
   - Filter by outliers: `?status=active` and check `is_outlier=true`

3. **Clean Up Regularly**
   - Remove test data
   - Archive old entries (>1 year)
   - Merge duplicate item names (use SQL updates)

4. **Approve in Batches**
   - Run auto-approve weekly
   - Review items with 5+ entries
   - Manually approve items with <5 entries if data looks good

5. **Quality Control**
   - Items with high standard deviation need review
   - Check for duplicate item names with different spellings
   - Verify store names are consistent

---

## User Management

### Admin Access
- Set user as admin:
```sql
UPDATE users SET is_admin = true WHERE email = 'admin@example.com';
```

### User Tiers
- **guest**: Limited features
- **free**: Basic features
- **premium**: All features
- **enterprise**: Custom features

### Managing Users
```sql
-- View all users
SELECT id, email, username, subscription_tier, is_admin, created_at 
FROM users 
ORDER BY created_at DESC;

-- Upgrade user to premium
UPDATE users 
SET subscription_tier = 'premium', 
    subscription_status = 'active'
WHERE email = 'user@example.com';

-- Ban a user
UPDATE users 
SET subscription_status = 'banned'
WHERE id = 123;
```

---

## Store Management

### Adding Stores
```sql
INSERT INTO store_locations (
  store_name, 
  store_chain, 
  address, 
  city, 
  state, 
  zip_code,
  latitude,
  longitude,
  verified
) VALUES (
  'Walmart Supercenter',
  'Walmart',
  '123 Main St',
  'Springfield',
  'IL',
  '62701',
  39.7817,
  -89.6501,
  true
);
```

### Store Aisle Mapping
```sql
-- Add aisle layout for a store
INSERT INTO store_aisles (location_id, aisle_number, aisle_name, sort_order)
VALUES 
  (1, '1', 'Produce', 1),
  (1, '2', 'Dairy', 2),
  (1, '3', 'Meat', 3);

-- Map categories to aisles
INSERT INTO aisle_categories (aisle_id, category_name, subcategory)
VALUES 
  (1, 'Fruits', 'Fresh Produce'),
  (1, 'Vegetables', 'Fresh Produce'),
  (2, 'Milk', 'Dairy'),
  (2, 'Cheese', 'Dairy');
```

---

## Analytics & Reports

### Key Metrics Dashboard

#### 1. **User Activity**
```sql
-- Active users in last 30 days
SELECT COUNT(DISTINCT user_id) as active_users
FROM shopping_lists
WHERE created_at > NOW() - INTERVAL '30 days';

-- Items checked per day
SELECT 
  DATE(checked_at) as date,
  COUNT(*) as items_checked
FROM item_check_history
WHERE checked_at > NOW() - INTERVAL '7 days'
GROUP BY DATE(checked_at)
ORDER BY date;
```

#### 2. **Popular Items**
```sql
-- Most added items
SELECT 
  item_name,
  COUNT(*) as times_added,
  AVG(price) as avg_price
FROM shopping_list_items
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY item_name
ORDER BY times_added DESC
LIMIT 20;
```

#### 3. **Store Performance**
```sql
-- Most used stores
SELECT 
  sl.store_name,
  COUNT(DISTINCT sl.id) as list_count,
  COUNT(sli.id) as item_count,
  AVG(sli.price) as avg_item_price
FROM shopping_lists sl
JOIN shopping_list_items sli ON sl.id = sli.list_id
WHERE sl.created_at > NOW() - INTERVAL '30 days'
GROUP BY sl.store_name
ORDER BY list_count DESC;
```

#### 4. **Revenue Tracking (if applicable)**
```sql
-- Subscription revenue
SELECT 
  subscription_tier,
  COUNT(*) as user_count,
  CASE subscription_tier
    WHEN 'premium' THEN COUNT(*) * 9.99
    WHEN 'enterprise' THEN COUNT(*) * 29.99
    ELSE 0
  END as monthly_revenue
FROM users
WHERE subscription_status = 'active'
GROUP BY subscription_tier;
```

---

## Feature Flags

### Managing Features
```sql
-- View all feature flags
SELECT * FROM feature_flags ORDER BY display_order;

-- Enable a feature
UPDATE feature_flags 
SET enabled = true 
WHERE flag_name = 'recipe_suggestions';

-- Set minimum tier for a feature
UPDATE feature_flags 
SET min_tier = 'premium' 
WHERE flag_name = 'ai_price_predictions';
```

### Creating New Feature Flags
```sql
INSERT INTO feature_flags (
  flag_name,
  display_name,
  description,
  enabled,
  category,
  min_tier,
  display_order
) VALUES (
  'bulk_import',
  'Bulk Item Import',
  'Import items from CSV or other lists',
  true,
  'productivity',
  'premium',
  100
);
```

---

## Phase 1 Completion Checklist

### Core Features ✅
- [x] User authentication & registration
- [x] Shopping list creation & management
- [x] Item management (add, edit, delete, check off)
- [x] Price tracking & learning
- [x] Store selection
- [x] Aisle organization
- [x] Category detection
- [x] Icon system
- [x] XP & leveling system
- [x] Dark mode
- [x] Mobile responsive design

### Advanced Features ✅
- [x] Smart sorting by store layout
- [x] Price history & analytics
- [x] Outlier detection
- [x] "Looking for Next" suggestion system
- [x] Same-aisle item grouping
- [x] Quick price entry
- [x] Quantity management
- [x] Notes system with rich formatting
- [x] Undo functionality
- [x] Skip items
- [x] Hide items
- [x] Mark unavailable

### Admin Features ✅
- [x] Admin dashboard
- [x] User management
- [x] Store management
- [x] Feature flags
- [x] Analytics views
- [x] Price data management

### Still Needed for Phase 1 🔧

#### 1. **Bulk Operations**
- [ ] Bulk add items from template
- [ ] Bulk delete checked items
- [ ] Bulk move items between lists
- [ ] Export list to CSV/PDF

#### 2. **Sharing & Collaboration**
- [ ] Share list with other users
- [ ] Real-time collaboration
- [ ] List permissions (view/edit)
- [ ] Activity feed

#### 3. **Notifications**
- [ ] Price drop alerts
- [ ] Item expiration reminders
- [ ] Shared list updates
- [ ] Weekly summary emails

#### 4. **Search & Filters**
- [ ] Global item search
- [ ] Filter by category
- [ ] Filter by store
- [ ] Filter by price range
- [ ] Sort options (price, name, aisle)

#### 5. **Reports & Exports**
- [ ] Spending reports by category
- [ ] Spending reports by store
- [ ] Price comparison charts
- [ ] Monthly/yearly summaries
- [ ] Export to Excel/PDF

#### 6. **Mobile App Features**
- [ ] Barcode scanner
- [ ] Voice input for items
- [ ] Offline mode
- [ ] Push notifications
- [ ] Location-based store suggestions

#### 7. **Smart Features**
- [ ] Recipe integration
- [ ] Meal planning
- [ ] Pantry inventory
- [ ] Auto-suggest based on history
- [ ] Seasonal item suggestions

#### 8. **Settings & Preferences**
- [ ] Default store selection
- [ ] Default sort order
- [ ] Currency settings
- [ ] Language selection
- [ ] Privacy controls

---

## Quick Reference Commands

### Database Access
```bash
# Connect to database
docker exec -it shop_postgres psql -U postgres -d shopping_app

# Backup database
docker exec shop_postgres pg_dump -U postgres shopping_app > backup.sql

# Restore database
docker exec -i shop_postgres psql -U postgres shopping_app < backup.sql
```

### Application Logs
```bash
# View backend logs
docker logs shop_backend -f

# View frontend logs
docker logs shop_frontend -f

# View all logs
docker compose logs -f
```

### Deployment
```bash
# Update production
./update-server.sh

# Check status
./monitor.sh

# Restart services
docker compose restart
```

---

## Support & Troubleshooting

### Common Issues

**Users can't log in:**
- Check if email is verified
- Reset password via admin
- Check subscription status

**Prices not learning:**
- Verify price_history table has entries
- Check for outliers being marked
- Ensure user_id is set correctly

**Slow performance:**
- Check database indexes
- Review slow query log
- Optimize materialized views

### Getting Help
- Check logs first
- Review database for data issues
- Test in development environment
- Contact support with error details

---

## Next Steps

1. **Complete Phase 1 Features** (see checklist above)
2. **User Testing** - Get feedback from real users
3. **Performance Optimization** - Profile and optimize slow queries
4. **Security Audit** - Review authentication, authorization, data validation
5. **Documentation** - User guides, API docs, deployment guides
6. **Phase 2 Planning** - Advanced features, integrations, mobile app

---

*Last Updated: September 11, 2026*
