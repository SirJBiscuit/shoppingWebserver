# Kitchen Inventory UI Improvements

## Summary of Requested Changes

### 1. Clear Buttons
- **Clear All** - Delete all items from kitchen inventory
- **Clear Pantry** - Delete all items from pantry section
- **Clear Fridge** - Delete all items from fridge section  
- **Clear Freezer** - Delete all items from freezer section

### 2. Icon/Image Management
- Icon picker with common food emojis
- Image upload capability
- Display image if uploaded, otherwise show icon

### 3. Quantity Display
- Show as integer (1) instead of decimal (1.00)
- Only show decimal if user enters decimal

### 4. Improved Edit Modal
- **Item name at top** of modal (larger, prominent)
- **Optional unit dropdown** with common units
- **Auto-fill bought date** to today's date
- **Auto expiration** or manual entry toggle
- **Optional store field** (can be left blank)
- **Smaller, more compact** design
- Better organization of fields

### 5. Implementation Plan

#### Files to Modify:
1. `AddItemModal.js` - Complete redesign
2. `PantryNew.js` - Add clear buttons
3. `InventoryCard.js` - Show integer quantity, icon/image support
4. `inventoryAPI.js` - Add bulk delete endpoints

#### New Features:
- Icon picker component
- Image upload with preview
- Bulk delete confirmation dialogs
- Integer formatting for quantities

