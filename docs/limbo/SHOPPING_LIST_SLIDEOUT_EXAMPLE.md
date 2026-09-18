# Shopping List Slide-Out Implementation

## Overview

Use `CustomPanel` to create a beautiful slide-out panel that shows the full shopping list from anywhere on the page. This solves the UX problem of having to scroll down to see the list after adding items.

## Implementation Example

### 1. Add to Dashboard.js

```javascript
import CustomPanel from '../components/CustomPanel';
import { List, Plus, Trash2, Eye } from 'lucide-react';

// Inside Dashboard component, add state
const [showListPanel, setShowListPanel] = useState(false);

// Add button to toolbar (near top of page)
<button
  onClick={() => setShowListPanel(true)}
  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-md"
>
  <List className="w-5 h-5" />
  <span>View List ({items.length})</span>
</button>

// Add CustomPanel at end of component (before closing return)
<CustomPanel
  isOpen={showListPanel}
  onClose={() => setShowListPanel(false)}
  mode="slide-right"
  title={`${activeList?.name || 'Shopping List'} (${items.length} items)`}
  width="lg"
  scrollable={true}
  actions={[
    {
      label: 'Add Item',
      icon: Plus,
      onClick: () => {
        setShowListPanel(false);
        // Focus on add item input
        document.querySelector('input[placeholder*="Add"]')?.focus();
      },
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      label: 'Clear Checked',
      icon: Trash2,
      onClick: () => {
        // Clear checked items
        handleClearChecked();
      },
      color: 'bg-red-500 hover:bg-red-600'
    }
  ]}
>
  {/* Render the ItemList component inside */}
  <div className="p-4">
    <ItemList
      items={items}
      onToggleCheck={handleToggleCheck}
      onDelete={handleDeleteItem}
      onEdit={handleEditItem}
      // ... other props
    />
  </div>
</CustomPanel>
```

### 2. Alternative: Floating Button

Add a floating button that's always visible:

```javascript
{/* Floating List Button - Always visible */}
<button
  onClick={() => setShowListPanel(true)}
  className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full font-semibold shadow-2xl hover:shadow-3xl transition-all"
  title="View Shopping List"
>
  <List className="w-6 h-6" />
  <span className="hidden sm:inline">List</span>
  {items.length > 0 && (
    <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
      {items.length}
    </span>
  )}
</button>
```

### 3. Mobile Bottom Sheet Version

For mobile, use slide-up mode:

```javascript
// Detect device
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

// Use appropriate mode
<CustomPanel
  isOpen={showListPanel}
  onClose={() => setShowListPanel(false)}
  mode={isMobile ? 'slide-up' : 'slide-right'}
  title={`${activeList?.name || 'Shopping List'}`}
  width={isMobile ? 'full' : 'lg'}
  height={isMobile ? 'lg' : 'full'}
  // ... rest of props
>
  {/* Content */}
</CustomPanel>
```

### 4. With Stats Header

Add a stats section at the top of the panel:

```javascript
<CustomPanel
  isOpen={showListPanel}
  onClose={() => setShowListPanel(false)}
  mode="slide-right"
  title="Shopping List"
  width="lg"
>
  {/* Stats Header */}
  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-gray-200 dark:border-gray-700">
    <div className="grid grid-cols-3 gap-4 text-center">
      <div>
        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
          {items.length}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Total Items
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
          {items.filter(i => i.is_checked).length}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Found
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
          ${calculateTotal().toFixed(2)}
        </div>
        <div className="text-xs text-gray-600 dark:text-gray-400">
          Total
        </div>
      </div>
    </div>
  </div>

  {/* List Content */}
  <div className="p-4">
    <ItemList items={items} {...props} />
  </div>
</CustomPanel>
```

### 5. Quick Actions in Panel

Add quick actions within the panel:

```javascript
<CustomPanel
  isOpen={showListPanel}
  onClose={() => setShowListPanel(false)}
  mode="slide-right"
  title="Shopping List"
  width="lg"
>
  {/* Quick Actions Bar */}
  <div className="p-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex gap-2 flex-wrap">
    <button
      onClick={() => {/* Sort by aisle */}}
      className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <MapPin className="w-3 h-3 inline mr-1" />
      Sort by Aisle
    </button>
    <button
      onClick={() => {/* Sort by category */}}
      className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <ArrowUpDown className="w-3 h-3 inline mr-1" />
      Sort by Category
    </button>
    <button
      onClick={() => {/* Show only unchecked */}}
      className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-xs font-medium hover:bg-gray-100 dark:hover:bg-gray-700"
    >
      <Eye className="w-3 h-3 inline mr-1" />
      Hide Found
    </button>
  </div>

  {/* List */}
  <div className="p-4">
    <ItemList items={items} {...props} />
  </div>
</CustomPanel>
```

## Benefits

✅ **Better UX**
- No more scrolling to bottom
- Quick access from anywhere
- Floating button always visible

✅ **Clean Interface**
- Slides in smoothly
- Doesn't block main content
- Easy to dismiss

✅ **Mobile Friendly**
- Bottom sheet on mobile
- Side panel on desktop
- Touch-optimized

✅ **Feature Rich**
- Stats at a glance
- Quick actions
- Sorting/filtering
- Action buttons

## Advanced: Multiple Panels

You can have multiple panels for different purposes:

```javascript
const [showListPanel, setShowListPanel] = useState(false);
const [showStatsPanel, setShowStatsPanel] = useState(false);
const [showSettingsPanel, setShowSettingsPanel] = useState(false);

// List Panel (slide-right)
<CustomPanel
  isOpen={showListPanel}
  mode="slide-right"
  title="Shopping List"
  width="lg"
>
  {/* List content */}
</CustomPanel>

// Stats Panel (slide-left)
<CustomPanel
  isOpen={showStatsPanel}
  mode="slide-left"
  title="Statistics"
  width="md"
>
  {/* Stats content */}
</CustomPanel>

// Settings Panel (overlay)
<CustomPanel
  isOpen={showSettingsPanel}
  mode="overlay"
  title="Settings"
  width="md"
  height="auto"
>
  {/* Settings content */}
</CustomPanel>
```

## Next Steps

1. Add CustomPanel import to Dashboard.js
2. Add state for panel visibility
3. Add floating button or toolbar button
4. Wrap ItemList in CustomPanel
5. Add stats header (optional)
6. Add quick actions (optional)
7. Test on mobile and desktop
8. Deploy!

## Related Components

- `CustomKeypad` - For aisle entry
- `RadialActionMenu` - For quick actions
- `ItemList` - The list component itself
- `NextItemSuggestion` - Looking for Next feature
