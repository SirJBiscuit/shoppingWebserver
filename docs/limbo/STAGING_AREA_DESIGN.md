# 🛒 Staging Area / Floor Space System

## Concept
A middle ground between shopping list and kitchen inventory where newly purchased items are temporarily stored for proper organization and stock rotation.

## Workflow

```
Shopping List → Complete Shopping → Staging Area → Put Away → Kitchen Inventory
                                         ↓
                                   Smart Suggestions:
                                   - Items to discard
                                   - Items to use first
                                   - Rotation recommendations
```

## Features

### 1. Staging Area (Floor Space)
**Purpose:** Hold newly purchased items before putting them away
- Visual representation of items on "floor" or "counter"
- Grouped by storage location (Fridge items, Freezer items, Pantry items)
- Shows what needs to be put away

### 2. Smart Rotation System
When adding items to staging area, system checks existing inventory:

**Alerts:**
- ⚠️ "You have 2 older milks in fridge - use those first!"
- 🗑️ "Leftover pasta from 5 days ago - consider discarding"
- 📅 "Strawberries expiring tomorrow - eat before new ones"
- 🔄 "Move older cheese to front, new cheese to back"

### 3. Active Sorting Mode
**Split Screen View:**
- **Left:** Staging area (new items)
- **Right:** Current inventory (what's already there)
- **Center:** Action buttons (Put Away, Discard, Use First)

### 4. Put Away Process
**For each item in staging:**
1. Show existing similar items
2. Suggest which to use first
3. Recommend what to discard
4. One-click "Put Away" to inventory

### 5. Expiration Management
**Before putting away new items:**
- List items expiring soon
- Suggest meal ideas using expiring items
- Quick "Mark as Used" or "Discard" buttons
- Prevent food waste

## Database Schema

```sql
-- Staging area table
CREATE TABLE staging_area (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_name VARCHAR(255),
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  category VARCHAR(100),
  storage_location VARCHAR(50),
  bought_date DATE DEFAULT CURRENT_DATE,
  price DECIMAL(10,2),
  store VARCHAR(255),
  icon TEXT,
  from_shopping_list_id INTEGER,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rotation suggestions
CREATE TABLE rotation_suggestions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  staging_item_id INTEGER REFERENCES staging_area(id),
  inventory_item_id INTEGER REFERENCES inventory(id),
  suggestion_type VARCHAR(50), -- 'use_first', 'discard', 'rotate', 'move_front'
  reason TEXT,
  priority INTEGER, -- 1=urgent, 2=important, 3=suggested
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints

```javascript
// Move completed shopping list to staging
POST /api/staging/from-shopping-list/:listId

// Get staging area items
GET /api/staging

// Get rotation suggestions for staging item
GET /api/staging/:id/suggestions

// Put away item from staging to inventory
POST /api/staging/:id/put-away

// Discard item from staging
DELETE /api/staging/:id

// Bulk put away (all items in staging)
POST /api/staging/put-away-all

// Mark inventory item for discard/use
POST /api/inventory/:id/mark-for-action
```

## UI Components

### 1. StagingArea.js
Main component showing items waiting to be put away

### 2. RotationPanel.js
Shows suggestions for each item being put away

### 3. InventoryComparison.js
Side-by-side view of new vs existing items

### 4. PutAwayWizard.js
Step-by-step guide for organizing groceries

## User Flow

### Step 1: Complete Shopping
```
Shopping List → [Complete Shopping] → Staging Area
```
- All checked items move to staging
- Grouped by storage location
- Shows count: "12 items to put away"

### Step 2: Review Staging
```
Staging Area View:
┌─────────────────────────────────────┐
│ 🧊 Fridge Items (5)                 │
│ - Milk (1 gallon)                   │
│ - Strawberries (1 lb)               │
│ - Cheese (8 oz)                     │
│ - Yogurt (6 pack)                   │
│ - Lettuce (1 head)                  │
├─────────────────────────────────────┤
│ ❄️ Freezer Items (3)                │
│ - Ice Cream (1 pint)                │
│ - Frozen Pizza (2)                  │
│ - Frozen Veggies (1 bag)            │
├─────────────────────────────────────┤
│ 🥫 Pantry Items (4)                 │
│ - Pasta (1 box)                     │
│ - Rice (2 lb bag)                   │
│ - Cereal (1 box)                    │
│ - Chips (1 bag)                     │
└─────────────────────────────────────┘
```

### Step 3: Smart Suggestions
Click on "Milk" in staging:
```
┌─────────────────────────────────────┐
│ New: Milk (1 gallon)                │
│ Bought today at Kroger              │
├─────────────────────────────────────┤
│ ⚠️ EXISTING INVENTORY:              │
│                                     │
│ 🥛 Milk (0.5 gallon)                │
│    Opened 3 days ago                │
│    Expires in 4 days                │
│    → USE THIS FIRST                 │
│                                     │
│ 💡 SUGGESTION:                      │
│ Move old milk to front of fridge    │
│ Put new milk in back                │
│                                     │
│ [Put Away New] [Use Old First]      │
└─────────────────────────────────────┘
```

### Step 4: Discard Suggestions
```
⚠️ ITEMS TO CHECK BEFORE PUTTING AWAY:

🗑️ Leftover Pizza (5 days old)
   → Probably should discard
   [Discard] [Keep]

📅 Strawberries (Expires tomorrow)
   → Use before new ones
   [Mark as Priority] [Discard]

🥛 Milk (Opened 7 days ago)
   → Past prime, recommend discard
   [Discard] [Still Good]
```

### Step 5: Put Away
```
[Put Away All] → Moves all staging items to inventory
[Put Away by Location] → Fridge first, then Freezer, then Pantry
[Custom Put Away] → Choose which items to put away
```

## Benefits

1. **Prevents Mixing Old/New** - Clear separation
2. **Reduces Food Waste** - Reminds you to use old items first
3. **Better Organization** - Systematic put-away process
4. **Stock Rotation** - FIFO (First In, First Out) automatically
5. **Meal Planning** - Suggests using expiring items
6. **Cleaner Inventory** - Remove expired items before adding new
7. **Peace of Mind** - Know exactly what needs attention

## Mobile/Tablet Optimized

**Swipe Actions:**
- Swipe right: Put away
- Swipe left: Discard
- Tap: View suggestions

**Voice Commands:**
- "Put away all fridge items"
- "Show me what's expiring"
- "Discard old leftovers"

## Future Enhancements

1. **Photo Recognition** - Take photo of groceries, auto-add to staging
2. **Receipt Scanner** - Scan receipt, items go to staging
3. **Smart Grouping** - Group by meal prep needs
4. **Family Mode** - Assign put-away tasks to family members
5. **Gamification** - Points for proper rotation, waste reduction

## Implementation Priority

**Phase 1 (MVP):**
- Basic staging area
- Move from shopping list
- Simple put away to inventory

**Phase 2:**
- Rotation suggestions
- Expiration warnings
- Discard recommendations

**Phase 3:**
- Active sorting mode
- Side-by-side comparison
- Bulk actions

**Phase 4:**
- Advanced AI suggestions
- Photo recognition
- Voice commands
