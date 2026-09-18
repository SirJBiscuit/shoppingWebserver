# 👁️ Admin Viewer System

## Overview
Comprehensive admin dashboard for viewing and analyzing all system data including users, items, icons, prices, and usage statistics.

## Purpose
- Monitor user activity and engagement
- View and manage all items/ingredients
- Manage icon library and assignments
- Track price data across users
- Analyze system usage and performance
- View user statistics (money saved, levels, etc.)

## Location
**Admin Sidebar → Admin Viewer** (or "Data Viewer" / "System Viewer")

---

## Features

### 1. **User Analytics Dashboard**
- User list with search/filter
- Individual user profiles
- Usage statistics per user
- Items/ingredients they use
- Money saved calculations
- Level/XP progression
- Shopping frequency
- Store preferences
- Active lists count

### 2. **Item/Ingredient Data Viewer**
- Complete catalog of all items
- Search and filter by category
- View item details (name, category, aisle, price history)
- See which users buy each item
- Price trends per item
- Most/least popular items
- Missing data indicators

### 3. **Icon Management System**
- Icon library browser
- Upload new icons
- Assign icons to items
- Bulk icon assignment
- Icon usage statistics
- Remove/replace icons
- Icon categories/tags
- Preview icons in context

### 4. **Price Data Viewer**
- All price submissions
- Price history per item
- Price comparison across stores
- User price contributions
- Outlier visualization
- Price trends over time
- Average prices by category

### 5. **System Statistics**
- Total users (active/inactive)
- Total items cataloged
- Total prices recorded
- Total lists created
- Total items checked
- System health metrics
- Database size/growth

### 6. **User Engagement Metrics**
- Daily/weekly/monthly active users
- Average items per list
- Average shopping frequency
- Feature usage statistics
- Most used features
- User retention rates
- Gamification stats (levels, XP)

---

## UI Layout Concept

```
┌─────────────────────────────────────────────────────┐
│ 👁️ Admin Viewer                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Users] [Items] [Icons] [Prices] [Stats]          │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Quick Stats                                  │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 👥 1,234 Users | 📦 5,678 Items             │  │
│  │ 🎨 890 Icons | 💰 12,345 Prices              │  │
│  │ 📋 3,456 Lists | ✓ 45,678 Items Checked     │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Recent Activity                              │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 🆕 john_doe created "Weekly Groceries"      │  │
│  │ ✓ jane_smith checked 12 items               │  │
│  │ 💰 bob_jones added price for Milk ($3.99)   │  │
│  │ 🎨 admin uploaded new icon for Bread        │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## Database Views/Queries Needed

### User Statistics View
```sql
CREATE VIEW user_statistics AS
SELECT 
  u.id,
  u.username,
  u.email,
  COUNT(DISTINCT sl.id) as total_lists,
  COUNT(DISTINCT si.id) as total_items,
  COUNT(DISTINCT CASE WHEN si.is_checked THEN si.id END) as items_checked,
  COUNT(DISTINCT ph.id) as price_contributions,
  u.xp,
  u.level,
  MAX(sl.created_at) as last_active,
  u.created_at as member_since
FROM users u
LEFT JOIN shopping_lists sl ON u.id = sl.user_id
LEFT JOIN shopping_items si ON sl.id = si.list_id
LEFT JOIN price_history ph ON u.id = ph.user_id
GROUP BY u.id;
```

### Item Popularity View
```sql
CREATE VIEW item_popularity AS
SELECT 
  item_name,
  item_icon,
  category,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as total_occurrences,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM shopping_items
GROUP BY item_name, item_icon, category
ORDER BY unique_users DESC;
```

### Icon Usage View
```sql
CREATE VIEW icon_usage AS
SELECT 
  item_icon,
  COUNT(DISTINCT item_name) as items_using,
  COUNT(*) as total_usage,
  array_agg(DISTINCT item_name) as item_names
FROM shopping_items
WHERE item_icon IS NOT NULL
GROUP BY item_icon
ORDER BY total_usage DESC;
```

---

## API Endpoints

### Users
```
GET  /api/admin/viewer/users
GET  /api/admin/viewer/users/:id
GET  /api/admin/viewer/users/:id/statistics
GET  /api/admin/viewer/users/:id/items
GET  /api/admin/viewer/users/:id/activity
GET  /api/admin/viewer/users/stats/engagement
```

### Items
```
GET  /api/admin/viewer/items
GET  /api/admin/viewer/items/:name
GET  /api/admin/viewer/items/:name/users
GET  /api/admin/viewer/items/:name/prices
GET  /api/admin/viewer/items/popular
GET  /api/admin/viewer/items/missing-data
```

### Icons
```
GET    /api/admin/viewer/icons
POST   /api/admin/viewer/icons/upload
GET    /api/admin/viewer/icons/:icon/usage
PUT    /api/admin/viewer/icons/assign
DELETE /api/admin/viewer/icons/:icon
GET    /api/admin/viewer/icons/unused
```

### Prices
```
GET  /api/admin/viewer/prices
GET  /api/admin/viewer/prices/trends
GET  /api/admin/viewer/prices/by-item/:name
GET  /api/admin/viewer/prices/by-store/:store
GET  /api/admin/viewer/prices/outliers
```

### Statistics
```
GET  /api/admin/viewer/stats/overview
GET  /api/admin/viewer/stats/users
GET  /api/admin/viewer/stats/items
GET  /api/admin/viewer/stats/engagement
GET  /api/admin/viewer/stats/growth
```

---

## Component Structure

```
frontend/src/pages/
  AdminViewer.js              # Main viewer page

frontend/src/components/admin/viewer/
  UsersTab.js                 # User list and details
  ItemsTab.js                 # Item catalog viewer
  IconsTab.js                 # Icon library manager
  PricesTab.js                # Price data viewer
  StatsTab.js                 # System statistics
  
  UserDetailCard.js           # Individual user stats
  ItemDetailCard.js           # Item information
  IconBrowser.js              # Icon library browser
  IconUploader.js             # Icon upload interface
  PriceChart.js               # Price trend visualization
  EngagementChart.js          # User engagement charts
```

---

## Features Detail

### User Viewer
**Display:**
- Username, email, join date
- Total lists, items, checks
- XP, level, badges
- Last active date
- Price contributions
- Money saved estimate
- Favorite items
- Shopping patterns

**Actions:**
- View user profile
- See user's lists
- View user's price history
- Export user data
- Send notification (future)

### Item Viewer
**Display:**
- Item name and icon
- Category and aisle
- Number of users who buy it
- Average price
- Price range (min/max)
- Last price update
- Data quality score

**Actions:**
- Edit item details
- Assign/change icon
- View price history
- See which users buy it
- Merge duplicate items
- Delete item

### Icon Manager
**Display:**
- Icon preview (large)
- Icon name/emoji
- Number of items using it
- Upload date
- File size (if image)

**Actions:**
- Upload new icon
- Assign to item(s)
- Bulk assign
- Replace icon
- Delete unused icons
- Download icon
- Preview in context

### Price Viewer
**Display:**
- Item name
- Price amount
- Quantity and unit
- Store name
- User who submitted
- Date submitted
- Status (approved/pending/rejected)

**Actions:**
- Filter by date range
- Filter by store
- Filter by user
- Sort by price
- Export to CSV
- View trends chart

---

## Money Saved Calculation

```javascript
// Calculate money saved for a user
function calculateMoneySaved(userId) {
  // Compare user's prices vs average prices
  const userPrices = getUserPrices(userId);
  const avgPrices = getAveragePrices();
  
  let totalSaved = 0;
  
  userPrices.forEach(purchase => {
    const avgPrice = avgPrices[purchase.item_name];
    if (avgPrice && purchase.price < avgPrice) {
      totalSaved += (avgPrice - purchase.price) * purchase.quantity;
    }
  });
  
  return totalSaved;
}
```

---

## Implementation Priority

**FUTURE - After Phase 1-3 Complete**

This system is planned for later implementation after:
- Admin Training System (Phase 1)
- MDL Product Management (Phase 2)
- Data Quality Dashboard (Phase 3)

**Estimated Timeline:** Week 6-8
**Estimated Time:** 12-16 hours

---

## Integration Points

### With Admin Training System
- View prices pending review
- Quick access to user contributions
- Link to training interface

### With MDL System
- View product master data
- See icon assignments
- Access category data

### With Data Quality
- View quality issues
- See outliers
- Access cleanup tools

---

## Success Metrics

- **Visibility**: Admin can view any data point in <3 clicks
- **Performance**: Pages load in <2 seconds
- **Insights**: Actionable data for decision making
- **Usability**: Intuitive navigation and search
- **Export**: All data exportable to CSV/JSON

---

## Future Enhancements

- **Real-time Dashboard**: Live updates with WebSockets
- **Advanced Analytics**: ML-powered insights
- **User Notifications**: Contact users from viewer
- **Bulk Operations**: Mass edit/delete/assign
- **Custom Reports**: Build and save custom queries
- **Data Export**: Scheduled exports and backups
- **Audit Log**: Track all admin actions
- **Permissions**: Granular view/edit permissions

---

## Notes

- Read-only by default (view mode)
- Edit actions require confirmation
- All actions logged for audit trail
- Optimized queries for large datasets
- Pagination for large lists
- Export limits to prevent abuse
- Cache frequently accessed data

---

**Status:** Planned for Future Implementation
**Dependencies:** Admin Training System, MDL System
**Priority:** Medium (after core features)
