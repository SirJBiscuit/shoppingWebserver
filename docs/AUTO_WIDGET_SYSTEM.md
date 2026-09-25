# CFS Auto Widget System

**Automatic hook generation for AVE widgets with built-in state management**

## 🎯 Overview

The Auto Widget System automatically creates smart, cache-enabled hooks for any AVE widget. No more manual state management!

## ✨ Features

- ✅ **Auto-generated hooks** - One function call creates everything
- ✅ **Smart State** - Built on `useSmartState` for optimistic updates
- ✅ **Cache Management** - Automatic caching with configurable expiry
- ✅ **AVE Integration** - Automatic EditableContainer wrapping
- ✅ **Error Recovery** - Automatic rollback on failures
- ✅ **CRUD Operations** - Add, update, delete with one line

---

## 🚀 Quick Start

### 1. Simple Data Widget

```javascript
import { createDataWidget } from '../hooks/useAutoWidget';

// Create the hook
const useBudgetWidget = createDataWidget('budget-tracker', '/api/budget');

// Use in component
const BudgetTracker = () => {
  const { data: budget, loading, wrapWithAVE } = useBudgetWidget();
  
  if (loading) return <div>Loading...</div>;
  
  return wrapWithAVE(
    <div className="budget-card">
      <h3>Budget</h3>
      <p>${budget?.total}</p>
    </div>
  );
};
```

### 2. Custom API Widget

```javascript
import { createAPIWidget } from '../hooks/useAutoWidget';
import * as shoppingAPI from '../api/shopping';

// Create hook with custom API
const useShoppingWidget = createAPIWidget('shopping-list', {
  fetch: () => shoppingAPI.getLists(),
  create: (data) => shoppingAPI.createList(data),
  update: (id, data) => shoppingAPI.updateList(id, data),
  delete: (id) => shoppingAPI.deleteList(id),
}, {
  cacheExpiry: 30,
  optimistic: true,
});

// Use in component
const ShoppingList = () => {
  const { 
    data: lists, 
    loading, 
    create, 
    update, 
    delete: deleteList,
    wrapWithAVE 
  } = useShoppingWidget();
  
  const handleCreate = async () => {
    await create({ name: 'New List' });
    // UI updates instantly (optimistic)
    // Syncs with server automatically
  };
  
  return wrapWithAVE(
    <div>
      {lists?.map(list => (
        <div key={list.id}>{list.name}</div>
      ))}
      <button onClick={handleCreate}>Add List</button>
    </div>
  );
};
```

### 3. Advanced Configuration

```javascript
import { createAutoWidget } from '../hooks/useAutoWidget';

const useAdvancedWidget = createAutoWidget('advanced-widget', {
  fetchData: async () => {
    const response = await fetch('/api/data');
    return response.json();
  },
  cacheKey: 'my_custom_cache_key',
  cacheExpiry: 60, // 60 seconds
  optimistic: true,
  autoSync: true,
  displayName: 'My Advanced Widget',
});

const AdvancedWidget = () => {
  const {
    data,
    loading,
    error,
    add,
    update,
    remove,
    refresh,
    props, // AVE properties
    isSelected,
    isEditorActive,
    wrapWithAVE,
  } = useAdvancedWidget();
  
  // Full control over CRUD operations
  const handleAdd = async (item) => {
    await add(item, async (data) => {
      // Custom API call
      const response = await fetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    });
  };
  
  return wrapWithAVE(
    <div style={props.customStyle}>
      {/* Your widget content */}
    </div>
  );
};
```

---

## 📚 API Reference

### `createDataWidget(widgetId, apiEndpoint, options)`

Creates a simple data-fetching widget.

**Parameters:**
- `widgetId` (string) - Unique widget identifier
- `apiEndpoint` (string) - API endpoint to fetch from
- `options` (object) - Optional configuration

**Returns:** Widget hook function

**Example:**
```javascript
const useBudget = createDataWidget('budget', '/api/budget', {
  cacheExpiry: 30,
  optimistic: true,
});
```

---

### `createAPIWidget(widgetId, api, options)`

Creates a widget with full CRUD operations.

**Parameters:**
- `widgetId` (string) - Unique widget identifier
- `api` (object) - API functions
  - `fetch` (function) - Fetch data
  - `create` (function) - Create item
  - `update` (function) - Update item
  - `delete` (function) - Delete item
- `options` (object) - Optional configuration

**Returns:** Widget hook function with CRUD methods

**Example:**
```javascript
const useItems = createAPIWidget('items', {
  fetch: () => itemsAPI.getAll(),
  create: (data) => itemsAPI.create(data),
  update: (id, data) => itemsAPI.update(id, data),
  delete: (id) => itemsAPI.delete(id),
});
```

---

### `createAutoWidget(widgetId, config)`

Advanced widget creator with full control.

**Parameters:**
- `widgetId` (string) - Unique widget identifier
- `config` (object) - Widget configuration
  - `fetchData` (function) - Data fetching function
  - `cacheKey` (string) - Cache key (default: widgetId)
  - `cacheExpiry` (number) - Cache expiry in seconds (default: 30)
  - `optimistic` (boolean) - Enable optimistic updates (default: true)
  - `autoSync` (boolean) - Auto-sync with server (default: true)
  - `displayName` (string) - Display name for AVE (default: widgetId)

**Returns:** Widget hook function

---

## 🎨 Hook Return Values

All widget hooks return an object with:

### Data & State
- `data` - Widget data
- `loading` - Loading state
- `error` - Error state

### CRUD Operations
- `add(data, apiFn)` - Add item
- `update(id, data, apiFn)` - Update item
- `remove(id, apiFn)` - Remove item
- `setData(data)` - Set data directly
- `refresh()` - Refresh from server

### AVE Integration
- `props` - Widget properties from AVE
- `isSelected` - Is widget selected in editor
- `isEditorActive` - Is AVE editor active
- `wrapWithAVE(children)` - Wrap component for AVE
- `handleSelect()` - Select widget handler

---

## 🔥 Real-World Examples

### Budget Tracker

```javascript
const useBudgetTracker = createDataWidget('budget-tracker', '/api/budget', {
  cacheExpiry: 60,
});

const BudgetTracker = () => {
  const { data, loading, refresh, wrapWithAVE } = useBudgetTracker();
  
  return wrapWithAVE(
    <div className="budget-card">
      <h3>Budget Tracker</h3>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div>Total: ${data?.total}</div>
          <div>Spent: ${data?.spent}</div>
          <div>Remaining: ${data?.remaining}</div>
          <button onClick={refresh}>Refresh</button>
        </>
      )}
    </div>
  );
};
```

### Shopping List Widget

```javascript
const useShoppingListWidget = createAPIWidget('shopping-list-widget', {
  fetch: () => shoppingAPI.getLists(),
  create: (data) => shoppingAPI.createList(data),
  update: (id, data) => shoppingAPI.updateList(id, data),
  delete: (id) => shoppingAPI.deleteList(id),
});

const ShoppingListWidget = () => {
  const { 
    data: lists, 
    loading, 
    create, 
    update, 
    delete: deleteList,
    wrapWithAVE,
    props,
  } = useShoppingListWidget();
  
  const handleAddList = async () => {
    await create({ name: 'New Shopping List' });
    // UI updates instantly, syncs in background
  };
  
  const handleRename = async (id, newName) => {
    await update(id, { name: newName });
    // Optimistic update, rolls back on error
  };
  
  return wrapWithAVE(
    <div style={{ backgroundColor: props.bgColor }}>
      <h3>Shopping Lists</h3>
      {lists?.map(list => (
        <div key={list.id}>
          <span>{list.name}</span>
          <button onClick={() => handleRename(list.id, 'Updated')}>
            Rename
          </button>
          <button onClick={() => deleteList(list.id)}>
            Delete
          </button>
        </div>
      ))}
      <button onClick={handleAddList}>Add List</button>
    </div>
  );
};
```

---

## 🎯 Benefits

### For Developers
- ✅ **Less Code** - One function call vs 100+ lines
- ✅ **Consistent** - All widgets work the same way
- ✅ **Type-Safe** - Full TypeScript support (future)
- ✅ **Testable** - Easy to mock and test

### For Users
- ✅ **Fast** - Optimistic updates feel instant
- ✅ **Reliable** - Automatic error recovery
- ✅ **Offline** - Works with cached data
- ✅ **Smooth** - No loading flickers

### For AVE
- ✅ **Automatic** - No manual EditableContainer wrapping
- ✅ **Properties** - Widget props from AVE automatically
- ✅ **Selection** - Selection handling built-in
- ✅ **Editable** - All widgets instantly AVE-compatible

---

## 🔄 Migration Guide

### Before (Manual State)

```javascript
const MyWidget = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isEditorActive, selectWidget, selectedWidget } = useEditor();
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    const response = await fetch('/api/data');
    setData(await response.json());
    setLoading(false);
  };
  
  const handleAdd = async (item) => {
    const response = await fetch('/api/data', {
      method: 'POST',
      body: JSON.stringify(item),
    });
    await loadData(); // Reload everything
  };
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="My Widget"
      onSelect={() => selectWidget('my-widget')}
      isSelected={selectedWidget === 'my-widget'}
    >
      {/* Widget content */}
    </EditableContainer>
  );
};
```

### After (Auto Widget)

```javascript
const useMyWidget = createAPIWidget('my-widget', {
  fetch: () => fetch('/api/data').then(r => r.json()),
  create: (data) => fetch('/api/data', {
    method: 'POST',
    body: JSON.stringify(data),
  }).then(r => r.json()),
});

const MyWidget = () => {
  const { data, loading, create, wrapWithAVE } = useMyWidget();
  
  const handleAdd = async (item) => {
    await create(item); // Instant UI update, auto-sync
  };
  
  return wrapWithAVE(
    <div>{/* Widget content */}</div>
  );
};
```

**Result:** 50+ lines → 15 lines! 🎉

---

## 🚀 Next Steps

1. **Create your first auto widget**
2. **Migrate existing widgets** to use auto hooks
3. **Enjoy instant updates** and automatic caching
4. **Build faster** with less code

---

## 📖 Related Docs

- [CFS Smart State Guide](./CFS_SMART_STATE_GUIDE.md)
- [AVE Quick Guide](./AVE_QUICK_GUIDE.md)
- [Widget Registry](../frontend/src/utils/widgetRegistry.js)

---

**Built with ❤️ for the CFS ecosystem**
