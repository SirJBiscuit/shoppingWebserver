# Kitchen Inventory System - Complete Revamp

## Vision
A beautiful, intelligent kitchen inventory system optimized for tablets (wall-mounted or fridge-mounted) with smart expiration tracking that learns from user behavior.

## Core Features

### 1. Custom Storage Locations
**Default Locations:**
- 🥫 Pantry
- 🧊 Fridge
- ❄️ Freezer

**Custom Locations:**
- User can create unlimited custom storage locations
- Examples: "Shelf 1", "Shelf 2", "Wine Rack", "Spice Cabinet", "Garage Freezer"
- Each location has:
  - Custom name
  - Custom icon (emoji picker)
  - Custom color
  - Sort order
  - Item count

### 2. Smart Expiration Tracking System

**Data Flow:**
```
Item Added → Bought Date (manual/auto) → 
  ↓
Manual Expiration Date Input (optional) →
  ↓
Estimated Expiration Date (from database defaults) →
  ↓
Calculated Expiration (bought_date + shelf_life_days) →
  ↓
User Feedback ("Still Good" / "Went Bad") →
  ↓
Learning Algorithm Updates →
  ↓
Recalculated Expiration for Future →
  ↓
Saved to User's Personal Item History →
  ↓
Used for Next Time Same Item Added
```

**Expiration States:**
- 🟢 **Fresh** (>7 days) - Green badge
- 🟡 **Use Soon** (4-7 days) - Yellow badge
- 🟠 **Urgent** (1-3 days) - Orange badge, pulsing
- 🔴 **Expired** (0 days) - Red badge, alert
- ⚫ **Discard** (<0 days) - Black badge, strikethrough

**Learning System:**
- Tracks when user marks items as "went bad"
- Compares actual vs estimated expiration
- Calculates adjustment factor
- Updates personal item database
- Applies to future instances of same item

### 3. Enhanced Data Tracking

**Per Item:**
- `item_name` - Name of item
- `storage_location` - pantry/fridge/freezer/custom
- `custom_location_id` - FK to custom_storage_locations
- `category` - Food category
- `quantity` - Amount
- `unit` - cups/lbs/oz/etc
- `bought_date` - When purchased
- `opened_date` - When opened (optional)
- `is_opened` - Boolean flag
- `manual_expiry_date` - User-set expiration (overrides calculation)
- `estimated_expiry_date` - System calculated
- `actual_expiry_date` - When user marked as bad
- `expiry_confidence` - How confident the estimate is (0-100%)
- `notes` - User notes
- `barcode` - UPC/barcode
- `image_url` - Item photo
- `price` - Purchase price
- `store` - Where bought

**Tracking Tables:**
- `inventory` - Current items
- `inventory_history` - Past items (for learning)
- `item_expiration_learning` - ML data per item per user
- `custom_storage_locations` - User-defined locations

### 4. Beautiful Tablet-Optimized UI

**Design Principles:**
- **Large touch targets** (minimum 60px for tablet)
- **High contrast** colors for visibility from distance
- **Minimal text entry** (use pickers, buttons, voice input)
- **Gesture-based** (swipe to delete, drag to move)
- **Visual indicators** (colors, icons, badges)
- **Quick actions** (one-tap common operations)

**Layout:**
```
┌─────────────────────────────────────────────┐
│  🏠 Kitchen Inventory        [+ Add Item]   │
├─────────────────────────────────────────────┤
│  [🥫 Pantry] [🧊 Fridge] [❄️ Freezer]      │
│  [📦 Shelf 1] [🍷 Wine Rack] [+ Custom]    │
├─────────────────────────────────────────────┤
│  🔍 Search    [Category ▼] [Sort ▼]        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 🥛 Milk  │  │ 🥚 Eggs  │  │ 🧀 Cheese│ │
│  │ 2 cups   │  │ 12 count │  │ 8 oz     │ │
│  │ 🟡 3 days│  │ 🟢 Fresh │  │ 🟠 1 day │ │
│  │ [Actions]│  │ [Actions]│  │ [Actions]│ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ 🍞 Bread │  │ 🍎 Apples│  │ 🥕 Carrots│ │
│  │ 1 loaf   │  │ 6 count  │  │ 1 lb     │ │
│  │ 🟢 Fresh │  │ 🟢 Fresh │  │ 🟡 5 days│ │
│  │ [Actions]│  │ [Actions]│  │ [Actions]│ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

**Item Card Features:**
- Large item icon/image
- Item name (large font)
- Quantity with unit
- Expiration badge (color-coded)
- Quick action buttons:
  - ➕ Increase quantity
  - ➖ Decrease quantity
  - ✅ Still Good (extends expiration)
  - ❌ Went Bad (learns from it)
  - 🛒 Add to Shopping List
  - 📝 Edit
  - 🗑️ Delete

### 5. Drag & Drop Organization

**Features:**
- Drag items between storage locations
- Drag to reorder within location
- Visual feedback during drag
- Drop zones highlight on hover
- Smooth animations

**Implementation:**
- Use `react-beautiful-dnd` or `@dnd-kit/core`
- Touch-friendly (works on tablets)
- Keyboard accessible

### 6. Advanced Categorization & Sorting

**Categories:**
- 🥛 Dairy & Eggs
- 🥩 Meat & Seafood
- 🥬 Produce (Fruits & Vegetables)
- 🍞 Bakery & Bread
- 🥫 Canned & Jarred
- 🌾 Grains & Pasta
- 🧂 Spices & Seasonings
- 🍫 Snacks & Sweets
- 🥤 Beverages
- 🧈 Condiments & Sauces
- ❄️ Frozen Foods
- 🍽️ Leftovers
- 🌿 Herbs & Fresh
- 🧴 Other

**Sort Options:**
- Expiration Date (soonest first)
- Name (A-Z)
- Category
- Date Added (newest/oldest)
- Quantity (high/low)
- Custom (drag to reorder)

**Filters:**
- By storage location
- By category
- Expiring soon (< 7 days)
- Opened items
- Low stock
- Search by name

### 7. Smart Expiration Algorithm

**Initial Estimate:**
```javascript
// When item is added
estimatedExpiryDate = boughtDate + defaultShelfLife[itemName][storageLocation]

// Example defaults (days):
{
  "milk": { "fridge": 7, "pantry": 1 },
  "eggs": { "fridge": 21, "pantry": 7 },
  "bread": { "pantry": 5, "fridge": 10, "freezer": 90 },
  "chicken": { "fridge": 2, "freezer": 180 }
}
```

**Learning Algorithm:**
```javascript
// When user marks item as "went bad"
actualShelfLife = actualExpiryDate - boughtDate
estimatedShelfLife = estimatedExpiryDate - boughtDate
difference = actualShelfLife - estimatedShelfLife

// Update learning data
userItemHistory.push({
  itemName,
  storageLocation,
  estimatedShelfLife,
  actualShelfLife,
  difference,
  timestamp
})

// Calculate new estimate (weighted average)
recentHistory = getLast5Instances(itemName, storageLocation)
weights = [0.4, 0.3, 0.2, 0.07, 0.03] // Recent = more weight
newEstimate = weightedAverage(recentHistory, weights)

// Apply confidence factor
confidence = min(100, recentHistory.length * 20) // Max at 5 instances
```

**Confidence Levels:**
- 0-20%: 🔴 Low confidence (use default)
- 21-60%: 🟡 Medium confidence (blend default + learned)
- 61-100%: 🟢 High confidence (use learned)

### 8. Tablet Optimization

**Responsive Breakpoints:**
- Mobile: < 768px (phone)
- Tablet: 768px - 1024px (iPad, wall-mounted)
- Desktop: > 1024px

**Tablet-Specific Features:**
- Landscape orientation optimized
- Large grid (3-4 items per row)
- Touch gestures:
  - Swipe left: Delete
  - Swipe right: Add to shopping list
  - Long press: Edit
  - Pinch: Zoom in/out
- Voice input for adding items
- Barcode scanner integration
- Always-on display mode (screensaver with key info)

**Performance:**
- Lazy loading (virtualized lists)
- Image optimization
- Smooth 60fps animations
- Offline support (PWA)

## Database Schema

### New Tables

```sql
-- Custom storage locations
CREATE TABLE custom_storage_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) DEFAULT '📦',
  color VARCHAR(7) DEFAULT '#6B7280',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced inventory table
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS custom_location_id INTEGER REFERENCES custom_storage_locations(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS bought_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS opened_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS is_opened BOOLEAN DEFAULT FALSE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS manual_expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS estimated_expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS actual_expiry_date DATE;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS expiry_confidence INTEGER DEFAULT 0;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS barcode VARCHAR(50);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS price DECIMAL(10,2);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS store VARCHAR(100);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Expiration learning data
CREATE TABLE item_expiration_learning (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  storage_location VARCHAR(50) NOT NULL,
  bought_date DATE NOT NULL,
  opened_date DATE,
  estimated_expiry_date DATE NOT NULL,
  actual_expiry_date DATE NOT NULL,
  estimated_shelf_life INTEGER NOT NULL, -- days
  actual_shelf_life INTEGER NOT NULL, -- days
  difference INTEGER NOT NULL, -- actual - estimated
  confidence_before INTEGER,
  confidence_after INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_name, storage_location, bought_date)
);

-- Inventory history (for analytics)
CREATE TABLE inventory_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  item_name VARCHAR(255) NOT NULL,
  storage_location VARCHAR(50),
  custom_location_id INTEGER,
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  bought_date DATE,
  opened_date DATE,
  expiry_date DATE,
  removed_date DATE,
  removal_reason VARCHAR(50), -- consumed, expired, thrown_out
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default expiration data (system-wide)
CREATE TABLE default_expiration_times (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  storage_location VARCHAR(50) NOT NULL,
  shelf_life_days INTEGER NOT NULL,
  confidence INTEGER DEFAULT 50,
  source VARCHAR(100), -- USDA, FDA, user_contributed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_name, storage_location)
);

-- Indexes for performance
CREATE INDEX idx_inventory_user_location ON inventory(user_id, storage_location);
CREATE INDEX idx_inventory_custom_location ON inventory(custom_location_id);
CREATE INDEX idx_inventory_expiry ON inventory(estimated_expiry_date);
CREATE INDEX idx_learning_user_item ON item_expiration_learning(user_id, item_name, storage_location);
CREATE INDEX idx_custom_locations_user ON custom_storage_locations(user_id, sort_order);
```

## API Endpoints

### Custom Storage Locations
```
GET    /api/inventory/locations          - Get all storage locations (default + custom)
POST   /api/inventory/locations          - Create custom location
PATCH  /api/inventory/locations/:id      - Update custom location
DELETE /api/inventory/locations/:id      - Delete custom location
POST   /api/inventory/locations/reorder  - Reorder locations
```

### Enhanced Inventory
```
GET    /api/inventory                    - Get all items (with filters)
GET    /api/inventory/:id                - Get single item
POST   /api/inventory                    - Add item
PATCH  /api/inventory/:id                - Update item
DELETE /api/inventory/:id                - Delete item
POST   /api/inventory/:id/move           - Move item to different location
POST   /api/inventory/:id/still-good     - Mark as still good (extends expiry)
POST   /api/inventory/:id/went-bad       - Mark as went bad (learns from it)
POST   /api/inventory/:id/opened         - Mark as opened
POST   /api/inventory/reorder            - Reorder items (custom sort)
```

### Expiration Learning
```
GET    /api/inventory/expiration/estimate  - Get estimated expiry for item
POST   /api/inventory/expiration/learn     - Record expiration feedback
GET    /api/inventory/expiration/history   - Get learning history
GET    /api/inventory/expiration/defaults  - Get default expiration times
```

### Analytics
```
GET    /api/inventory/stats               - Get inventory statistics
GET    /api/inventory/expiring-soon       - Get items expiring soon
GET    /api/inventory/history             - Get inventory history
```

## Frontend Components

### New Components
```
src/components/inventory/
  ├── InventoryGrid.js           - Main grid layout
  ├── InventoryCard.js           - Individual item card
  ├── StorageLocationTabs.js     - Location tabs/pills
  ├── CustomLocationModal.js     - Create/edit custom location
  ├── AddItemModal.js            - Enhanced add item modal
  ├── EditItemModal.js           - Enhanced edit item modal
  ├── ExpirationBadge.js         - Color-coded expiration badge
  ├── QuickActions.js            - Quick action buttons
  ├── DragDropContext.js         - Drag & drop wrapper
  ├── InventoryFilters.js        - Filter/sort controls
  ├── ExpirationLearningModal.js - "Went bad" feedback modal
  ├── BarcodeScanner.js          - Barcode scanning
  └── VoiceInput.js              - Voice-to-text input
```

### Enhanced Pages
```
src/pages/
  └── Pantry.js                  - Complete rewrite with new features
```

## Implementation Phases

### Phase 1: Database & Backend (Week 1)
- [ ] Create migration for new tables
- [ ] Add custom storage location endpoints
- [ ] Enhance inventory endpoints
- [ ] Build expiration learning algorithm
- [ ] Add default expiration data

### Phase 2: Core UI Components (Week 1-2)
- [ ] Redesign InventoryCard with large touch targets
- [ ] Build StorageLocationTabs
- [ ] Create CustomLocationModal
- [ ] Enhance AddItemModal with all new fields
- [ ] Build ExpirationBadge component

### Phase 3: Drag & Drop (Week 2)
- [ ] Implement drag & drop between locations
- [ ] Add reordering within location
- [ ] Touch gesture support
- [ ] Visual feedback and animations

### Phase 4: Expiration Learning (Week 2-3)
- [ ] Build learning algorithm
- [ ] Create "Still Good" / "Went Bad" UI
- [ ] Show confidence levels
- [ ] Display learning history

### Phase 5: Tablet Optimization (Week 3)
- [ ] Responsive layout for tablets
- [ ] Large touch targets (60px+)
- [ ] Gesture support (swipe, long press)
- [ ] Landscape orientation
- [ ] Performance optimization

### Phase 6: Advanced Features (Week 3-4)
- [ ] Barcode scanner integration
- [ ] Voice input
- [ ] Image upload for items
- [ ] Analytics dashboard
- [ ] Export/import data

### Phase 7: Polish & Testing (Week 4)
- [ ] Test on actual tablets
- [ ] Performance optimization
- [ ] Accessibility
- [ ] Documentation
- [ ] User testing

## Success Metrics

- ✅ Users can create unlimited custom storage locations
- ✅ Drag & drop works smoothly on tablets
- ✅ Expiration learning improves accuracy over time
- ✅ UI is beautiful and intuitive on wall-mounted tablet
- ✅ Touch targets are large enough (60px+)
- ✅ All actions can be done with minimal typing
- ✅ System learns from user feedback
- ✅ Confidence levels increase with usage
- ✅ Items are easy to find and organize

## Tablet Hardware Recommendations

**Recommended Tablets:**
- iPad (9th gen or newer) - 10.2" display
- Samsung Galaxy Tab A8 - 10.5" display
- Amazon Fire HD 10 - 10.1" display

**Mounting:**
- Wall mount with charging
- Magnetic fridge mount
- Adjustable arm mount

**Settings:**
- Kiosk mode (lock to app)
- Always-on display
- Auto-brightness
- Screen timeout: Never

## Future Enhancements

- **AI Suggestions**: "You're low on milk, add to shopping list?"
- **Meal Planning Integration**: "You have chicken expiring tomorrow, here are 5 recipes"
- **Smart Notifications**: Push notifications for expiring items
- **Family Sharing**: Multiple users, shared inventory
- **Shopping List Auto-Add**: Auto-add expiring items to shopping list
- **Waste Tracking**: Track how much food is thrown away
- **Cost Analysis**: Track spending on groceries
- **Recipe Suggestions**: Based on what's expiring soon
