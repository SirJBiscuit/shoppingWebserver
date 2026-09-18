# Recipe/Seasoning System - Phases 2-4 Implementation

## Phase 1: ✅ COMPLETE
- SeasoningCard component with fill levels
- SpiceRackView component
- Backend PATCH endpoint for fill levels
- Frontend API integration

---

## Phase 2: Recipe Ingredient Matching

### Goal
Match recipe ingredients with current inventory to show what you have vs. what you need.

### Features
1. **Ingredient Status Indicators**
   - ✅ Green checkmark = Have in inventory
   - ❌ Red X = Need to buy
   - ⚠️ Yellow warning = Low quantity

2. **Quantity Comparison**
   - Show required vs. available
   - "Need 2 cups, have 1 cup"
   - Smart unit conversion

3. **Visual Progress**
   - Progress bar showing % of ingredients available
   - "You have 6 of 10 ingredients"

### Implementation
**Files to Create/Modify:**
- `frontend/src/components/recipes/RecipeIngredientMatcher.js` (NEW)
- `frontend/src/components/recipes/IngredientStatusBadge.js` (NEW)
- `frontend/src/services/recipesAPI.js` (add matchIngredients method)
- `backend/src/routes/recipes.js` (add /recipes/:id/match-ingredients endpoint)

---

## Phase 3: Auto-Check Shopping List Items

### Goal
When adding recipe to shopping list, automatically check off items already in inventory.

### Features
1. **Smart Auto-Check**
   - Check inventory before adding to list
   - Auto-check items with sufficient quantity
   - Leave unchecked if quantity insufficient

2. **Visual Feedback**
   - "Already have" badge on checked items
   - Different color for auto-checked items
   - Tooltip showing inventory quantity

3. **Manual Override**
   - User can uncheck if they want to buy more
   - User can adjust quantities

### Implementation
**Files to Modify:**
- `frontend/src/components/recipes/RecipeModal.js` (update addToShoppingList)
- `frontend/src/services/recipesAPI.js` (add checkInventory method)
- `backend/src/routes/recipes.js` (add /recipes/:id/check-inventory endpoint)

---

## Phase 4: Recipe Grouping in Shopping List

### Goal
Group shopping list items by recipe for better organization.

### Features
1. **Recipe Headers**
   - Collapsible sections per recipe
   - Recipe name + icon
   - Ingredient count badge

2. **Visual Organization**
   - Recipe items grouped together
   - Different background color
   - Recipe icon next to each item

3. **Bulk Actions**
   - Check all items for a recipe
   - Remove all items for a recipe
   - Expand/collapse recipe sections

### Implementation
**Files to Create/Modify:**
- `frontend/src/components/shopping/RecipeGroup.js` (NEW)
- `frontend/src/components/shopping/RecipeGroupHeader.js` (NEW)
- `frontend/src/pages/Dashboard.js` (update item rendering)
- Database: Add `recipe_id` column to `shopping_list_items`

---

## Database Changes Needed

### Migration: Add recipe_id to shopping_list_items
```sql
ALTER TABLE shopping_list_items 
ADD COLUMN recipe_id INTEGER REFERENCES recipes(id) ON DELETE SET NULL;

CREATE INDEX idx_shopping_list_items_recipe_id 
ON shopping_list_items(recipe_id);
```

---

## API Endpoints to Add

### Phase 2
- `GET /api/recipes/:id/match-ingredients` - Match recipe with inventory

### Phase 3
- `POST /api/recipes/:id/check-inventory` - Check which ingredients are in inventory
- `POST /api/recipes/:id/add-to-list-smart` - Add to list with auto-check

### Phase 4
- `GET /api/shopping/lists/:id/grouped` - Get items grouped by recipe
- `POST /api/shopping/lists/:id/items/bulk` - Add multiple items with recipe_id

---

## Implementation Order

1. **Database Migration** (recipe_id column)
2. **Phase 2** - Ingredient matching (visual only, no shopping list changes)
3. **Phase 3** - Auto-check logic (requires Phase 2)
4. **Phase 4** - Recipe grouping (requires recipe_id column)

---

## Estimated Complexity

- **Phase 2**: Medium (ingredient matching logic, UI components)
- **Phase 3**: Medium (inventory checking, auto-check logic)
- **Phase 4**: High (database changes, UI restructuring, grouping logic)

**Total Time**: ~4-6 hours for all phases

---

## Next Steps

1. Create database migration for recipe_id
2. Implement Phase 2 ingredient matcher
3. Add auto-check logic for Phase 3
4. Build recipe grouping UI for Phase 4
5. Test end-to-end workflow
