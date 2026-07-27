# 🏠 Home Inventory System - Expansion Roadmap

## Vision
Transform Kitchen Inventory into a comprehensive **Home Inventory** system that tracks ALL household items - kitchen, bathroom, pet supplies, cleaning products, tools, and more. Become the ultimate household management platform.

---

## ✅ Phase 1: Rename & Add Category Foundation (COMPLETE)

### Goals
- Rebrand Kitchen Inventory → Home Inventory
- Add database support for item categories
- Prepare foundation for multi-category tracking

### Completed Changes

#### Frontend
- ✅ Sidebar icon changed: Package → Home 🏠
- ✅ Sidebar label: "Kitchen Inventory" → "Home Inventory"
- ✅ Page title updated to "Home Inventory"
- ✅ Subtitle mentions expanded scope

#### Backend
- ✅ Migration 031: Added `item_category` to inventory table
- ✅ Migration 032: Added `location_category` and `icon` to storage locations
- ✅ Migration 033: Renamed feature flag `pantry` → `home_inventory`
- ✅ Indexes created for fast category filtering

#### Database Schema
```sql
-- inventory table
item_category VARCHAR(50) DEFAULT 'food'
-- Categories: food, household, pet, medical, cleaning, tools, beauty, other

-- custom_storage_locations table
location_category VARCHAR(50) DEFAULT 'kitchen'
icon VARCHAR(50)
-- Categories: kitchen, bathroom, pet, cleaning, garage, bedroom, other
```

---

## 🚧 Phase 2: New Interface Implementation (IN PROGRESS)

### Goals
Implement the new interface design from sketch:
- Location navigator with dropdown
- View mode selector (Grid, List, Map, Category)
- Enhanced filter panel
- Better card display

### UI Components to Build

#### 1. Location Navigator (Left Panel)
```
┌─────────────────────┐
│ Location ▼          │ ← Dropdown selector
│ ─────────────────── │
│ 🔍 Search...        │ ← Search bar
│ ─────────────────── │
│ View Mode           │ ← Toggle buttons
│ [Grid][List][Map]   │
│ ─────────────────── │
│ Clear 🗑️            │ ← Clear buttons
│ [Pantry][Fridge]    │
│ [All Items]         │
└─────────────────────┘
```

#### 2. Item Display (Center)
- Grid view with cards
- Color-coded status badges
- Quick action buttons
- Drag & drop support

#### 3. Filter Panel (Right)
```
┌─────────────┐
│ 🚨 Expiring │
│ 📉 Low Stock│
│ ⚠️  Warning │
│ ⭐ Favorites│
│ 📦 All Items│
│ 📊 Analytics│
└─────────────┘
```

### Tasks
- [ ] Create LocationNavigator component
- [ ] Create FilterPanel component
- [ ] Update InventoryCard for new design
- [ ] Add category filter dropdown
- [ ] Implement view mode switching
- [ ] Add drag & drop for organization

---

## 📋 Phase 3: Category-Specific Features

### Kitchen Items (Existing)
- ✅ Expiration tracking
- ✅ Smart learning system
- ✅ Pantry/Fridge/Freezer locations

### Bathroom Items (NEW)
- [ ] Medicine cabinet tracking
- [ ] Medication expiration alerts
- [ ] Toiletries low stock alerts
- [ ] First aid kit inventory

### Pet Supplies (NEW)
- [ ] Pet food inventory
- [ ] Medication schedules
- [ ] Vet appointment reminders
- [ ] Grooming schedule
- [ ] Toy/accessory tracking

### Cleaning Supplies (NEW)
- [ ] Product inventory
- [ ] Usage tracking
- [ ] Reorder alerts
- [ ] Safety data sheets

### Tools & Hardware (NEW)
- [ ] Tool inventory
- [ ] Maintenance schedules
- [ ] Warranty tracking
- [ ] Battery-powered item tracking

---

## 🗓️ Phase 4: Chores Timeline

### Features
- [ ] Recurring task management
- [ ] Task categories (cleaning, maintenance, pet care)
- [ ] Completion history
- [ ] Reminders & notifications
- [ ] Task templates

### Database Schema
```sql
CREATE TABLE household_tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  task_name VARCHAR(255),
  category VARCHAR(50),
  frequency VARCHAR(50), -- daily, weekly, monthly, yearly
  last_completed TIMESTAMP,
  next_due TIMESTAMP,
  location_id INTEGER REFERENCES custom_storage_locations(id),
  notes TEXT,
  is_active BOOLEAN DEFAULT true
);
```

### Task Categories
- 🧹 Cleaning (vacuum, mop, dust)
- 🔧 Maintenance (HVAC filters, smoke detectors)
- 🐾 Pet Care (grooming, vet visits)
- 🌱 Plants (watering, fertilizing)
- 🚗 Vehicle (oil change, inspection)

---

## 📊 Phase 5: Advanced Analytics

### Metrics to Track
- [ ] Spending by category
- [ ] Waste tracking (expired items)
- [ ] Usage patterns
- [ ] Reorder frequency
- [ ] Cost per category
- [ ] Expiration trends

### Visualizations
- [ ] Spending breakdown pie chart
- [ ] Expiration timeline
- [ ] Category distribution
- [ ] Monthly trends
- [ ] Waste reduction progress

---

## 🎯 Phase 6: Smart Features

### Auto-Reorder System
- [ ] Low stock detection
- [ ] Auto-add to shopping list
- [ ] Purchase history analysis
- [ ] Suggested reorder quantities

### Maintenance Reminders
- [ ] HVAC filter changes
- [ ] Smoke detector batteries
- [ ] Water filter replacements
- [ ] Appliance maintenance
- [ ] Seasonal tasks

### Pet Health Tracking
- [ ] Vaccination schedules
- [ ] Medication reminders
- [ ] Weight tracking
- [ ] Vet visit history
- [ ] Grooming appointments

---

## 🚀 Future Enhancements

### Receipt Scanner Integration
- Scan grocery receipts
- Auto-add items to inventory
- Track spending
- OCR text extraction

### Barcode Scanner
- Quick item lookup
- Auto-fill product info
- Expiration date detection
- Price tracking

### Voice Commands
- "Add milk to pantry"
- "What's expiring soon?"
- "Show bathroom items"
- "Mark shampoo as low stock"

### Sharing & Collaboration
- Share inventory with family
- Collaborative shopping lists
- Task assignment
- Shared chores calendar

### Mobile App
- Tablet-optimized interface
- Camera integration
- Push notifications
- Offline mode

---

## 📝 Implementation Notes

### Category Icons
```javascript
const CATEGORY_ICONS = {
  food: '🍎',
  household: '🏠',
  pet: '🐾',
  medical: '💊',
  cleaning: '🧹',
  tools: '🔧',
  beauty: '💄',
  other: '📦'
};

const LOCATION_ICONS = {
  pantry: '🥫',
  fridge: '❄️',
  freezer: '🧊',
  bathroom: '🛁',
  medicine: '💊',
  garage: '🚗',
  laundry: '🧺',
  pet_area: '🐾'
};
```

### API Endpoints to Add
```
GET    /api/inventory?category=pet
GET    /api/inventory/categories
GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
GET    /api/analytics/spending
GET    /api/analytics/waste
```

---

## 🎨 Design Principles

1. **Simplicity**: Easy to add items, no complex forms
2. **Visual**: Icons, colors, and images for quick recognition
3. **Smart**: Learn from user behavior, suggest actions
4. **Flexible**: Support any household item type
5. **Mobile-First**: Touch-friendly, tablet-optimized
6. **Fast**: Quick actions, minimal clicks

---

## 📈 Success Metrics

- [ ] User adoption rate
- [ ] Items tracked per user
- [ ] Categories used
- [ ] Tasks completed
- [ ] Waste reduction
- [ ] Time saved
- [ ] User satisfaction score

---

## 🏆 Competitive Advantages

1. **All-in-One**: Kitchen + Bathroom + Pet + Cleaning + Tools
2. **Smart Learning**: Expiration prediction improves over time
3. **Chores Integration**: Inventory + Tasks in one place
4. **Family Friendly**: Share with household members
5. **No Subscription**: Free core features

---

## 📅 Timeline

- **Phase 1**: ✅ Complete (Rename + Database)
- **Phase 2**: 🚧 2 weeks (New Interface)
- **Phase 3**: 📋 2 weeks (Category Features)
- **Phase 4**: 🗓️ 1 week (Chores Timeline)
- **Phase 5**: 📊 1 week (Analytics)
- **Phase 6**: 🎯 2 weeks (Smart Features)

**Total Estimated Time**: 8 weeks

---

## 🎯 Next Immediate Steps

1. ✅ Run migrations on production database
2. ✅ Test renamed feature in UI
3. [ ] Design LocationNavigator component
4. [ ] Design FilterPanel component
5. [ ] Create category filter dropdown
6. [ ] Add category icons to items
7. [ ] Build category-specific views

---

**Last Updated**: July 27, 2026
**Status**: Phase 1 Complete, Phase 2 Starting
