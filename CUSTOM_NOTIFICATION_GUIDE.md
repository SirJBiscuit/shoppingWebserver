# CustomNotification Component Guide

A versatile, animated notification/messaging system for modular quick messaging, interactive menus, and user prompts.

## Features

- ✅ **6 Notification Types**: info, success, warning, error, question, custom
- ✅ **7 Screen Positions**: top, top-right, top-left, bottom, bottom-right, bottom-left, center
- ✅ **Auto-Dismiss Timer**: Configurable duration with progress bar
- ✅ **Interactive Actions**: Multiple buttons with custom callbacks
- ✅ **Swipe to Dismiss**: Mobile-friendly gesture support
- ✅ **Pause on Hover**: Timer pauses when hovering
- ✅ **Smooth Animations**: Framer-motion powered
- ✅ **Responsive Design**: Works on all devices
- ✅ **Dark Mode Support**: Automatic theme adaptation
- ✅ **Backdrop Option**: Modal-style center notifications

## Installation

```javascript
import CustomNotification from '../components/CustomNotification';
```

## Basic Usage

### Simple Info Notification

```javascript
const [showNotif, setShowNotif] = useState(false);

<CustomNotification
  isOpen={showNotif}
  onClose={() => setShowNotif(false)}
  type="info"
  title="Information"
  message="This is an informational message"
  position="top-right"
  duration={5000}
/>
```

### Success Notification

```javascript
<CustomNotification
  isOpen={showSuccess}
  onClose={() => setShowSuccess(false)}
  type="success"
  title="Item Added!"
  message="Milk has been added to your shopping list"
  position="bottom-right"
  duration={3000}
/>
```

### Error Notification

```javascript
<CustomNotification
  isOpen={showError}
  onClose={() => setShowError(false)}
  type="error"
  title="Error"
  message="Failed to save item. Please try again."
  position="top"
  duration={0} // No auto-dismiss
/>
```

## Interactive Notifications

### Question with Actions

```javascript
<CustomNotification
  isOpen={showQuestion}
  onClose={() => setShowQuestion(false)}
  type="question"
  position="center"
  title="Remove Item?"
  message="Are you sure you want to remove Milk from your list?"
  duration={0}
  actions={[
    {
      label: 'Remove',
      onClick: () => {
        deleteItem(itemId);
        success('Item removed');
      },
      color: 'bg-red-500 hover:bg-red-600 text-white'
    },
    {
      label: 'Cancel',
      onClick: () => setShowQuestion(false),
      variant: 'outline'
    }
  ]}
/>
```

### Add or Remove Confirmation

```javascript
<CustomNotification
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  type="question"
  position="center"
  title="Item Already Exists"
  message="Milk is already in your list. Would you like to increase quantity or remove it?"
  duration={0}
  actions={[
    {
      label: 'Increase Quantity',
      onClick: () => increaseQuantity(itemId),
      color: 'bg-green-500 hover:bg-green-600 text-white'
    },
    {
      label: 'Remove',
      onClick: () => deleteItem(itemId),
      color: 'bg-red-500 hover:bg-red-600 text-white'
    },
    {
      label: 'Cancel',
      onClick: () => setShowConfirm(false),
      variant: 'outline'
    }
  ]}
/>
```

### Quick Action Menu

```javascript
<CustomNotification
  isOpen={showQuickMenu}
  onClose={() => setShowQuickMenu(false)}
  type="info"
  position="center"
  title="Quick Actions"
  message="What would you like to do with this item?"
  duration={0}
  actions={[
    {
      label: 'Edit',
      onClick: () => editItem(item),
      color: 'bg-blue-500 hover:bg-blue-600 text-white'
    },
    {
      label: 'Move to Pantry',
      onClick: () => moveToPantry(item),
      color: 'bg-purple-500 hover:bg-purple-600 text-white'
    },
    {
      label: 'Add Note',
      onClick: () => addNote(item),
      color: 'bg-amber-500 hover:bg-amber-600 text-white'
    },
    {
      label: 'Delete',
      onClick: () => deleteItem(item),
      color: 'bg-red-500 hover:bg-red-600 text-white'
    }
  ]}
/>
```

## Notification Types

### Info (Blue)
```javascript
type="info"
// Use for: General information, tips, updates
```

### Success (Green)
```javascript
type="success"
// Use for: Successful operations, confirmations
```

### Warning (Yellow)
```javascript
type="warning"
// Use for: Warnings, cautions, important notices
```

### Error (Red)
```javascript
type="error"
// Use for: Errors, failures, critical issues
```

### Question (Purple)
```javascript
type="question"
// Use for: Interactive questions, confirmations, choices
```

### Custom (Gray)
```javascript
type="custom"
// Use for: Custom styled notifications with custom icons
```

## Positions

### Corner Positions (Best for Toasts)
```javascript
position="top-right"     // Default, non-intrusive
position="top-left"      // Alternative corner
position="bottom-right"  // Bottom corner
position="bottom-left"   // Bottom left corner
```

### Edge Positions
```javascript
position="top"           // Top center
position="bottom"        // Bottom center
```

### Modal Position
```javascript
position="center"        // Center screen with backdrop
// Best for: Questions, confirmations, important messages
```

## Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `isOpen` | boolean | false | Notification visibility |
| `onClose` | function | - | Close callback |
| `type` | string | 'info' | Notification type |
| `position` | string | 'top-right' | Screen position |
| `title` | string | - | Notification title |
| `message` | string | - | Notification message |
| `icon` | Component | - | Custom icon component |
| `duration` | number | 5000 | Auto-dismiss duration (ms), 0 = no auto-dismiss |
| `showProgress` | boolean | true | Show progress bar |
| `actions` | array | [] | Action buttons |
| `dismissible` | boolean | true | Show close button |
| `className` | string | '' | Additional CSS classes |

## Action Button Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Button text |
| `onClick` | function | - | Click handler |
| `color` | string | - | Custom color classes |
| `variant` | string | - | 'outline' for outlined button |
| `closeOnClick` | boolean | true | Auto-close notification on click |

## Real-World Examples

### 1. Item Added to List

```javascript
const handleAddItem = async (item) => {
  try {
    await addItem(item);
    
    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Item Added!',
      message: `${item.name} has been added to your shopping list`,
      position: 'bottom-right',
      duration: 3000
    });
  } catch (error) {
    setNotification({
      isOpen: true,
      type: 'error',
      title: 'Error',
      message: 'Failed to add item. Please try again.',
      position: 'top',
      duration: 0
    });
  }
};
```

### 2. Confirm Delete

```javascript
const confirmDelete = (item) => {
  setNotification({
    isOpen: true,
    type: 'question',
    position: 'center',
    title: 'Delete Item?',
    message: `Are you sure you want to delete ${item.name}?`,
    duration: 0,
    actions: [
      {
        label: 'Delete',
        onClick: async () => {
          await deleteItem(item.id);
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Deleted',
            message: `${item.name} has been removed`,
            position: 'bottom-right',
            duration: 2000
          });
        },
        color: 'bg-red-500 hover:bg-red-600 text-white'
      },
      {
        label: 'Cancel',
        variant: 'outline'
      }
    ]
  });
};
```

### 3. Undo Action

```javascript
const deleteWithUndo = async (item) => {
  const deletedItem = { ...item };
  await deleteItem(item.id);
  
  setNotification({
    isOpen: true,
    type: 'info',
    title: 'Item Deleted',
    message: `${item.name} has been removed`,
    position: 'bottom',
    duration: 5000,
    actions: [
      {
        label: 'Undo',
        onClick: async () => {
          await addItem(deletedItem);
          setNotification({
            isOpen: true,
            type: 'success',
            title: 'Restored',
            message: `${item.name} has been restored`,
            position: 'bottom-right',
            duration: 2000
          });
        },
        color: 'bg-blue-500 hover:bg-blue-600 text-white'
      }
    ]
  });
};
```

### 4. Multi-Choice Question

```javascript
const askItemAction = (item) => {
  setNotification({
    isOpen: true,
    type: 'question',
    position: 'center',
    title: 'What would you like to do?',
    message: `Choose an action for ${item.name}`,
    duration: 0,
    actions: [
      {
        label: 'Mark as Found',
        onClick: () => markAsFound(item.id),
        color: 'bg-green-500 hover:bg-green-600 text-white'
      },
      {
        label: 'Skip',
        onClick: () => skipItem(item.id),
        color: 'bg-yellow-500 hover:bg-yellow-600 text-white'
      },
      {
        label: 'Remove',
        onClick: () => deleteItem(item.id),
        color: 'bg-red-500 hover:bg-red-600 text-white'
      },
      {
        label: 'Cancel',
        variant: 'outline'
      }
    ]
  });
};
```

### 5. Warning with Action

```javascript
<CustomNotification
  isOpen={showWarning}
  onClose={() => setShowWarning(false)}
  type="warning"
  position="top"
  title="Low Stock Alert"
  message="You're running low on Milk. Would you like to add it to your list?"
  duration={0}
  actions={[
    {
      label: 'Add to List',
      onClick: () => addToList('Milk'),
      color: 'bg-green-500 hover:bg-green-600 text-white'
    },
    {
      label: 'Remind Me Later',
      onClick: () => remindLater(),
      variant: 'outline'
    }
  ]}
/>
```

## Notification Manager Hook

For easier management of multiple notifications:

```javascript
// hooks/useNotification.js
import { useState } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    position: 'top-right',
    duration: 5000,
    actions: []
  });

  const showNotification = (config) => {
    setNotification({
      ...notification,
      ...config,
      isOpen: true
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  };

  const success = (message, title = 'Success') => {
    showNotification({
      type: 'success',
      title,
      message,
      duration: 3000
    });
  };

  const error = (message, title = 'Error') => {
    showNotification({
      type: 'error',
      title,
      message,
      duration: 0
    });
  };

  const info = (message, title = 'Info') => {
    showNotification({
      type: 'info',
      title,
      message,
      duration: 5000
    });
  };

  const warning = (message, title = 'Warning') => {
    showNotification({
      type: 'warning',
      title,
      message,
      duration: 7000
    });
  };

  const ask = (message, actions, title = 'Confirm') => {
    showNotification({
      type: 'question',
      title,
      message,
      position: 'center',
      duration: 0,
      actions
    });
  };

  return {
    notification,
    showNotification,
    hideNotification,
    success,
    error,
    info,
    warning,
    ask
  };
};

// Usage in component:
const { notification, hideNotification, success, ask } = useNotification();

// Show success
success('Item added successfully!');

// Ask question
ask(
  'Delete this item?',
  [
    { label: 'Delete', onClick: () => deleteItem(), color: 'bg-red-500' },
    { label: 'Cancel', variant: 'outline' }
  ]
);

// Render
<CustomNotification {...notification} onClose={hideNotification} />
```

## Best Practices

### 1. Use Appropriate Types
- **Info**: General updates, tips
- **Success**: Confirmations, completed actions
- **Warning**: Cautions, important notices
- **Error**: Failures, critical issues
- **Question**: User decisions, confirmations

### 2. Choose Right Position
- **Corner positions**: Non-intrusive toasts
- **Center**: Important questions/confirmations
- **Top/Bottom**: Moderate importance

### 3. Set Appropriate Duration
- **Success**: 2-3 seconds
- **Info**: 4-5 seconds
- **Warning**: 6-8 seconds
- **Error**: No auto-dismiss (0)
- **Question**: No auto-dismiss (0)

### 4. Action Buttons
- Limit to 2-4 actions
- Use clear, action-oriented labels
- Primary action first
- Cancel/dismiss last
- Use colors to indicate severity

### 5. Mobile Considerations
- Swipe to dismiss works automatically
- Timer pauses on hover (desktop) or touch (mobile)
- Responsive text sizing
- Touch-friendly button sizes

## Styling Customization

### Custom Colors

```javascript
<CustomNotification
  type="custom"
  className="bg-gradient-to-br from-pink-500 to-purple-600 text-white border-pink-300"
  icon={Heart}
  title="Custom Notification"
  message="With custom styling!"
/>
```

### Custom Icon

```javascript
import { ShoppingCart } from 'lucide-react';

<CustomNotification
  type="info"
  icon={ShoppingCart}
  title="Cart Updated"
  message="Your shopping cart has been updated"
/>
```

## Accessibility

- ✅ Keyboard accessible (Tab, Enter, Escape)
- ✅ Screen reader friendly
- ✅ High contrast support
- ✅ Focus management
- ✅ ARIA labels

## Performance

- ✅ Lightweight animations
- ✅ Efficient re-renders
- ✅ Cleanup on unmount
- ✅ Optimized for mobile

## Migration from useToast

```javascript
// Old
const { success, error } = useToast();
success('Item added');

// New
const { notification, hideNotification, success } = useNotification();
success('Item added');
<CustomNotification {...notification} onClose={hideNotification} />
```

## Troubleshooting

### Notification not showing
- Check `isOpen` prop is true
- Verify z-index isn't conflicting
- Ensure component is rendered

### Auto-dismiss not working
- Check `duration` is > 0
- Verify `onClose` is provided
- Check for hover/pause state

### Actions not working
- Verify `onClick` is defined
- Check `closeOnClick` setting
- Ensure no event propagation issues

## Examples Repository

See `CUSTOM_NOTIFICATION_EXAMPLES.md` for more real-world examples and patterns.
