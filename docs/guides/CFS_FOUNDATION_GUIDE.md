# CFS (Custom Feature Scripts) Foundation Guide

**Complete widget system for AES (Admin Editor System) integration**

---

## 🎯 Overview

The CFS Foundation provides a universal widget configuration and rendering system that:

✅ **Works with ALL existing components** (CustomPanel, CustomKeypad, CustomNotification, etc.)  
✅ **Enables full AES functionality** (drag-drop, animations, responsive, etc.)  
✅ **Backward compatible** - Existing code continues to work  
✅ **Future-proof** - Easy to extend with new widgets  
✅ **Type-safe** - Comprehensive configuration schema  

---

## 📦 Core Components

### 1. **widgetConfig.js** - Configuration System
Central configuration for all widgets with:
- Widget types (50+ types including all our custom components)
- Default configuration schema
- Animation presets (from AES.md)
- Responsive auto-adaptation rules
- Import/export functionality

### 2. **WidgetRenderer.js** - Universal Renderer
Renders ANY widget based on configuration:
- Supports all existing custom components
- Handles animations with Framer Motion
- Responsive behavior
- Conditional rendering
- Nested widgets

### 3. **useWidget.js** - Widget Management Hooks
Three powerful hooks:
- `useWidget` - Manage single widget with undo/redo
- `useWidgetCollection` - Manage multiple widgets
- `useResponsiveWidget` - Handle responsive behavior

---

## 🚀 Quick Start

### Using with Existing Components

```javascript
import WidgetRenderer from '../components/WidgetRenderer';
import { createWidgetConfig, WIDGET_TYPES } from '../utils/widgetConfig';

// Create a CustomPanel widget
const panelConfig = createWidgetConfig(WIDGET_TYPES.CUSTOM_PANEL, {
  content: {
    title: 'My Panel'
  },
  layout: {
    position: 'right',
    width: '400px'
  },
  animation: {
    type: 'panelSlideIn'
  }
});

// Render it
<WidgetRenderer 
  config={panelConfig}
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
>
  <p>Panel content here</p>
</WidgetRenderer>
```

### Using the Hook

```javascript
import { useWidget } from '../hooks/useWidget';
import { WIDGET_TYPES } from '../utils/widgetConfig';

function MyComponent() {
  const {
    config,
    updateProperty,
    setAnimation,
    undo,
    redo,
    canUndo,
    canRedo
  } = useWidget(WIDGET_TYPES.BUTTON, {
    content: { text: 'Click Me' },
    style: { backgroundColor: '#10b981' }
  });

  return (
    <div>
      <WidgetRenderer config={config} />
      
      <button onClick={() => setAnimation('hoverScale')}>
        Add Hover Animation
      </button>
      
      <button onClick={undo} disabled={!canUndo}>Undo</button>
      <button onClick={redo} disabled={!canRedo}>Redo</button>
    </div>
  );
}
```

---

## 🎨 Widget Types

### Existing Custom Components
All our custom components are supported:

```javascript
WIDGET_TYPES.CUSTOM_PANEL           // CustomPanel.js
WIDGET_TYPES.CUSTOM_KEYPAD          // CustomKeypad.js
WIDGET_TYPES.CUSTOM_NOTIFICATION    // CustomNotification.js
WIDGET_TYPES.CUSTOM_PRICE_BADGE     // CustomPriceBadge.js
WIDGET_TYPES.CUSTOM_RADIAL_MENU     // CustomRadialMenu.js
WIDGET_TYPES.CUSTOM_SEARCH_BAR      // CustomSearchBar.js
WIDGET_TYPES.CUSTOM_SWIPE_ACTIONS   // CustomSwipeActions.js
WIDGET_TYPES.CUSTOM_CONTEXT_MENU    // CustomContextMenu.js
```

### Shopping List Widgets
```javascript
WIDGET_TYPES.ITEM_LIST              // ItemList.js
WIDGET_TYPES.NEXT_ITEM_SUGGESTION   // NextItemSuggestion.js
WIDGET_TYPES.BUDGET_TRACKER         // BudgetTracker.js
WIDGET_TYPES.PANTRY_QUICK_VIEW      // PantryQuickView.js
```

### Basic Widgets
```javascript
WIDGET_TYPES.BUTTON
WIDGET_TYPES.INPUT
WIDGET_TYPES.TEXT
WIDGET_TYPES.ICON
WIDGET_TYPES.BADGE
WIDGET_TYPES.IMAGE
```

### Layout Widgets
```javascript
WIDGET_TYPES.CONTAINER
WIDGET_TYPES.FLEX
WIDGET_TYPES.GRID
WIDGET_TYPES.SECTION
WIDGET_TYPES.SPACER
```

---

## 🎬 Animation System

### Using Presets

```javascript
import { applyAnimationPreset, ANIMATION_PRESETS } from '../utils/widgetConfig';

// Apply preset to config
const animatedConfig = applyAnimationPreset(config, 'slideInLeft');

// Available presets:
// Entrance: fadeIn, slideInLeft, slideInRight, slideInUp, slideInDown, scaleIn, bounceIn
// Exit: fadeOut, slideOutLeft, slideOutRight
// Hover: hoverScale, hoverLift, hoverGlow
// Tap: tapShrink, tapBounce
// Continuous: pulse, rotate, float
// Custom: panelSlideIn, panelSlideUp
```

### Custom Animations

```javascript
const config = createWidgetConfig(WIDGET_TYPES.BUTTON, {
  animation: {
    enabled: true,
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    whileHover: { scale: 1.1, rotate: 5 },
    whileTap: { scale: 0.9 },
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 20
    }
  }
});
```

---

## 📱 Responsive System

### Auto-Adaptation

The system automatically adapts widgets for mobile/tablet:

```javascript
const config = createWidgetConfig(WIDGET_TYPES.BUTTON, {
  responsive: {
    enabled: true,
    autoAdapt: true  // Auto-scale and adapt for mobile/tablet
  },
  style: {
    fontSize: '16px',  // Desktop: 16px, Tablet: 14px, Mobile: 12px (auto)
  },
  spacing: {
    padding: { top: 12, right: 24, bottom: 12, left: 24 }  // Auto-scaled
  }
});
```

### Manual Breakpoints

```javascript
const config = createWidgetConfig(WIDGET_TYPES.CONTAINER, {
  responsive: {
    enabled: true,
    autoAdapt: false,  // Manual control
    desktop: {
      layout: { width: '1200px' }
    },
    tablet: {
      layout: { width: '768px' }
    },
    mobile: {
      layout: { width: '100%' }
    }
  }
});
```

### Using the Hook

```javascript
import { useResponsiveWidget } from '../hooks/useWidget';

function MyComponent() {
  const { config, breakpoint, isMobile } = useResponsiveWidget(baseConfig);
  
  return (
    <div>
      <p>Current breakpoint: {breakpoint}</p>
      <WidgetRenderer config={config} />
    </div>
  );
}
```

---

## 🔧 Configuration Schema

### Complete Widget Config

```javascript
{
  id: 'widget_123',
  type: 'button',
  name: 'My Button',
  version: '1.0.0',
  
  layout: {
    position: 'relative',  // relative, absolute, fixed
    x: 0,
    y: 0,
    width: 'auto',
    height: 'auto',
    minWidth: null,
    maxWidth: null,
    zIndex: 'auto'
  },
  
  spacing: {
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    padding: { top: 8, right: 16, bottom: 8, left: 16 },
    gap: 8
  },
  
  style: {
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    borderColor: '#059669',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    opacity: 1
  },
  
  content: {
    text: 'Click Me',
    icon: 'Check',
    iconPosition: 'left',
    iconSize: 20
  },
  
  animation: {
    enabled: true,
    type: 'fade',
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 }
  },
  
  interaction: {
    onClick: 'handleClick',
    disabled: false,
    loading: false
  },
  
  responsive: {
    enabled: true,
    autoAdapt: true
  },
  
  conditions: {
    showIf: 'user.isAdmin',
    requiredRole: 'admin'
  },
  
  children: []
}
```

---

## 💡 Advanced Features

### Nested Widgets

```javascript
const containerConfig = createWidgetConfig(WIDGET_TYPES.FLEX, {
  layout: { direction: 'row', gap: 16 },
  children: [
    createWidgetConfig(WIDGET_TYPES.BUTTON, {
      content: { text: 'Button 1' }
    }),
    createWidgetConfig(WIDGET_TYPES.BUTTON, {
      content: { text: 'Button 2' }
    })
  ]
});
```

### Managing Collections

```javascript
import { useWidgetCollection } from '../hooks/useWidget';

function Dashboard() {
  const {
    widgets,
    addWidget,
    updateWidget,
    removeWidget,
    duplicateWidget,
    exportAll,
    importAll
  } = useWidgetCollection();

  const handleAddButton = () => {
    addWidget(WIDGET_TYPES.BUTTON, {
      content: { text: 'New Button' }
    });
  };

  const handleExport = () => {
    const json = exportAll();
    // Save to file or database
  };

  return (
    <div>
      {widgets.map(config => (
        <WidgetRenderer key={config.id} config={config} />
      ))}
    </div>
  );
}
```

### Conditional Rendering

```javascript
const config = createWidgetConfig(WIDGET_TYPES.BUTTON, {
  conditions: {
    showIf: 'props.user.role === "admin"',
    hideIf: 'props.item.is_deleted'
  }
});

<WidgetRenderer 
  config={config} 
  user={{ role: 'admin' }}
  item={{ is_deleted: false }}
/>
```

---

## 🔄 Migration Guide

### Converting Existing Components

**Before:**
```javascript
<CustomPanel
  title="My Panel"
  isOpen={isOpen}
  onClose={handleClose}
  position="right"
  width="400px"
>
  Content here
</CustomPanel>
```

**After:**
```javascript
const panelConfig = createWidgetConfig(WIDGET_TYPES.CUSTOM_PANEL, {
  content: { title: 'My Panel' },
  layout: { position: 'right', width: '400px' }
});

<WidgetRenderer
  config={panelConfig}
  isOpen={isOpen}
  onClose={handleClose}
>
  Content here
</WidgetRenderer>
```

**Benefits:**
- Same functionality
- Plus: animations, responsive, conditions, export/import
- Backward compatible - old code still works!

---

## 🎯 Next Steps

### For AES Integration

1. **Widget Library** - Visual library of all widgets
2. **Drag & Drop** - Drag widgets onto canvas
3. **Properties Panel** - Edit widget properties visually
4. **Live Preview** - See changes in real-time
5. **Save/Load** - Save layouts to database

### For Dashboard

1. Create dashboard layout with widget configs
2. Store configs in database
3. Load and render with WidgetRenderer
4. Allow admin to customize via AES editor

---

## 📚 API Reference

### createWidgetConfig(type, overrides)
Creates a new widget configuration.

**Parameters:**
- `type` (string) - Widget type from WIDGET_TYPES
- `overrides` (object) - Override default config

**Returns:** Widget configuration object

### applyAnimationPreset(config, presetName)
Applies an animation preset to a widget.

**Parameters:**
- `config` (object) - Widget configuration
- `presetName` (string) - Name from ANIMATION_PRESETS

**Returns:** Updated widget configuration

### autoAdaptWidget(config, breakpoint)
Auto-adapts widget for responsive breakpoint.

**Parameters:**
- `config` (object) - Widget configuration
- `breakpoint` (string) - 'mobile', 'tablet', or 'desktop'

**Returns:** Adapted widget configuration

### mergeWidgetConfigs(base, override)
Merges two widget configurations.

**Parameters:**
- `base` (object) - Base configuration
- `override` (object) - Override configuration

**Returns:** Merged configuration

---

## ✅ Summary

The CFS Foundation provides:

1. ✅ **Universal widget system** - Works with all components
2. ✅ **Full AES support** - Ready for visual editor
3. ✅ **Backward compatible** - Existing code works
4. ✅ **Animation system** - 15+ presets + custom
5. ✅ **Responsive** - Auto-adapt for mobile/tablet
6. ✅ **Type-safe** - Comprehensive schema
7. ✅ **Easy to use** - Simple hooks and components
8. ✅ **Extensible** - Easy to add new widgets

**Ready to build the AES Editor!** 🎉
