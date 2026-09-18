# Feature Flags & Admin Management Guide

## Overview

The feature flag system allows admins to easily enable/disable features for free and premium users without code changes. Features are simply hidden from users who don't have access.

## Key Features

✅ **Admin Dashboard** - Toggle features on/off with one click
✅ **Tier Control** - Enable/disable features per tier (free/premium)
✅ **Dynamic Limits** - Adjust limits without code changes
✅ **Auto-Hide** - Features automatically hidden from unauthorized users
✅ **Real-time Updates** - Changes take effect immediately

---

## Database Tables

### `feature_flags`
Stores all feature definitions and their availability per tier.

**Columns:**
- `feature_key` - Unique identifier (e.g., 'meal_planning')
- `feature_name` - Display name (e.g., 'Meal Planning')
- `description` - Feature description
- `category` - 'core', 'premium', or 'experimental'
- `is_enabled` - Master toggle (disables for everyone if false)
- `free_tier_enabled` - Available to free users
- `premium_tier_enabled` - Available to premium users
- `requires_premium` - Shows upgrade prompt if user is free
- `icon` - Emoji icon for display
- `display_order` - Sort order

### `tier_limits`
Configurable limits for free and premium tiers.

**Columns:**
- `tier_name` - 'free' or 'premium'
- `limit_key` - Limit identifier (e.g., 'max_lists')
- `limit_value` - Numeric limit
- `description` - Limit description

---

## Admin Interface

### Accessing Feature Management

1. Log in as admin
2. Go to **Admin** page
3. Navigate to **Feature Management** tab

### Managing Features

#### Toggle Feature On/Off
- Click the toggle button (🔄) next to any feature
- Green = Enabled, Gray = Disabled
- Disabled features are hidden from ALL users

#### Enable/Disable Per Tier
- Check/uncheck **Free Tier** checkbox
- Check/uncheck **Premium Tier** checkbox
- Changes save automatically

#### Adjust Limits
- Edit the number in the limit input
- Changes save automatically
- Use `999999` for "unlimited"

### Feature Categories

**Core Features:**
- Always available to everyone
- Basic functionality (shopping lists, inventory, etc.)

**Premium Features:**
- Require subscription
- Advanced functionality (meal planning, barcode scanning, etc.)

**Experimental Features:**
- Can be toggled on/off for testing
- Available to both tiers when enabled

---

## Frontend Integration

### Using Feature Flags in Components

```javascript
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

function MyComponent() {
  const { hasFeature, isPremium, getLimit } = useFeatureFlags();

  // Check if feature is available
  if (!hasFeature('meal_planning')) {
    return <PremiumPrompt featureName="Meal Planning" />;
  }

  // Check limits
  const maxLists = getLimit('max_lists');
  if (currentLists >= maxLists) {
    return <div>Limit reached: {maxLists} lists</div>;
  }

  return <div>Feature content here</div>;
}
```

### Hiding Features

```javascript
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

function Navigation() {
  const { hasFeature } = useFeatureFlags();

  return (
    <nav>
      <Link to="/dashboard">Dashboard</Link>
      
      {/* Only show if user has access */}
      {hasFeature('meal_planning') && (
        <Link to="/meal-planner">Meal Planner</Link>
      )}
      
      {hasFeature('barcode_scanning') && (
        <Link to="/scanner">Scanner</Link>
      )}
    </nav>
  );
}
```

### Premium Prompts

```javascript
import PremiumPrompt from '../components/PremiumPrompt';
import { useFeatureFlags } from '../contexts/FeatureFlagContext';

function MealPlanner() {
  const { hasFeature } = useFeatureFlags();

  if (!hasFeature('meal_planning')) {
    return (
      <PremiumPrompt
        featureName="Meal Planning"
        description="Plan your weekly meals and automatically generate shopping lists"
        icon="📅"
      />
    );
  }

  return <div>Meal planner content</div>;
}
```

---

## Backend Integration

### Checking Features

```javascript
const { requirePremium, checkLimit } = require('../middleware/premiumCheck');

// Require premium subscription
router.get('/meal-planner', auth, requirePremium, async (req, res) => {
  // Only premium users can access
});

// Check limits before creating
router.post('/lists', auth, checkLimit('maxLists'), async (req, res) => {
  // Will return 403 if limit reached
});
```

### Manual Feature Check

```javascript
const db = require('../database/db');

async function checkFeatureAccess(userId, featureKey) {
  // Get user's tier
  const userResult = await db.query(
    'SELECT subscription_status FROM users WHERE id = $1',
    [userId]
  );
  const isPremium = userResult.rows[0]?.subscription_status === 'active';
  
  // Get feature settings
  const featureResult = await db.query(
    `SELECT free_tier_enabled, premium_tier_enabled, is_enabled
     FROM feature_flags WHERE feature_key = $1`,
    [featureKey]
  );
  
  const feature = featureResult.rows[0];
  return feature.is_enabled && (isPremium 
    ? feature.premium_tier_enabled 
    : feature.free_tier_enabled);
}
```

---

## Default Features

### Core (Free & Premium)
- 🛒 Shopping Lists
- 🏺 Kitchen Inventory
- 🏷️ Categories
- 🌙 Dark Mode
- 😊 Item Icons

### Premium Only
- ∞ Unlimited Lists
- 📦 Unlimited Inventory
- 👨‍🍳 Unlimited Recipes
- 📅 Meal Planning
- 🤖 Smart Suggestions
- 🏪 Multiple Stores
- 💰 Price Tracking
- 📷 Barcode Scanner
- 🎤 Voice Input
- 👨‍👩‍👧‍👦 Share Lists
- 📄 Export Data
- 🎯 Priority Support
- ⏰ Expiration Tracking

### Experimental (Toggleable)
- 🔗 Recipe Import
- 📋 Item Templates

---

## Default Limits

### Free Tier
- **max_lists:** 3
- **max_inventory_items:** 50
- **max_recipes:** 10
- **max_stores:** 1

### Premium Tier
- **max_lists:** 999999 (unlimited)
- **max_inventory_items:** 999999
- **max_recipes:** 999999
- **max_stores:** 999999

---

## Setup Instructions

### 1. Run Migration

```bash
# Copy migration to Docker
docker cp backend/migrations/020_feature_flags.sql shop_postgres:/tmp/

# Run migration
docker exec -it shop_postgres psql -U shopuser -d shopdb -f /tmp/020_feature_flags.sql
```

### 2. Add Routes to Server

Edit `backend/src/server.js`:

```javascript
const featuresRoutes = require('./routes/features');

// Add after other routes
app.use('/api/features', featuresRoutes);
```

### 3. Wrap App with Provider

Edit `frontend/src/App.js`:

```javascript
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';

function App() {
  return (
    <FeatureFlagProvider>
      <Router>
        {/* Your routes */}
      </Router>
    </FeatureFlagProvider>
  );
}
```

### 4. Add Feature Manager to Admin Page

Edit `frontend/src/pages/Admin.js`:

```javascript
import FeatureManager from '../components/FeatureManager';

// Add tab for Feature Management
<Tab>Feature Management</Tab>

// Add panel
<TabPanel>
  <FeatureManager />
</TabPanel>
```

---

## API Endpoints

### Public (Authenticated Users)
- `GET /api/features/flags` - Get available features for current user
- `GET /api/features/limits` - Get limits for current user's tier
- `GET /api/features/check/:featureKey` - Check specific feature

### Admin Only
- `GET /api/features/admin/all` - Get all features (including disabled)
- `PUT /api/features/admin/feature/:id` - Update feature settings
- `POST /api/features/admin/toggle/:id` - Quick toggle feature on/off
- `GET /api/features/admin/limits` - Get all tier limits
- `PUT /api/features/admin/limit/:id` - Update tier limit

---

## Best Practices

### 1. Always Check Features
Never assume a feature is available. Always check with `hasFeature()`.

### 2. Graceful Degradation
Show upgrade prompts instead of errors when features aren't available.

### 3. Clear Communication
Use descriptive feature names and descriptions so users understand what they're missing.

### 4. Test Both Tiers
Test your app as both free and premium user to ensure features hide correctly.

### 5. Document New Features
When adding new features, add them to the `feature_flags` table with appropriate settings.

---

## Adding New Features

### 1. Add to Database

```sql
INSERT INTO feature_flags (
  feature_key, 
  feature_name, 
  description, 
  category, 
  requires_premium, 
  free_tier_enabled, 
  premium_tier_enabled, 
  icon, 
  display_order
) VALUES (
  'new_feature',
  'New Feature Name',
  'Description of the feature',
  'premium',
  TRUE,
  FALSE,
  TRUE,
  '🎉',
  25
);
```

### 2. Use in Components

```javascript
const { hasFeature } = useFeatureFlags();

{hasFeature('new_feature') && (
  <NewFeatureComponent />
)}
```

### 3. Add Backend Protection

```javascript
router.get('/new-feature', auth, requirePremium, handler);
```

---

## Troubleshooting

### Features Not Showing
1. Check if feature is enabled in admin panel
2. Check if feature is enabled for user's tier
3. Verify user's subscription status
4. Check browser console for errors

### Limits Not Working
1. Verify limit values in admin panel
2. Check if middleware is applied to route
3. Verify database values are correct

### Admin Panel Not Accessible
1. Verify user has `is_admin = true` in database
2. Check authentication token is valid
3. Verify admin routes are registered

---

## Security Notes

- ✅ All admin endpoints check `is_admin` status
- ✅ Feature checks happen on both frontend and backend
- ✅ Limits are enforced server-side
- ✅ Users cannot bypass restrictions via API calls

---

## Future Enhancements

- [ ] Feature usage analytics
- [ ] A/B testing support
- [ ] Time-based feature rollouts
- [ ] User-specific feature overrides
- [ ] Feature dependency management
