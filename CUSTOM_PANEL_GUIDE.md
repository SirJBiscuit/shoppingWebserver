# CustomPanel Component Guide

## Overview

`CustomPanel` is a versatile, reusable panel component that supports multiple display modes, animations, and interaction patterns. Perfect for slide-outs, overlays, modals, and more.

## Features

✅ **7 Display Modes**
- `slide-left`: Slides in from left side
- `slide-right`: Slides in from right side  
- `slide-up`: Slides up from bottom
- `slide-down`: Slides down from top
- `overlay`: Centered modal overlay
- `corner`: Small corner panel
- `fullscreen`: Full screen takeover

✅ **Interaction Options**
- Draggable panels
- Scrollable content
- Resizable (maximize/minimize)
- Auto-close on backdrop click
- Custom action buttons

✅ **Responsive & Animated**
- Smooth framer-motion animations
- Touch-friendly
- Dark mode support
- Customizable sizes

## Basic Usage

```javascript
import CustomPanel from '../components/CustomPanel';

function MyComponent() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsPanelOpen(true)}>
        Open Panel
      </button>

      <CustomPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        mode="slide-right"
        title="My Panel"
      >
        <div className="p-4">
          <p>Panel content goes here</p>
        </div>
      </CustomPanel>
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | `false` | Panel open state |
| `onClose` | function | - | Close callback |
| `mode` | string | `'slide-right'` | Display mode (see modes below) |
| `title` | string | - | Panel title |
| `children` | ReactNode | - | Panel content |
| `width` | string | `'md'` | Width: 'sm', 'md', 'lg', 'xl', 'full' or custom px |
| `height` | string | `'full'` | Height: 'auto', 'sm', 'md', 'lg', 'full' or custom px |
| `scrollable` | boolean | `true` | Enable content scrolling |
| `draggable` | boolean | `false` | Enable panel dragging |
| `resizable` | boolean | `false` | Enable maximize/minimize |
| `showBackdrop` | boolean | `true` | Show backdrop overlay |
| `closeOnBackdrop` | boolean | `true` | Close when clicking backdrop |
| `className` | string | `''` | Additional CSS classes |
| `actions` | array | `[]` | Footer action buttons |

## Display Modes

### 1. Slide Right (Default)
Perfect for side navigation, settings, filters

```javascript
<CustomPanel
  isOpen={isOpen}
  onClose={onClose}
  mode="slide-right"
  title="Shopping List"
  width="lg"
>
  {/* Your list items */}
</CustomPanel>
```

### 2. Slide Left
Alternative side panel from left

```javascript
<CustomPanel
  mode="slide-left"
  title="Menu"
  width="md"
>
  {/* Navigation menu */}
</CustomPanel>
```

### 3. Slide Up
Bottom sheet style (great for mobile)

```javascript
<CustomPanel
  mode="slide-up"
  title="Quick Actions"
  height="md"
>
  {/* Action buttons */}
</CustomPanel>
```

### 4. Slide Down
Top notification/banner style

```javascript
<CustomPanel
  mode="slide-down"
  title="Notifications"
  height="sm"
>
  {/* Notifications */}
</CustomPanel>
```

### 5. Overlay
Centered modal dialog

```javascript
<CustomPanel
  mode="overlay"
  title="Confirm Action"
  width="md"
  height="auto"
>
  {/* Confirmation dialog */}
</CustomPanel>
```

### 6. Corner
Small corner panel (bottom-right)

```javascript
<CustomPanel
  mode="corner"
  title="Help"
  width="sm"
  height="sm"
  showBackdrop={false}
>
  {/* Help widget */}
</CustomPanel>
```

### 7. Fullscreen
Full screen takeover

```javascript
<CustomPanel
  mode="fullscreen"
  title="Item Editor"
>
  {/* Full editor interface */}
</CustomPanel>
```

## Size Presets

### Width
- `sm`: 320px
- `md`: 480px
- `lg`: 640px
- `xl`: 800px
- `full`: 100vw
- Custom: `'600px'`, `'50vw'`, etc.

### Height
- `auto`: Content height
- `sm`: 40vh
- `md`: 60vh
- `lg`: 80vh
- `full`: 100vh
- Custom: `'500px'`, `'75vh'`, etc.

## Real-World Examples

### Example 1: Shopping List Slide-Out

```javascript
import { List, Plus, Trash2 } from 'lucide-react';

function ShoppingListPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState([]);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        <List className="w-5 h-5" />
        View List ({items.length})
      </button>

      <CustomPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        mode="slide-right"
        title="Shopping List"
        width="lg"
        scrollable={true}
        actions={[
          {
            label: 'Add Item',
            icon: Plus,
            onClick: () => {/* Add item */},
            color: 'bg-green-500 hover:bg-green-600'
          },
          {
            label: 'Clear All',
            icon: Trash2,
            onClick: () => {/* Clear */},
            color: 'bg-red-500 hover:bg-red-600'
          }
        ]}
      >
        <div className="p-4 space-y-2">
          {items.map(item => (
            <div key={item.id} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
              {item.name}
            </div>
          ))}
        </div>
      </CustomPanel>
    </>
  );
}
```

### Example 2: Draggable Notes Panel

```javascript
<CustomPanel
  isOpen={notesOpen}
  onClose={() => setNotesOpen(false)}
  mode="corner"
  title="Quick Notes"
  width="sm"
  height="md"
  draggable={true}
  scrollable={true}
  showBackdrop={false}
  resizable={true}
>
  <div className="p-4">
    <textarea
      className="w-full h-full border rounded p-2"
      placeholder="Type your notes..."
    />
  </div>
</CustomPanel>
```

### Example 3: Full Screen Item Editor

```javascript
import { Save, X } from 'lucide-react';

<CustomPanel
  isOpen={editMode}
  onClose={() => setEditMode(false)}
  mode="fullscreen"
  title="Edit Item Details"
  scrollable={true}
  actions={[
    {
      label: 'Cancel',
      icon: X,
      onClick: () => setEditMode(false),
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      label: 'Save Changes',
      icon: Save,
      onClick: handleSave,
      color: 'bg-blue-500 hover:bg-blue-600'
    }
  ]}
>
  <div className="p-8 max-w-4xl mx-auto">
    {/* Full editor form */}
  </div>
</CustomPanel>
```

### Example 4: Mobile Bottom Sheet

```javascript
<CustomPanel
  isOpen={showFilters}
  onClose={() => setShowFilters(false)}
  mode="slide-up"
  title="Filter Options"
  height="md"
  scrollable={true}
>
  <div className="p-4 space-y-4">
    <div>
      <label className="block text-sm font-medium mb-2">Category</label>
      <select className="w-full border rounded p-2">
        <option>All</option>
        <option>Produce</option>
        <option>Dairy</option>
      </select>
    </div>
    {/* More filters */}
  </div>
</CustomPanel>
```

### Example 5: Notification Banner

```javascript
<CustomPanel
  isOpen={showNotification}
  onClose={() => setShowNotification(false)}
  mode="slide-down"
  title="System Update"
  height="auto"
  showBackdrop={false}
  closeOnBackdrop={false}
>
  <div className="p-4 bg-blue-50 dark:bg-blue-900/20">
    <p className="text-sm">
      A new version is available. Please refresh to update.
    </p>
  </div>
</CustomPanel>
```

### Example 6: Confirmation Dialog

```javascript
import { Check, X } from 'lucide-react';

<CustomPanel
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  mode="overlay"
  title="Confirm Delete"
  width="md"
  height="auto"
  scrollable={false}
  actions={[
    {
      label: 'Cancel',
      icon: X,
      onClick: () => setShowConfirm(false),
      color: 'bg-gray-500 hover:bg-gray-600'
    },
    {
      label: 'Delete',
      icon: Check,
      onClick: handleDelete,
      color: 'bg-red-500 hover:bg-red-600'
    }
  ]}
>
  <div className="p-6">
    <p className="text-gray-700 dark:text-gray-300">
      Are you sure you want to delete this item? This action cannot be undone.
    </p>
  </div>
</CustomPanel>
```

## Advanced Features

### Custom Styling

```javascript
<CustomPanel
  className="border-4 border-blue-500 rounded-2xl"
  // ... other props
>
  {/* Content */}
</CustomPanel>
```

### Dynamic Sizing

```javascript
const [panelWidth, setPanelWidth] = useState('md');

<CustomPanel
  width={panelWidth}
  // ... other props
>
  <div className="p-4">
    <button onClick={() => setPanelWidth('lg')}>
      Expand
    </button>
  </div>
</CustomPanel>
```

### Nested Panels

```javascript
<CustomPanel mode="slide-right" title="Main Panel">
  <div className="p-4">
    <button onClick={() => setNestedOpen(true)}>
      Open Details
    </button>
    
    <CustomPanel
      isOpen={nestedOpen}
      mode="overlay"
      title="Details"
    >
      {/* Nested content */}
    </CustomPanel>
  </div>
</CustomPanel>
```

## Animation Customization

All panels use framer-motion for smooth animations. The component automatically handles:
- Slide transitions
- Scale transitions
- Opacity fades
- Spring physics for dragging

## Best Practices

1. **Choose the right mode**
   - `slide-right/left`: Navigation, lists, settings
   - `slide-up`: Mobile actions, filters
   - `overlay`: Confirmations, forms
   - `fullscreen`: Complex editors
   - `corner`: Persistent widgets

2. **Size appropriately**
   - Mobile: Use `slide-up` with `height="md"`
   - Desktop: Use `slide-right` with `width="lg"`
   - Dialogs: Use `overlay` with `width="md"` `height="auto"`

3. **Scrolling**
   - Enable for long content
   - Disable for simple dialogs

4. **Backdrop**
   - Show for modal interactions
   - Hide for persistent widgets

5. **Actions**
   - Limit to 2-3 primary actions
   - Use clear, action-oriented labels
   - Color-code by importance (green=save, red=delete)

## Accessibility

- ✅ Keyboard navigation (ESC to close)
- ✅ Focus management
- ✅ ARIA labels on buttons
- ✅ Screen reader friendly
- ✅ Touch-friendly hit targets (44px min)

## Performance

- Lazy rendering (only renders when open)
- AnimatePresence for smooth unmounting
- Optimized animations with framer-motion
- No layout shifts

## Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers
- ✅ Dark mode

## Migration from Old Modals

**Before:**
```javascript
{showModal && (
  <div className="fixed inset-0 bg-black/50">
    <div className="fixed right-0 top-0 h-full w-96 bg-white">
      {/* Content */}
    </div>
  </div>
)}
```

**After:**
```javascript
<CustomPanel
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  mode="slide-right"
  width="md"
>
  {/* Content */}
</CustomPanel>
```

## Combining with Other Components

### With CustomKeypad

```javascript
<CustomPanel mode="slide-right" title="Settings">
  <div className="p-4">
    <button onClick={() => setShowKeypad(true)}>
      Enter PIN
    </button>
    
    {showKeypad && (
      <CustomKeypad
        title="Enter PIN"
        // ... keypad props
      />
    )}
  </div>
</CustomPanel>
```

### With RadialActionMenu

```javascript
<CustomPanel mode="slide-right" title="Item Details">
  <div className="p-4">
    <RadialActionMenu
      // ... radial menu props
    />
  </div>
</CustomPanel>
```

## Future Enhancements

- [ ] Swipe to close on mobile
- [ ] Multiple panels stacking
- [ ] Panel history/navigation
- [ ] Keyboard shortcuts
- [ ] Auto-save state
- [ ] Panel templates
- [ ] Gesture controls
- [ ] Split panels

## Support

For issues or questions:
1. Check this guide
2. Review examples above
3. Test on all device types
4. Check browser console for errors
