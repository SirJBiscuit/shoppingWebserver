# Tier-Based Feature Access System

## Overview
Complete feature gating system with three tiers: **Guest**, **Free**, and **Premium**.

---

## Tier Hierarchy

### 🔹 Guest (Tier 0)
**Purpose:** Temporary accounts for trying the app
**Features:**
- ✅ Basic shopping lists (1 list, 20 items max)
- ❌ No animations
- ❌ No kitchen inventory
- ❌ No recipes
- ❌ No meal planner
- ❌ No statistics
- ❌ No recipe discovery
- ❌ No activity history
- ❌ No voice input
- ❌ No barcode scanner
- ❌ No share lists
- ❌ No store manager
- ❌ No premium features

**Limits:**
- `max_shopping_lists`: 1
- `max_items_per_list`: 20
- `max_pantry_items`: 0 (disabled)
- `max_recipes`: 0 (disabled)
- `max_meal_plans`: 0 (disabled)

**Data:** Temporary - can be cleaned up periodically

---

### 🔸 Free (Tier 1)
**Purpose:** Full-featured free tier for regular users
**Features:**
- ✅ Shopping lists (5 lists, 50 items each)
- ✅ Animations
- ✅ Kitchen inventory (50 items)
- ✅ Recipes (10 recipes)
- ✅ Meal planner (2 plans)
- ✅ Statistics
- ✅ Recipe discovery
- ✅ Activity history
- ✅ Voice input
- ✅ Barcode scanner
- ✅ Share lists
- ✅ Store manager
- ❌ Custom themes
- ❌ Priority support
- ❌ Export data

**Limits:**
- `max_shopping_lists`: 5
- `max_items_per_list`: 50
- `max_pantry_items`: 50
- `max_recipes`: 10
- `max_meal_plans`: 2

---

### 💎 Premium (Tier 2)
**Purpose:** Unlimited access with premium features
**Features:**
- ✅ **Everything from Free tier**
- ✅ Unlimited shopping lists
- ✅ Unlimited items per list
- ✅ Unlimited pantry items
- ✅ Unlimited recipes
- ✅ Unlimited meal plans
- ✅ Custom themes
- ✅ Priority support
- ✅ Export data
- ✅ Advanced analytics

**Limits:**
- All limits set to `-1` (unlimited)

---

## Feature Flags System

### Categories
- **core** - Essential features
- **ui** - User interface enhancements
- **kitchen** - Pantry, recipes, meal planning
- **smart** - AI-powered features
- **social** - Sharing and collaboration
- **analytics** - Statistics and insights
- **advanced** - Premium-only features
- **widgets** - Dashboard widgets

### Feature Flag Structure
```sql
feature_key VARCHAR(100)      -- Unique identifier (e.g., 'pantry', 'voice_input')
feature_name VARCHAR(255)     -- Display name
description TEXT              -- What it does
category VARCHAR(50)          -- Category (see above)
is_enabled BOOLEAN            -- Global on/off switch
min_tier VARCHAR(50)          -- Minimum tier required ('guest', 'free', 'premium')
```

### Admin Controls
Admins can:
1. **Enable/Disable features globally** - Turn features on/off for everyone
2. **Change tier requirements** - Move features between tiers
3. **Adjust limits** - Change max items, lists, etc. per tier
4. **Manage widgets** - Control dashboard widget availability

---

## Dashboard Widgets

### Available Widgets
1. **Pantry Quick View** - Shows pantry items with low stock alerts
2. **Next Item Suggestion** - AI-powered next item to buy
3. **Budget Tracker** - Current spending vs budget
4. **Quick Statistics** - Shopping insights at a glance
5. **Meal Plan Preview** - Upcoming meals this week
6. **Recent Activity** - Latest shopping activity

### Widget Management
- Each widget has a `min_tier` requirement
- Admins can enable/disable widgets
- Users can customize their own dashboard (future feature)
- Widgets have default positions

---

## Backend API

### Feature Access Endpoints

#### Get User's Features
```
GET /api/features/flags
Authorization: Bearer <token>

Response:
{
  "features": [
    {
      "key": "shopping_lists",
      "name": "Shopping Lists",
      "description": "Basic shopping list functionality",
      "category": "core",
      "minTier": "guest",
      "isAvailable": true
    },
    ...
  ],
  "userTier": "free",
  "isGuest": false
}
```

#### Get User's Limits
```
GET /api/features/limits
Authorization: Bearer <token>

Response:
{
  "tier": "free",
  "limits": {
    "max_shopping_lists": 5,
    "max_items_per_list": 50,
    "max_pantry_items": 50,
    "max_recipes": 10,
    "max_meal_plans": 2
  },
  "isGuest": false
}
```

#### Check Specific Feature
```
GET /api/features/check/:featureKey
Authorization: Bearer <token>

Response:
{
  "featureKey": "pantry",
  "isAvailable": true,
  "minTier": "free",
  "userTier": "free"
}
```

### Admin Endpoints

#### Get All Features (Admin)
```
GET /api/features/admin/all
Authorization: Bearer <admin_token>

Response:
{
  "features": [...]  // All features including disabled ones
}
```

#### Update Feature (Admin)
```
PUT /api/features/admin/feature/:id
Authorization: Bearer <admin_token>

Body:
{
  "is_enabled": true,
  "min_tier": "free"
}
```

#### Update Tier Limit (Admin)
```
PUT /api/features/admin/limit/:id
Authorization: Bearer <admin_token>

Body:
{
  "limit_value": 10,
  "description": "Updated limit"
}
```

---

## Frontend Integration

### Using Feature Flags

```javascript
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

const MyComponent = () => {
  const { features, limits, isGuest, userTier } = useFeatureFlags();

  // Check if feature is available
  const hasPantry = features.pantry?.isAvailable;

  // Check limits
  const maxLists = limits.max_shopping_lists;

  // Conditional rendering
  if (isGuest) {
    return <GuestView />;
  }

  return (
    <div>
      {hasPantry && <PantryWidget />}
      {userTier === 'premium' && <PremiumFeature />}
    </div>
  );
};
```

### Feature Access Middleware (Backend)

```javascript
const { requireFeature } = require('../middleware/featureAccess');

// Protect route with feature requirement
router.get('/pantry', auth, requireFeature('pantry'), async (req, res) => {
  // Only accessible if user has 'pantry' feature
});
```

---

## Migration & Setup

### 1. Run Migration
```bash
docker cp backend/migrations/021_guest_tier_and_widgets.sql shop_postgres:/tmp/
docker exec -it shop_postgres psql -U shopuser -d shopdb -f /tmp/021_guest_tier_and_widgets.sql
```

### 2. Restart Backend
```bash
docker restart shop_backend
```

### 3. Access Admin Panel
1. Go to `/admin`
2. Click **"Feature Management"** tab
3. Manage features and limits

---

## Guest Account Cleanup

### Automatic Cleanup (Recommended)
Add a cron job to delete old guest accounts:

```sql
-- Delete guest accounts older than 7 days
DELETE FROM users 
WHERE is_guest = true 
  AND created_at < NOW() - INTERVAL '7 days';
```

### Manual Cleanup
```sql
-- View all guest accounts
SELECT id, username, created_at 
FROM users 
WHERE is_guest = true 
ORDER BY created_at DESC;

-- Delete specific guest
DELETE FROM users WHERE id = <guest_id>;
```

---

## Testing

### Test Guest Account
1. Go to `/login`
2. Click "Continue as Guest"
3. Verify limited features:
   - Only 1 shopping list
   - Max 20 items
   - No sidebar features (pantry, recipes, etc.)
   - No animations

### Test Feature Flags
1. Log in as admin
2. Go to Admin → Feature Management
3. Disable a feature (e.g., "Voice Input")
4. Log in as free user
5. Verify feature is hidden

### Test Tier Limits
1. Create free user
2. Try to create 6th shopping list
3. Should show error: "Maximum shopping lists reached"

---

## Best Practices

1. **Always check feature availability** before rendering UI
2. **Use middleware** to protect backend routes
3. **Show upgrade prompts** when users hit limits
4. **Clean up guest accounts** regularly
5. **Test each tier** thoroughly before deploying
6. **Document feature changes** when moving between tiers

---

## Future Enhancements

- [ ] User-customizable dashboard layouts
- [ ] A/B testing for features
- [ ] Feature usage analytics
- [ ] Gradual rollouts (enable for % of users)
- [ ] Time-limited feature trials
- [ ] Custom tier creation
- [ ] Feature bundles

---

## Troubleshooting

### Feature not showing for free users
1. Check `is_enabled` in `feature_flags` table
2. Check `min_tier` - should be 'guest' or 'free'
3. Verify user's `subscription_tier` column

### Guest can access premium features
1. Check `is_guest` column in users table
2. Verify feature's `min_tier` is not 'guest'
3. Check frontend feature flag context

### Limits not enforced
1. Verify tier_limits table has correct values
2. Check backend validation in routes
3. Ensure frontend checks limits before API calls

---

**For questions or issues, check the Feature Management tab in Admin panel!**
