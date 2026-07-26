# Practical Seasoning & Inventory System

## The Reality of Cooking:

### Seasonings:
- ✅ People do a "shake test" - is it empty or not?
- ✅ No one measures exact amounts of spices
- ✅ If you run out, you just buy more
- ✅ Simple yes/no: "Do I have paprika?"

### Recipe Flow:
1. Recipe has exact amounts (for cooking reference)
2. Shopping list shows ingredient with recipe note
3. User checks off what they have
4. App auto-checks Kitchen Inventory
5. Missing items stay on shopping list

## Implementation Plan:

### 1. Seasoning Category in Kitchen Inventory

**New Storage Location: "Spice Rack"**
```
Kitchen Inventory Locations:
- Pantry
- Fridge
- Freezer
- Spice Rack ← NEW!
- Custom locations...
```

**Seasoning Items:**
- Simple yes/no tracking
- No quantity needed (just have it or don't)
- Visual: Full/Half/Empty indicator
- Quick "Refill" button

### 2. Recipe to Shopping List Flow

**When adding recipe to shopping list:**
```javascript
For each ingredient:
  1. Check if it's a pantry staple (flour, oil, etc.)
     → Auto-check Kitchen Inventory
     → If found: ✓ Check off automatically
     → If not found: Add to shopping list
  
  2. Check if it's a seasoning
     → Look in Spice Rack
     → If found: ✓ Check off automatically
     → If not found: Add to shopping list
  
  3. Regular ingredients (chicken, vegetables)
     → Check Kitchen Inventory
     → If found with enough quantity: ✓ Check off
     → If not enough or missing: Add to shopping list
  
  4. Add recipe name as note on shopping list item
     → "Paprika (for Chicken Stir Fry)"
```

### 3. Kitchen Inventory Location Display

**Problem:** Too many locations = cluttered UI

**Solution: Collapsible Sections with Smart Layout**

**Desktop:**
```
┌─────────────────────────────────────────────────┐
│ [Fridge ▼] [Freezer ▼] [Pantry ▼] [Spice Rack ▼]│
│ [Custom Location 1 ▼] [Custom Location 2 ▼]     │
├─────────────────────────────────────────────────┤
│ Currently Viewing: Fridge (12 items)             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│ │ Milk │ │ Eggs │ │Cheese│ │Butter│            │
│ └──────┘ └──────┘ └──────┘ └──────┘            │
└─────────────────────────────────────────────────┘
```

**Tablet:**
```
┌─────────────────────────────┐
│ Location: [Dropdown ▼]      │
│ ┌─ Fridge                   │
│ ├─ Freezer                  │
│ ├─ Pantry                   │
│ ├─ Spice Rack               │
│ └─ Custom...                │
├─────────────────────────────┤
│ Fridge (12 items)           │
│ ┌────┐ ┌────┐ ┌────┐       │
│ │Milk│ │Eggs│ │... │       │
│ └────┘ └────┘ └────┘       │
└─────────────────────────────┘
```

**Mobile:**
```
┌───────────────────┐
│ 📍 Fridge ▼       │
├───────────────────┤
│ 12 items          │
│                   │
│ ┌──────┐          │
│ │ Milk │          │
│ │ 1 gal│          │
│ └──────┘          │
│                   │
│ ┌──────┐          │
│ │ Eggs │          │
│ │ 12   │          │
│ └──────┘          │
└───────────────────┘
```

### 4. Seasoning Display in Kitchen Inventory

**Spice Rack View:**
```
┌─────────────────────────────────────────┐
│ 🌶️ Spice Rack (24 items)                │
├─────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ Salt │ │Pepper│ │Paprika│ │Cumin │   │
│ │ ████ │ │ ███░ │ │ ██░░ │ │ █░░░ │   │
│ │ Full │ │ 75%  │ │ 50%  │ │ 25%  │   │
│ │[Refill]│[Refill]│[Refill]│[Refill]│   │
│ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────┘
```

**Quick Actions:**
- Tap seasoning → Toggle Full/Half/Empty
- "Refill" button → Adds to shopping list
- Swipe left → Delete

### 5. Database Schema

```sql
-- Add spice_rack as default location
INSERT INTO custom_storage_locations (user_id, name, icon, sort_order, is_default)
VALUES (user_id, 'Spice Rack', '🌶️', 4, true);

-- Add seasoning tracking
ALTER TABLE inventory
ADD COLUMN is_seasoning BOOLEAN DEFAULT FALSE,
ADD COLUMN fill_level VARCHAR(20) DEFAULT 'full'; -- 'full', 'half', 'low', 'empty'

-- Common seasonings
CREATE TABLE common_seasonings (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(100), -- 'spice', 'herb', 'blend'
  common_size VARCHAR(50) -- '2 oz', '4 oz', etc.
);

INSERT INTO common_seasonings (name, category, common_size) VALUES
('Salt', 'basic', '26 oz'),
('Black Pepper', 'basic', '2 oz'),
('Garlic Powder', 'spice', '3 oz'),
('Onion Powder', 'spice', '2.5 oz'),
('Paprika', 'spice', '2 oz'),
('Chili Powder', 'spice', '2.5 oz'),
('Cumin', 'spice', '2 oz'),
('Oregano', 'herb', '1 oz'),
('Basil', 'herb', '1 oz'),
('Thyme', 'herb', '0.75 oz'),
('Rosemary', 'herb', '1 oz'),
('Cinnamon', 'spice', '2.5 oz'),
('Nutmeg', 'spice', '1.5 oz'),
('Cayenne Pepper', 'spice', '1.5 oz'),
('Italian Seasoning', 'blend', '1 oz'),
('Taco Seasoning', 'blend', '1 oz'),
('Everything Bagel Seasoning', 'blend', '2.5 oz');
```

### 6. Recipe to Shopping List API

```javascript
POST /api/recipes/:id/to-shopping-list

Request:
{
  list_id: 123, // optional, creates new if not provided
  check_inventory: true // auto-check what user has
}

Response:
{
  list_id: 123,
  items_added: [
    {
      item_name: "Chicken Breast",
      quantity: 1,
      unit: "lb",
      is_checked: false,
      recipe_note: "for Chicken Stir Fry"
    },
    {
      item_name: "Broccoli",
      quantity: 2,
      unit: "cups",
      is_checked: false,
      recipe_note: "for Chicken Stir Fry"
    }
  ],
  items_already_have: [
    {
      item_name: "Soy Sauce",
      reason: "Found in Pantry"
    },
    {
      item_name: "Garlic Powder",
      reason: "Found in Spice Rack"
    }
  ]
}
```

### 7. Auto-Check Inventory Logic

```javascript
async function checkInventoryForIngredient(userId, ingredientName) {
  // 1. Check if it's a common seasoning
  const seasoning = await db.query(`
    SELECT * FROM common_seasonings 
    WHERE LOWER(name) = LOWER($1)
  `, [ingredientName]);
  
  if (seasoning.rows.length > 0) {
    // Look in Spice Rack
    const inSpiceRack = await db.query(`
      SELECT * FROM inventory i
      JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.user_id = $1 
        AND LOWER(i.item_name) = LOWER($2)
        AND csl.name = 'Spice Rack'
        AND i.fill_level != 'empty'
    `, [userId, ingredientName]);
    
    return inSpiceRack.rows.length > 0;
  }
  
  // 2. Check if it's a pantry staple
  const isPantryStaple = await db.query(`
    SELECT * FROM common_pantry_staples 
    WHERE LOWER(item_name) = LOWER($1)
  `, [ingredientName]);
  
  if (isPantryStaple.rows.length > 0) {
    // Assume user has it (or check pantry)
    return true;
  }
  
  // 3. Check regular inventory
  const inInventory = await db.query(`
    SELECT * FROM inventory i
    JOIN items it ON i.item_id = it.id
    WHERE i.user_id = $1 
      AND LOWER(it.name) = LOWER($2)
      AND i.current_quantity > 0
  `, [userId, ingredientName]);
  
  return inInventory.rows.length > 0;
}
```

### 8. UI Components Needed

**1. LocationTabs.js** - Smart location switcher
```jsx
<LocationTabs 
  locations={locations}
  activeLocation={activeLocation}
  onLocationChange={setActiveLocation}
  responsive={true} // Auto-adapts to screen size
/>
```

**2. SeasoningCard.js** - Special card for seasonings
```jsx
<SeasoningCard
  name="Paprika"
  fillLevel="half" // full, half, low, empty
  onRefill={() => addToShoppingList('Paprika')}
  onToggleFill={() => updateFillLevel()}
/>
```

**3. RecipeIngredientChecker.js** - Auto-check modal
```jsx
<RecipeIngredientChecker
  recipe={recipe}
  onAddToList={(items) => addToShoppingList(items)}
/>
```

### 9. Benefits

✅ **Practical** - Matches real cooking behavior
✅ **Fast** - Auto-checks what you have
✅ **Simple** - Shake test for seasonings
✅ **Smart** - Knows pantry staples vs perishables
✅ **Organized** - Dedicated spice rack location
✅ **Responsive** - Works on all devices
✅ **Efficient** - Less manual checking

### 10. User Flow Example

**Making Chicken Stir Fry:**

1. Click "Add to Shopping List" on recipe
2. App checks Kitchen Inventory:
   - ✓ Soy Sauce (Pantry) - Auto-checked
   - ✓ Garlic Powder (Spice Rack) - Auto-checked
   - ✓ Oil (Pantry) - Auto-checked
   - ✗ Chicken Breast - Added to list
   - ✗ Broccoli - Added to list
   - ✗ Ginger - Added to list

3. Shopping list shows:
   ```
   Shopping List:
   ☐ Chicken Breast (1 lb) - for Chicken Stir Fry
   ☐ Broccoli (2 cups) - for Chicken Stir Fry
   ☐ Ginger (1 inch) - for Chicken Stir Fry
   
   Already Have:
   ✓ Soy Sauce
   ✓ Garlic Powder
   ✓ Oil
   ```

4. After shopping, items go to After Shop
5. Put away to Kitchen Inventory
6. Next time recipe is used, more items auto-checked!

This is how it should work! 🎯
