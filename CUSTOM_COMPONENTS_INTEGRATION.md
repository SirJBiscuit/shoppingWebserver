# Custom Components Integration Guide

Complete guide for integrating all custom components with existing features (MDL, aisles, categories, etc.)

## 🎨 Custom Theme System

**File:** `frontend/src/utils/customTheme.js`

### Purpose
Centralized theme system ensuring ALL custom components follow the same design scheme. Makes AES integration faster and maintains consistency.

### Features
- ✅ Consistent colors (primary, success, warning, error, etc.)
- ✅ Standardized spacing, shadows, border radius
- ✅ Z-index layers (prevents overlap issues)
- ✅ Animation variants (fadeIn, slideUp, scale, etc.)
- ✅ Typography, buttons, inputs, badges
- ✅ Device breakpoints and helpers
- ✅ Dark mode support

### Usage

```javascript
import { customTheme, getColorScheme, getButtonClasses, getAnimation } from '../utils/customTheme';

// Get color scheme
const colors = getColorScheme('success'); // primary, success, warning, error, etc.

// Use in component
<div className={colors.bg}>
  <span className={colors.text}>Success!</span>
</div>

// Get button classes
const buttonClass = getButtonClasses('primary', 'md');

// Get animation
const animation = getAnimation('slideUp', 'spring');
<motion.div {...animation}>Content</motion.div>

// Check device type
const device = getDeviceType(); // 'mobile' | 'tablet' | 'desktop'

// Get z-index
const zIndex = getZIndex('modal'); // Consistent layering
```

---

## 🔍 Custom Search Bar

**File:** `frontend/src/components/CustomSearchBar.js`

### Integrations
- ✅ **MDL Price Predictions** - Shows estimated prices
- ✅ **MDL Aisle Suggestions** - Displays aisle numbers
- ✅ **Category System** - Filter by categories
- ✅ **Store Locations** - Store-specific results
- ✅ **Recent Searches** - localStorage history
- ✅ **Voice Search** - Speech recognition
- ✅ **Barcode Scanner** - Camera integration

### Dashboard Integration

```javascript
import CustomSearchBar from '../components/CustomSearchBar';

function Dashboard() {
  const [searchResults, setSearchResults] = useState([]);
  
  const handleSearch = async (query, filters) => {
    // Search with MDL integration
    const results = await fetch(`/api/mdl/search?q=${query}`, {
      method: 'POST',
      body: JSON.stringify({
        query,
        categories: filters.categories,
        sortBy: filters.sortBy,
        storeId: currentStore?.id
      })
    });
    
    setSearchResults(await results.json());
  };

  const handleSelect = (suggestion) => {
    // User selected a suggestion
    addItem({
      item_name: suggestion.name,
      price: suggestion.price, // MDL predicted price
      category: suggestion.category,
      aisle: suggestion.aisle // MDL predicted aisle
    });
  };

  return (
    <CustomSearchBar
      placeholder="Search items..."
      onSearch={handleSearch}
      onSelect={handleSelect}
      showFilters={true}
      showVoice={true}
      showBarcode={true}
      mdlEnabled={true}
      aisleEnabled={true}
      currentStore={currentStore}
      categories={['Dairy', 'Produce', 'Meat', 'Bakery']}
    />
  );
}
```

### Features in Action

**MDL Price Prediction:**
```javascript
// When user types "Milk"
// CustomSearchBar automatically fetches:
// - Price: $3.99 (from MDL)
// - Aisle: 5 (from MDL)
// - Category: Dairy
// - Frequency: "Often bought"
```

**Advanced Filters:**
```javascript
// User can filter by:
// - Categories (multi-select)
// - Sort by: relevance, price, name, recent, frequency
// - Price range (future)
// - Aisles (future)
```

---

## 👆 Custom Swipe Actions

**File:** `frontend/src/components/CustomSwipeActions.js`

### Use Cases
- Swipe item → Delete, Edit, Move
- Swipe recipe → Save, Share
- Swipe notification → Dismiss, Snooze

### ItemList Integration

```javascript
import CustomSwipeActions from '../components/CustomSwipeActions';
import { Trash2, Edit2, ArrowRight, Copy } from 'lucide-react';

function ItemList({ items, onDelete, onEdit, onMove, onCopy }) {
  return (
    <div>
      {items.map(item => (
        <CustomSwipeActions
          key={item.id}
          leftActions={[
            {
              icon: Trash2,
              onClick: () => onDelete(item.id),
              color: 'bg-red-500',
              label: 'Delete'
            }
          ]}
          rightActions={[
            {
              icon: Edit2,
              onClick: () => onEdit(item),
              color: 'bg-blue-500',
              label: 'Edit'
            },
            {
              icon: ArrowRight,
              onClick: () => onMove(item),
              color: 'bg-purple-500',
              label: 'Move'
            },
            {
              icon: Copy,
              onClick: () => onCopy(item),
              color: 'bg-green-500',
              label: 'Copy'
            }
          ]}
          threshold={80}
        >
          <ItemCard item={item} />
        </CustomSwipeActions>
      ))}
    </div>
  );
}
```

### Mobile UX Benefits
- ✅ Natural iOS/Android feel
- ✅ Haptic feedback on swipe
- ✅ Color-coded actions
- ✅ One-handed operation
- ✅ No need for action buttons

---

## 🖱️ Custom Context Menu

**File:** `frontend/src/components/CustomContextMenu.js`

### Use Cases
- Right-click item → Quick actions
- Long-press on mobile → Context menu
- Nested submenus for complex actions

### ItemCard Integration

```javascript
import CustomContextMenu from '../components/CustomContextMenu';
import { Edit2, Trash2, Copy, ArrowRight, Tag, MapPin, DollarSign } from 'lucide-react';

function ItemCard({ item, onEdit, onDelete, onMove, onCopy }) {
  const contextMenuItems = [
    {
      label: 'Edit',
      icon: Edit2,
      onClick: () => onEdit(item),
      shortcut: 'Ctrl+E'
    },
    {
      label: 'Copy',
      icon: Copy,
      onClick: () => onCopy(item)
    },
    {
      separator: true
    },
    {
      label: 'Move to...',
      icon: ArrowRight,
      submenu: [
        {
          label: 'Pantry',
          onClick: () => onMove(item, 'pantry')
        },
        {
          label: 'Shopping List',
          onClick: () => onMove(item, 'shopping')
        },
        {
          label: 'Wishlist',
          onClick: () => onMove(item, 'wishlist')
        }
      ]
    },
    {
      label: 'Change Category',
      icon: Tag,
      submenu: categories.map(cat => ({
        label: cat,
        onClick: () => changeCategory(item, cat)
      }))
    },
    {
      separator: true
    },
    {
      label: 'Report Aisle',
      icon: MapPin,
      onClick: () => reportAisle(item)
    },
    {
      label: 'Update Price',
      icon: DollarSign,
      onClick: () => updatePrice(item)
    },
    {
      separator: true
    },
    {
      label: 'Delete',
      icon: Trash2,
      onClick: () => onDelete(item.id),
      color: 'text-red-600 dark:text-red-400'
    }
  ];

  return (
    <CustomContextMenu
      items={contextMenuItems}
      trigger="both" // rightClick + longPress
      longPressDuration={500}
    >
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg">
        <h3>{item.item_name}</h3>
        <p>${item.price}</p>
      </div>
    </CustomContextMenu>
  );
}
```

---

## 🔔 Custom Notification

**File:** `frontend/src/components/CustomNotification.js`

### MDL Integration Examples

```javascript
import { useNotification } from '../hooks/useNotification';

function Dashboard() {
  const { notification, hideNotification, success, warning, ask } = useNotification();

  // MDL Price Alert
  const checkPriceAlert = (item) => {
    if (item.price > item.mdl_average_price * 1.2) {
      warning(
        `${item.item_name} is 20% more expensive than usual ($${item.mdl_average_price.toFixed(2)})`,
        'Price Alert',
        { duration: 7000 }
      );
    }
  };

  // MDL Stock Alert
  const checkStockAlert = async () => {
    const suggestions = await fetch('/api/mdl/suggestions').then(r => r.json());
    
    if (suggestions.runningLow.length > 0) {
      ask(
        `You're running low on ${suggestions.runningLow[0].name}. Add to list?`,
        [
          {
            label: 'Add to List',
            onClick: () => addItem(suggestions.runningLow[0]),
            color: 'bg-green-500 hover:bg-green-600 text-white'
          },
          {
            label: 'Remind Me Later',
            variant: 'outline'
          }
        ],
        'Stock Alert'
      );
    }
  };

  // MDL Aisle Learned
  const onAisleReported = (itemName, aisle) => {
    success(
      `✓ Learned: ${itemName} is in Aisle ${aisle} at ${currentStore.name}`,
      'Aisle Saved',
      { duration: 3000 }
    );
  };

  return (
    <>
      {/* Your component */}
      <CustomNotification {...notification} onClose={hideNotification} />
    </>
  );
}
```

---

## 🎯 Combined Integration Example

### Enhanced ItemList with ALL Custom Components

```javascript
import CustomSearchBar from '../components/CustomSearchBar';
import CustomSwipeActions from '../components/CustomSwipeActions';
import CustomContextMenu from '../components/CustomContextMenu';
import CustomNotification from '../components/CustomNotification';
import { useNotification } from '../hooks/useNotification';
import { customTheme } from '../utils/customTheme';

function EnhancedItemList() {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const { notification, hideNotification, success, ask } = useNotification();

  // Search with MDL
  const handleSearch = async (query, filters) => {
    const results = await fetch('/api/mdl/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters, storeId: currentStore?.id })
    });
    setItems(await results.json());
  };

  // Delete with confirmation
  const handleDelete = (item) => {
    ask(
      `Delete ${item.item_name}?`,
      [
        {
          label: 'Delete',
          onClick: async () => {
            await deleteItem(item.id);
            success(`${item.item_name} deleted`);
          },
          color: 'bg-red-500'
        },
        { label: 'Cancel', variant: 'outline' }
      ]
    );
  };

  return (
    <div>
      {/* Enhanced Search */}
      <CustomSearchBar
        onSearch={handleSearch}
        mdlEnabled={true}
        aisleEnabled={true}
        currentStore={currentStore}
        categories={categories}
      />

      {/* Items with Swipe + Context Menu */}
      <div className="mt-4 space-y-2">
        {items.map(item => (
          <CustomSwipeActions
            key={item.id}
            leftActions={[
              {
                icon: Trash2,
                onClick: () => handleDelete(item),
                color: 'bg-red-500'
              }
            ]}
            rightActions={[
              {
                icon: Edit2,
                onClick: () => editItem(item),
                color: 'bg-blue-500'
              }
            ]}
          >
            <CustomContextMenu
              items={[
                { label: 'Edit', icon: Edit2, onClick: () => editItem(item) },
                { label: 'Delete', icon: Trash2, onClick: () => handleDelete(item), color: 'text-red-600' },
                { separator: true },
                { label: 'Report Aisle', icon: MapPin, onClick: () => reportAisle(item) }
              ]}
              trigger="both"
            >
              <div className={`p-4 ${customTheme.cards.base} ${customTheme.cards.hover}`}>
                <h3 className={customTheme.typography.h4}>{item.item_name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className={customTheme.badges.success}>${item.price}</span>
                  {item.aisle && (
                    <span className={customTheme.badges.primary}>Aisle {item.aisle}</span>
                  )}
                </div>
              </div>
            </CustomContextMenu>
          </CustomSwipeActions>
        ))}
      </div>

      {/* Notifications */}
      <CustomNotification {...notification} onClose={hideNotification} />
    </div>
  );
}
```

---

## 📱 Mobile-First Integration

### Responsive Behavior

```javascript
import { getDeviceType } from '../utils/customTheme';

function ResponsiveComponent() {
  const device = getDeviceType();

  return (
    <>
      {/* Mobile: Swipe actions + long-press menu */}
      {device === 'mobile' && (
        <CustomSwipeActions {...swipeProps}>
          <CustomContextMenu trigger="longPress" {...menuProps}>
            <ItemCard />
          </CustomContextMenu>
        </CustomSwipeActions>
      )}

      {/* Desktop: Right-click menu */}
      {device === 'desktop' && (
        <CustomContextMenu trigger="rightClick" {...menuProps}>
          <ItemCard />
        </CustomContextMenu>
      )}
    </>
  );
}
```

---

## 🎨 Theming All Components

### Ensure Consistency

```javascript
// All custom components automatically use customTheme
import { customTheme } from '../utils/customTheme';

// CustomPanel uses customTheme.zIndex.panel
// CustomNotification uses customTheme.zIndex.notification
// CustomContextMenu uses customTheme.zIndex.contextMenu
// CustomSearchBar uses customTheme.colors and customTheme.animations

// This ensures:
// ✅ No z-index conflicts
// ✅ Consistent colors
// ✅ Same animations
// ✅ Unified spacing
// ✅ Professional look
```

---

## 🚀 Quick Start Checklist

### 1. Add Search to Dashboard
```javascript
import CustomSearchBar from '../components/CustomSearchBar';

<CustomSearchBar
  onSearch={handleSearch}
  mdlEnabled={true}
  aisleEnabled={true}
  currentStore={currentStore}
/>
```

### 2. Add Swipe to ItemList
```javascript
import CustomSwipeActions from '../components/CustomSwipeActions';

<CustomSwipeActions
  leftActions={[{ icon: Trash2, onClick: deleteItem, color: 'bg-red-500' }]}
  rightActions={[{ icon: Edit2, onClick: editItem, color: 'bg-blue-500' }]}
>
  <ItemCard />
</CustomSwipeActions>
```

### 3. Add Context Menu to Items
```javascript
import CustomContextMenu from '../components/CustomContextMenu';

<CustomContextMenu
  items={[
    { label: 'Edit', icon: Edit2, onClick: editItem },
    { label: 'Delete', icon: Trash2, onClick: deleteItem }
  ]}
  trigger="both"
>
  <ItemCard />
</CustomContextMenu>
```

### 4. Use Notifications
```javascript
import { useNotification } from '../hooks/useNotification';

const { notification, hideNotification, success, ask } = useNotification();

success('Item added!');
ask('Delete item?', [
  { label: 'Delete', onClick: deleteItem },
  { label: 'Cancel', variant: 'outline' }
]);

<CustomNotification {...notification} onClose={hideNotification} />
```

---

## 🎯 Best Practices

### 1. Always Use customTheme
```javascript
// ✅ Good
import { customTheme } from '../utils/customTheme';
<div className={customTheme.cards.base}>

// ❌ Bad
<div className="bg-white border rounded-lg shadow-lg">
```

### 2. Combine Components
```javascript
// ✅ Swipe + Context Menu = Best UX
<CustomSwipeActions>
  <CustomContextMenu>
    <ItemCard />
  </CustomContextMenu>
</CustomSwipeActions>
```

### 3. Use MDL Integration
```javascript
// ✅ Enable MDL features
<CustomSearchBar mdlEnabled={true} aisleEnabled={true} />
```

### 4. Mobile-First
```javascript
// ✅ Check device type
const device = getDeviceType();
if (device === 'mobile') {
  // Use swipe actions
}
```

---

## 📊 Component Compatibility Matrix

| Component | Works With | MDL | Aisle | Mobile | Desktop |
|-----------|-----------|-----|-------|--------|---------|
| CustomSearchBar | MDL, Categories, Stores | ✅ | ✅ | ✅ | ✅ |
| CustomSwipeActions | ItemList, Cards | - | - | ✅ | ✅ |
| CustomContextMenu | Any component | - | ✅ | ✅ | ✅ |
| CustomNotification | All | ✅ | ✅ | ✅ | ✅ |
| CustomPanel | All | - | - | ✅ | ✅ |
| CustomKeypad | Number inputs | - | ✅ | ✅ | ✅ |

---

## 🔄 Migration from Old Code

### Replace Basic Search
```javascript
// Old
<input type="text" onChange={e => search(e.target.value)} />

// New
<CustomSearchBar onSearch={search} mdlEnabled={true} />
```

### Replace Delete Confirmation
```javascript
// Old
if (window.confirm('Delete item?')) {
  deleteItem();
}

// New
ask('Delete item?', [
  { label: 'Delete', onClick: deleteItem },
  { label: 'Cancel', variant: 'outline' }
]);
```

### Add Swipe Actions
```javascript
// Old
<ItemCard />

// New
<CustomSwipeActions
  leftActions={[{ icon: Trash2, onClick: deleteItem }]}
>
  <ItemCard />
</CustomSwipeActions>
```

---

## 🎉 Ready for AES Integration

All custom components are built with AES (Admin Editor System) integration in mind:

- ✅ Centralized theme (customTheme.js)
- ✅ Consistent styling
- ✅ Modular architecture
- ✅ Easy to extend
- ✅ Well-documented
- ✅ TypeScript-ready (JSDoc comments)

When AES is ready, these components will integrate seamlessly!
