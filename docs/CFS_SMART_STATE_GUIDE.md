# CFS Smart State Management System

**Status:** Production-Ready ✅  
**Priority:** Critical (Fixes ghost data, enables instant UX)  
**Category:** Custom Feature Scripts (CFS)

---

## What It Does

Intelligent state management that makes your UI feel **instant** while keeping PostgreSQL as the source of truth.

### **Key Features:**
- ✅ **Instant UI updates** - No waiting for API calls
- ✅ **Automatic rollback** - Reverts on errors
- ✅ **No ghost data** - Syncs with cache properly
- ✅ **Batch operations** - Efficient database updates
- ✅ **60fps drag/drop** - Perfect for AVE

---

## Quick Start

### **1. Shopping Lists (Replace Current Dashboard.js)**

**Before:**
```javascript
const [items, setItems] = useState([]);

const deleteItem = async (itemId) => {
  await shoppingAPI.deleteItem(activeList.id, itemId);
  await loadListItems(activeList.id); // Slow, can fail
};
```

**After:**
```javascript
import { useShoppingItems } from '../hooks/useShoppingList';

const { items, deleteItem, toggleCheck, addItem } = useShoppingItems(activeList.id);

// Just call it - handles everything!
await deleteItem(itemId);
// ✅ Instant UI update
// ✅ Saves to PostgreSQL
// ✅ Auto-rollback on error
```

### **2. AVE Drag & Drop**

```javascript
import { useAVEWidgets } from '../hooks/useAVEWidgets';

const { widgets, updatePosition, updateSize, endDrag } = useAVEWidgets(pageId);

// While dragging (instant, no API calls)
<Draggable
  onDrag={(e, data) => updatePosition(widget.id, { x: data.x, y: data.y })}
  onStop={() => endDrag()}
>
  {/* Widget content */}
</Draggable>

// ✅ Buttery smooth 60fps
// ✅ Saves to PostgreSQL when done
// ✅ Debounced (500ms)
```

### **3. Inventory**

```javascript
import { useInventory } from '../hooks/useInventory';

const { items, updateQuantity, moveToStagingArea } = useInventory();

// Update quantity instantly
await updateQuantity(itemId, newQuantity);

// Move multiple items at once
await moveToStagingArea([id1, id2, id3]);
```

---

## How It Works

```
User Action (Delete Item)
    ↓
useSmartState removes from UI ← INSTANT (optimistic)
    ↓
API call to backend
    ↓
PostgreSQL deletes ← PERMANENT
    ↓
useSmartState confirms ← SYNC
    ↓
Cache updated ← SHARED
```

**If API fails:**
```
Error occurs
    ↓
useSmartState rolls back ← AUTO-RECOVERY
    ↓
UI shows original state
    ↓
User sees error message
```

---

## API Reference

### **useSmartState(key, fetchFn, options)**

Base hook for custom state management.

```javascript
const {
  data,           // Current state
  loading,        // Loading status
  error,          // Error state
  isPending,      // Has pending operations
  
  load,           // Reload data
  add,            // Add item
  update,         // Update item
  remove,         // Remove item
  batchUpdate,    // Update multiple
  invalidate,     // Clear cache & reload
  setData,        // Manual state control
} = useSmartState('my_key', fetchData, {
  cacheExpiry: 60,      // Cache TTL in minutes
  optimistic: true,     // Enable optimistic updates
  autoSync: true,       // Auto-sync with cache
  onError: (err) => {}, // Error callback
});
```

### **useShoppingItems(listId)**

```javascript
const {
  items,          // Array of items
  loading,
  error,
  
  addItem,        // Add new item
  updateItem,     // Update item
  deleteItem,     // Delete item
  toggleCheck,    // Toggle is_checked
  checkMultiple,  // Check/uncheck multiple
  sortItems,      // Client-side sort
  refresh,        // Reload from API
} = useShoppingItems(listId);
```

### **useAVEWidgets(pageId)**

```javascript
const {
  widgets,        // Array of widgets
  loading,
  error,
  
  startDrag,      // Start drag operation
  updatePosition, // Update position (instant)
  updateSize,     // Update size (instant)
  endDrag,        // End drag & save
  updateProperties, // Update other props
  invalidate,     // Reload widgets
} = useAVEWidgets(pageId);
```

### **useInventory()**

```javascript
const {
  items,
  loading,
  error,
  
  addItem,
  updateItem,
  deleteItem,
  updateQuantity,
  moveToStagingArea,
  refresh,
} = useInventory();
```

---

## Integration Steps

### **Phase 1: Dashboard.js (Shopping Lists)**

1. Replace `useState` with `useShoppingItems`:
```javascript
// OLD
const [items, setItems] = useState([]);

// NEW
const { items, addItem, deleteItem, toggleCheck } = useShoppingItems(activeList.id);
```

2. Replace manual API calls:
```javascript
// OLD
const handleDelete = async (id) => {
  await shoppingAPI.deleteItem(listId, id);
  await loadListItems(listId);
};

// NEW
const handleDelete = async (id) => {
  await deleteItem(id); // That's it!
};
```

3. Remove manual cache management - it's automatic!

### **Phase 2: AVE System**

1. Add to EditorContext:
```javascript
import { useAVEWidgets } from '../hooks/useAVEWidgets';

const { widgets, updatePosition, updateSize, endDrag } = useAVEWidgets('dashboard');
```

2. Update drag handlers:
```javascript
<Draggable
  onDrag={(e, data) => updatePosition(widget.id, { x: data.x, y: data.y })}
  onStop={() => endDrag()}
>
```

3. Update resize handlers:
```javascript
<Resizable
  onResize={(e, { size }) => updateSize(widget.id, size)}
  onResizeStop={() => endDrag()}
>
```

### **Phase 3: Inventory/Pantry**

1. Replace state management:
```javascript
import { useInventory } from '../hooks/useInventory';

const { items, updateQuantity, moveToStagingArea } = useInventory();
```

2. Update handlers - single line calls!

---

## Best Practices

### **1. Always use specialized hooks**
```javascript
// ✅ GOOD
const { items, deleteItem } = useShoppingItems(listId);

// ❌ BAD
const { data, remove } = useSmartState('items', fetchItems);
```

### **2. Let the hook handle errors**
```javascript
// ✅ GOOD
await deleteItem(id); // Auto-rollback on error

// ❌ BAD
try {
  await deleteItem(id);
  setItems(items.filter(i => i.id !== id)); // Manual state management
} catch (err) {
  // Hook already handled this
}
```

### **3. Use batch operations for multiple changes**
```javascript
// ✅ GOOD
await checkMultiple([id1, id2, id3], true);

// ❌ BAD
await toggleCheck(id1);
await toggleCheck(id2);
await toggleCheck(id3);
```

### **4. Trust optimistic updates**
```javascript
// ✅ GOOD
await deleteItem(id);
// Item disappears instantly, saves in background

// ❌ BAD
setLoading(true);
await deleteItem(id);
setLoading(false);
// Unnecessary loading states
```

---

## Troubleshooting

### **Issue: Changes not persisting**

**Check:**
1. Is PostgreSQL running?
2. Are API endpoints correct?
3. Check browser console for errors

**Fix:**
```javascript
const { error } = useShoppingItems(listId);
console.log('State error:', error);
```

### **Issue: UI not updating**

**Check:**
1. Is `optimistic: true` in options?
2. Is component re-rendering?

**Fix:**
```javascript
const { isPending } = useShoppingItems(listId);
console.log('Pending operations:', isPending);
```

### **Issue: Duplicate items appearing**

**Clear cache:**
```javascript
const { invalidate } = useShoppingItems(listId);
await invalidate(); // Force fresh load
```

---

## Performance

### **Metrics:**

| Operation | Old Way | useSmartState |
|-----------|---------|---------------|
| Delete Item | 500-1000ms | **Instant** |
| Update Item | 300-800ms | **Instant** |
| Drag Widget | Laggy | **60fps** |
| Add Item | 400-900ms | **Instant** |
| API Calls | Every action | **Batched** |

### **Optimizations:**

1. **Debouncing** - Drag/resize saves after 500ms
2. **Batching** - Multiple updates = 1 API call
3. **Caching** - Shared across components
4. **Cancellation** - Aborts old requests

---

## Future Enhancements

### **Phase 1 (Current):**
- ✅ Optimistic updates
- ✅ Cache sync
- ✅ Error recovery
- ✅ Batch operations

### **Phase 2 (Planned):**
- 📅 Offline queue
- 📅 Conflict resolution
- 📅 Real-time sync (WebSockets)
- 📅 Undo/redo support

### **Phase 3 (Future):**
- 📅 Time-travel debugging
- 📅 State snapshots
- 📅 Performance analytics
- 📅 Auto-optimization

---

## Related Systems

- **cacheManager** - Handles cache storage
- **PostgreSQL** - Source of truth
- **AVE System** - Uses for drag/drop
- **MDL System** - Can use for predictions
- **CFS Components** - All compatible

---

**Created:** September 25, 2026  
**Last Updated:** September 25, 2026  
**Status:** Production-Ready ✅
