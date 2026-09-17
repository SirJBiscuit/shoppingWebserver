# CustomKeypad Component Guide

## Overview

`CustomKeypad` is a reusable, responsive keypad widget that automatically adapts to mobile, tablet, and desktop devices. It provides a consistent UX for any input scenario requiring quick button selection or custom input.

## Features

✅ **Device-Aware**
- Mobile: Bottom sheet with backdrop
- Tablet: Centered modal
- Desktop: Draggable widget

✅ **Fully Responsive**
- Configurable grid columns per device
- Touch-friendly 44px minimum button height
- Responsive text sizing

✅ **Flexible**
- Custom button layouts (numbers, aisles, letters, emojis, etc.)
- Optional custom input field
- Highlight predicted/suggested values
- Support for icons in buttons

✅ **Accessible**
- Keyboard support (Enter to submit)
- ARIA labels
- Clear visual feedback

## Basic Usage

```javascript
import CustomKeypad from '../components/CustomKeypad';

function MyComponent() {
  const [showKeypad, setShowKeypad] = useState(false);

  return (
    <>
      <button onClick={() => setShowKeypad(true)}>
        Open Keypad
      </button>

      {showKeypad && (
        <CustomKeypad
          title="Select a number"
          buttons={[
            { label: '1', value: '1' },
            { label: '2', value: '2' },
            { label: '3', value: '3' }
          ]}
          onSave={(value) => {
            console.log('Selected:', value);
            setShowKeypad(false);
          }}
          onCancel={() => setShowKeypad(false)}
        />
      )}
    </>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | string | `''` | Current input value |
| `onChange` | function | - | Called when value changes |
| `onSave` | function | - | Called when save/submit is clicked |
| `onCancel` | function | - | Called when cancel/close is clicked |
| `device` | string | auto-detect | Device type: 'mobile', 'tablet', 'desktop' |
| `title` | string | `'Select or Enter'` | Title text for the keypad |
| `buttons` | array | `[]` | Array of button configs (see below) |
| `gridCols` | object | `{ mobile: 4, tablet: 5, desktop: 10 }` | Grid columns per device |
| `placeholder` | string | `'Enter custom value...'` | Placeholder for custom input |
| `allowCustomInput` | boolean | `true` | Show custom input field |
| `inputType` | string | `'text'` | Input type: 'text', 'number' |
| `inputMode` | string | `'text'` | Input mode: 'numeric', 'text', 'decimal' |
| `maxLength` | number | - | Max length for input |
| `highlightValue` | string | - | Value to highlight (e.g., predicted value) |
| `highlightHint` | string | - | Hint text for highlighted value |

## Button Config

Each button in the `buttons` array can have:

```javascript
{
  label: '5',           // Display text (required)
  value: '5',           // Value to return (required)
  className: '',        // Custom CSS classes (optional)
  icon: '🎯'           // Icon/emoji to show before label (optional)
}
```

## Examples

### Example 1: Aisle Number Keypad (Current Implementation)

```javascript
<CustomKeypad
  title="Which aisle did you find this in?"
  buttons={[...Array(20)].map((_, i) => ({
    label: (i + 1).toString(),
    value: (i + 1).toString()
  }))}
  gridCols={{ mobile: 4, tablet: 5, desktop: 10 }}
  placeholder="Other aisle number..."
  inputType="number"
  inputMode="numeric"
  maxLength={3}
  highlightValue={predictedAisle?.toString()}
  highlightHint={predictedAisle ? `We predicted: Aisle ${predictedAisle}` : null}
  onSave={(aisleNumber) => {
    reportAisle(aisleNumber);
    setShowKeypad(false);
  }}
  onCancel={() => setShowKeypad(false)}
/>
```

### Example 2: PIN Entry Keypad

```javascript
<CustomKeypad
  title="Enter PIN"
  buttons={[...Array(10)].map((_, i) => ({
    label: i.toString(),
    value: i.toString()
  }))}
  gridCols={{ mobile: 3, tablet: 3, desktop: 3 }}
  placeholder="Enter PIN..."
  inputType="password"
  inputMode="numeric"
  maxLength={4}
  allowCustomInput={false}  // Only buttons, no custom input
  onSave={(pin) => {
    verifyPIN(pin);
    setShowKeypad(false);
  }}
  onCancel={() => setShowKeypad(false)}
/>
```

### Example 3: Category Selector

```javascript
<CustomKeypad
  title="Select Category"
  buttons={[
    { label: 'Produce', value: 'produce', icon: '🥬' },
    { label: 'Dairy', value: 'dairy', icon: '🥛' },
    { label: 'Meat', value: 'meat', icon: '🥩' },
    { label: 'Bakery', value: 'bakery', icon: '🍞' },
    { label: 'Frozen', value: 'frozen', icon: '🧊' },
    { label: 'Snacks', value: 'snacks', icon: '🍿' }
  ]}
  gridCols={{ mobile: 2, tablet: 3, desktop: 3 }}
  allowCustomInput={true}
  placeholder="Other category..."
  onSave={(category) => {
    setItemCategory(category);
    setShowKeypad(false);
  }}
  onCancel={() => setShowKeypad(false)}
/>
```

### Example 4: Quick Quantity Selector

```javascript
<CustomKeypad
  title="Select Quantity"
  buttons={[
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '10', value: '10' },
    { label: '12', value: '12' },
    { label: '24', value: '24' }
  ]}
  gridCols={{ mobile: 4, tablet: 4, desktop: 4 }}
  placeholder="Custom quantity..."
  inputType="number"
  inputMode="numeric"
  highlightValue="2"
  highlightHint="Most common quantity"
  onSave={(quantity) => {
    setItemQuantity(quantity);
    setShowKeypad(false);
  }}
  onCancel={() => setShowKeypad(false)}
/>
```

### Example 5: Store Floor Selector

```javascript
<CustomKeypad
  title="Which floor?"
  buttons={[
    { label: 'Ground Floor', value: '0', icon: '🏬' },
    { label: '1st Floor', value: '1', icon: '⬆️' },
    { label: '2nd Floor', value: '2', icon: '⬆️⬆️' },
    { label: 'Basement', value: '-1', icon: '⬇️' }
  ]}
  gridCols={{ mobile: 2, tablet: 2, desktop: 4 }}
  allowCustomInput={false}
  onSave={(floor) => {
    setStoreFloor(floor);
    setShowKeypad(false);
  }}
  onCancel={() => setShowKeypad(false)}
/>
```

## Device Behavior

### Mobile (< 640px or touch device < 768px)
- Appears as bottom sheet
- Slides up from bottom
- Backdrop covers screen
- Tap backdrop to close

### Tablet (640px - 1024px)
- Centered modal
- Backdrop covers screen
- Tap backdrop to close
- Responsive sizing

### Desktop (> 1024px)
- Draggable widget
- Can be moved around screen
- Backdrop covers screen (semi-transparent)
- Click backdrop to close

## Styling

The component uses Tailwind CSS and respects dark mode. All buttons have:
- Minimum 44px height (touch-friendly)
- Responsive padding
- Hover states
- Transition animations
- Dark mode support

Highlighted buttons get:
- Amber border (`border-amber-500`)
- Amber background (`bg-amber-50`)
- Ring effect (`ring-2 ring-amber-400`)

## Best Practices

1. **Keep button count reasonable**
   - Mobile: 12-20 buttons max
   - Tablet: 20-30 buttons max
   - Desktop: 30-50 buttons max

2. **Use appropriate grid columns**
   - Mobile: 3-4 columns for numbers, 2 for text
   - Tablet: 4-5 columns for numbers, 3 for text
   - Desktop: 8-10 columns for numbers, 4-6 for text

3. **Provide custom input when needed**
   - Always allow custom input for open-ended values
   - Disable for fixed choices (PIN, floor selection)

4. **Use highlights wisely**
   - Highlight predicted/suggested values
   - Show hint text explaining the highlight
   - Don't highlight more than one value

5. **Handle Enter key**
   - Custom input supports Enter key to submit
   - Improves desktop UX

## Future Enhancements

Potential additions to CustomKeypad:

- [ ] Multi-select mode (checkboxes)
- [ ] Search/filter buttons
- [ ] Keyboard navigation (arrow keys)
- [ ] Button groups/sections
- [ ] Swipe gestures on mobile
- [ ] Animation presets
- [ ] Theme customization
- [ ] Sound effects on button press
- [ ] Haptic feedback on mobile

## Related Components

- `CustomNumberPad` - Specialized number pad for prices
- `ConfirmModal` - Confirmation dialogs
- `Modal` - Generic modal wrapper

## Migration Guide

If you have existing custom keypads, here's how to migrate:

**Before:**
```javascript
<div className="grid grid-cols-4 gap-2">
  {buttons.map(btn => (
    <button onClick={() => handleClick(btn.value)}>
      {btn.label}
    </button>
  ))}
</div>
```

**After:**
```javascript
<CustomKeypad
  buttons={buttons}
  gridCols={{ mobile: 4, tablet: 5, desktop: 10 }}
  onSave={handleClick}
  onCancel={handleClose}
/>
```

## Support

For issues or questions about CustomKeypad:
1. Check this guide
2. Review existing implementations in `NextItemSuggestion.js`
3. Test on all device types before deploying
