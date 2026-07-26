# Kitchen Inventory - Bug Fixes

## Issues Found:

### 1. **Custom Locations Not Displaying** ❌
- Items with `custom_location_id` are not showing custom location names
- Visual map only shows default locations (pantry/fridge/freezer)
- Custom locations exist in tabs but items aren't grouped properly

### 2. **Opened Indicator Covered by 3 Dots** ❌
- Opened badge at `top-3 left-3`
- Menu button (3 dots) ALSO at `top-3 left-3`
- They overlap completely!

### 3. **Items Not Showing in Visual Map** ❌
- Visual map only filters by `storage_location`
- Doesn't check `custom_location_id`
- Custom location items are invisible

### 4. **Liquid Indicator Confusion** ❓
- StorageIndicator shows -/+ buttons
- Purpose unclear to users
- No explanation or tooltip

### 5. **Items Not Saving Properly** ❌
- Need to verify save flow
- Check API data format
- Ensure custom_location_id is saved

## Fixes Needed:

### Fix 1: Custom Location Display in Cards
**File:** `InventoryCard.js`

**Problem:**
```javascript
// Currently only checks storage_location
const defaultLocations = {
  pantry: { name: 'Pantry', icon: '🥫' },
  fridge: { name: 'Fridge', icon: '🧊' },
  freezer: { name: 'Freezer', icon: '❄️' }
};
```

**Solution:**
```javascript
const getLocationDisplay = () => {
  // Check custom location first
  if (custom_location_id && custom_location_name) {
    return {
      name: custom_location_name,
      icon: custom_location_icon || '📦',
      isCustom: true
    };
  }
  
  // Fall back to default
  const defaultLocations = {
    pantry: { name: 'Pantry', icon: '🥫' },
    fridge: { name: 'Fridge', icon: '🧊' },
    freezer: { name: 'Freezer', icon: '❄️' }
  };
  
  return defaultLocations[storage_location] || { name: storage_location, icon: '📦' };
};
```

### Fix 2: Opened Indicator Position
**File:** `InventoryCard.js`

**Problem:**
```javascript
// Both at same position!
<button className="absolute top-3 left-3"> {/* Menu */}
<div className="absolute top-3 left-3"> {/* Opened badge */}
```

**Solution:**
```javascript
// Move menu to top-right
<button className="absolute top-3 right-3 z-20">
  <MoreVertical size={20} />
</button>

// Keep opened at top-left
<div className="absolute top-3 left-3 z-10">
  Opened
</div>

// Move expiration badge to avoid overlap
<div className="absolute top-14 right-3">
  <ExpirationBadge />
</div>
```

### Fix 3: Visual Map Custom Locations
**File:** `VisualInventoryMap.js`

**Problem:**
```javascript
// Only groups by default locations
const itemsByLocation = {
  pantry: items.filter(item => item.storage_location === 'pantry'),
  fridge: items.filter(item => item.storage_location === 'fridge'),
  freezer: items.filter(item => item.storage_location === 'freezer')
};
```

**Solution:**
```javascript
// Group by ALL locations (default + custom)
const groupItemsByLocation = () => {
  const groups = {
    pantry: [],
    fridge: [],
    freezer: []
  };
  
  // Add custom location groups
  const customLocations = {};
  
  items.forEach(item => {
    if (item.custom_location_id) {
      const key = `custom_${item.custom_location_id}`;
      if (!customLocations[key]) {
        customLocations[key] = {
          id: item.custom_location_id,
          name: item.custom_location_name,
          icon: item.custom_location_icon,
          items: []
        };
      }
      customLocations[key].items.push(item);
    } else if (item.storage_location) {
      groups[item.storage_location].push(item);
    }
  });
  
  return { default: groups, custom: customLocations };
};
```

### Fix 4: Liquid Indicator Explanation
**File:** `StorageIndicator.js`

**Add Tooltip:**
```javascript
<div className="relative group">
  <button title="Adjust quantity">
    <Minus />
  </button>
  <div className="absolute hidden group-hover:block ...">
    Quick adjust quantity
  </div>
</div>
```

**Better Labels:**
```javascript
// For liquids
<span className="text-xs">Refill</span> {/* Instead of + */}
<span className="text-xs">Use</span>    {/* Instead of - */}

// For solids
<span className="text-xs">Add</span>
<span className="text-xs">Remove</span>
```

### Fix 5: Save Verification
**File:** `AddItemModal.js`

**Check API Data:**
```javascript
const apiData = {
  item_name: formData.item_name.trim(),
  storage_location: formData.custom_location_id ? null : formData.storage_location,
  custom_location_id: formData.custom_location_id || null,
  // ... rest of fields
};

console.log('Saving item:', apiData); // Debug
```

**Verify Backend:**
```sql
-- Check if custom_location_id is being saved
SELECT id, item_name, storage_location, custom_location_id 
FROM inventory 
WHERE user_id = ? 
ORDER BY created_at DESC 
LIMIT 10;
```

## Implementation Priority:

1. **HIGH:** Fix opened indicator position (quick fix)
2. **HIGH:** Fix custom location display in cards
3. **HIGH:** Fix visual map to show custom locations
4. **MEDIUM:** Add tooltips to liquid indicator
5. **MEDIUM:** Verify save functionality

## Testing Checklist:

- [ ] Create custom location
- [ ] Add item to custom location
- [ ] Verify item shows in "All Items"
- [ ] Verify item shows in custom location tab
- [ ] Verify item shows in visual map
- [ ] Verify custom location name displays on card
- [ ] Verify opened badge doesn't overlap menu
- [ ] Verify expiration badge is visible
- [ ] Verify liquid indicator has tooltip
- [ ] Verify items save with correct location

## User Experience Improvements:

1. **Custom Location Badge:**
   - Show custom location icon + name
   - Different color from default locations
   - Clear visual distinction

2. **Better Layout:**
   - No overlapping badges
   - Clear hierarchy
   - Touch-friendly spacing

3. **Tooltips:**
   - Explain what -/+ buttons do
   - Show on hover
   - Mobile: tap to show

4. **Visual Map:**
   - Show ALL locations
   - Collapsible custom sections
   - Consistent with tabs
