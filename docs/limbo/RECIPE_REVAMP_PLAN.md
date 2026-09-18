# Recipe & Kitchen Inventory Revamp Plan

## Overview
Complete overhaul of recipe management and kitchen inventory systems with enhanced URL import, categorization, shopping list integration, and inventory comparison.

## Current State Analysis

### What Works
- ✅ Basic recipe CRUD operations
- ✅ URL import from recipe sites (Food Network, AllRecipes)
- ✅ Image upload and auto-detection
- ✅ "What can I make?" feature
- ✅ Favorite recipes
- ✅ Recipe ingredients storage

### What Needs Fixing
- ❌ **CRITICAL**: Routes use `req.user.userId` instead of `req.user.id` (same bug as shopping routes!)
- ❌ No recipe categorization (breakfast, lunch, dinner, dessert, etc.)
- ❌ No search functionality
- ❌ Ingredients don't have checkboxes in UI
- ❌ No visual comparison with kitchen inventory
- ❌ Recipe items added to shopping list aren't grouped separately
- ❌ Kitchen inventory UI is basic, needs enhancement
- ❌ No quick actions in inventory

## Phase 1: Fix Critical Bugs

### 1.1 Fix req.user.userId Bug
**Files to Update:**
- `backend/src/routes/recipes.js` - Replace all `req.user.userId` with `req.user.id`

**Impact:** Without this fix, recipes won't load for current users

## Phase 2: Database Schema Enhancements

### 2.1 Add Recipe Categories
```sql
-- Add category column to recipes table
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cuisine VARCHAR(50);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20);
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create index for faster category queries
CREATE INDEX IF NOT EXISTS idx_recipes_category ON recipes(category);
CREATE INDEX IF NOT EXISTS idx_recipes_cuisine ON recipes(cuisine);
```

**Categories:**
- Breakfast
- Lunch
- Dinner
- Dessert
- Snack
- Appetizer
- Beverage
- Sauce/Condiment

**Cuisines:**
- American, Italian, Mexican, Chinese, Indian, Thai, French, etc.

**Difficulty:**
- Easy, Medium, Hard

### 2.2 Add Recipe Source Tracking
```sql
-- Track where recipe came from
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS source_site VARCHAR(100);
```

### 2.3 Enhance Shopping List Items for Recipe Grouping
```sql
-- Add recipe_id to shopping_list_items (already exists)
-- Add recipe_group flag to visually separate recipe items
ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS is_recipe_item BOOLEAN DEFAULT FALSE;
```

## Phase 3: Enhanced URL Import

### 3.1 Expand Supported Recipe Sites
**Current:** Food Network, AllRecipes
**Add:**
- Tasty
- Bon Appétit
- Serious Eats
- NYT Cooking
- Epicurious
- BBC Good Food

### 3.2 Improve Recipe Scraper
**File:** `backend/src/utils/recipeScraper.js`

**Enhancements:**
- Auto-detect recipe category from content
- Extract cuisine type
- Parse difficulty level
- Better ingredient parsing (quantity + unit + name)
- Extract cooking tips/notes
- Handle recipe variations

### 3.3 Image from URL Feature
Allow users to paste image URL directly instead of uploading

## Phase 4: Recipe UI Enhancements

### 4.1 Recipe Modal Improvements
**File:** `frontend/src/components/RecipeModal.js`

**Features:**
- Category dropdown (breakfast, lunch, dinner, etc.)
- Cuisine dropdown
- Difficulty selector
- Tags input (comma-separated)
- Image from URL input field
- Ingredient checkboxes (to mark what you already have)
- Visual indicator of missing ingredients
- "Add missing to shopping list" button

### 4.2 Recipe List View
**File:** `frontend/src/pages/Recipes.js`

**Features:**
- Category filter tabs
- Search bar (name, ingredients, tags)
- Cuisine filter
- Difficulty filter
- Sort by: Name, Date, Prep Time, Favorites
- Grid/List view toggle
- Recipe cards show:
  - Category badge
  - Difficulty badge
  - "Can make" indicator (green if you have all ingredients)
  - Missing ingredients count

## Phase 5: Shopping List Integration

### 5.1 Recipe to Shopping List Flow
**Enhanced Workflow:**
1. User clicks "Add to Shopping List" on recipe
2. Modal shows:
   - ✅ Ingredients you have (from inventory)
   - ❌ Ingredients you need
   - Checkboxes to select which to add
   - Option to select which shopping list
3. Items added with `recipe_id` and `is_recipe_item=true`
4. Shopping list groups recipe items separately:
   ```
   📋 Regular Items
   - Milk
   - Bread
   
   👨‍🍳 For Recipe: Chocolate Chip Cookies
   - Flour (2 cups)
   - Sugar (1 cup)
   - Chocolate chips (1 bag)
   ```

### 5.2 Recipe Item Grouping Component
**New File:** `frontend/src/components/RecipeItemGroup.js`

**Features:**
- Collapsible recipe groups
- Recipe name header with icon
- Link back to recipe
- "Remove all recipe items" button
- Progress indicator (2/5 items checked)

## Phase 6: Kitchen Inventory Revamp

### 6.1 Enhanced Inventory UI
**File:** `frontend/src/pages/Pantry.js`

**Improvements:**
- Better category organization
- Quick add button (floating action button)
- Bulk actions (select multiple, delete, move)
- Low stock alerts (visual badges)
- Expiring soon section (separate tab)
- Search and filter
- Sort options (name, category, expiry, quantity)

### 6.2 Inventory Quick Actions
- Quick quantity adjust (+/- buttons)
- One-click "Add to shopping list"
- Mark as "running low"
- Set custom expiry date
- Add notes

### 6.3 Inventory Categories
Better organization:
- **Pantry Staples** (flour, sugar, oil, etc.)
- **Canned Goods**
- **Spices & Seasonings**
- **Refrigerated** (milk, eggs, cheese, etc.)
- **Frozen**
- **Produce**
- **Meat & Seafood**
- **Bakery**
- **Beverages**

## Phase 7: Recipe-Inventory Comparison

### 7.1 Visual Comparison in Recipe View
**When viewing a recipe:**
```
Ingredients:
✅ 2 cups flour (You have: 5 cups)
✅ 1 cup sugar (You have: 2 cups)
❌ 1 bag chocolate chips (Not in inventory)
⚠️  2 eggs (You have: 1 - need 1 more)
```

### 7.2 Smart Shopping List Suggestions
- Only add missing/insufficient items
- Suggest quantities based on what you have
- Option to "use what I have" and adjust recipe

### 7.3 Inventory Deduction
**Optional Feature:**
When marking recipe as "cooked":
- Deduct ingredients from inventory
- Update quantities automatically
- Track recipe history

## Phase 8: Search & Discovery

### 8.1 Recipe Search
**Search by:**
- Recipe name
- Ingredients (find recipes using specific ingredients)
- Tags
- Category
- Cuisine

**Advanced Filters:**
- Prep time (< 15 min, 15-30 min, 30-60 min, > 1 hour)
- Difficulty
- Servings
- Favorites only
- Can make with current inventory

### 8.2 Recipe Suggestions
- "Based on what you have" (smart suggestions)
- "Quick meals" (< 30 min prep)
- "Favorites" section
- "Recently added"

## Implementation Order

### Sprint 1: Critical Fixes & Foundation (Week 1)
1. ✅ Fix `req.user.userId` bug in recipes routes
2. ✅ Add database columns (category, cuisine, difficulty, tags)
3. ✅ Run migration

### Sprint 2: Enhanced URL Import (Week 1-2)
1. Expand recipe scraper to support more sites
2. Add auto-category detection
3. Improve ingredient parsing
4. Add image from URL feature

### Sprint 3: Recipe UI Enhancements (Week 2)
1. Update RecipeModal with new fields
2. Add ingredient checkboxes
3. Add category/cuisine/difficulty selectors
4. Improve visual design

### Sprint 4: Search & Filters (Week 2-3)
1. Add search functionality
2. Add category filter tabs
3. Add cuisine/difficulty filters
4. Add sort options

### Sprint 5: Shopping List Integration (Week 3)
1. Create RecipeItemGroup component
2. Enhance "Add to Shopping List" flow
3. Add inventory comparison modal
4. Group recipe items separately in shopping list

### Sprint 6: Inventory Revamp (Week 3-4)
1. Redesign inventory UI
2. Add quick actions
3. Add bulk operations
4. Improve categorization

### Sprint 7: Recipe-Inventory Comparison (Week 4)
1. Add visual comparison in recipe view
2. Smart shopping list suggestions
3. Optional inventory deduction

### Sprint 8: Polish & Testing (Week 4)
1. End-to-end testing
2. Bug fixes
3. Performance optimization
4. Documentation

## API Endpoints to Add/Update

### New Endpoints
```
GET  /api/recipes/search?q=chicken&category=dinner&cuisine=italian
GET  /api/recipes/categories
GET  /api/recipes/cuisines
POST /api/recipes/:id/to-shopping-list (enhanced with inventory comparison)
GET  /api/recipes/:id/missing-ingredients
POST /api/recipes/:id/mark-cooked (optional inventory deduction)
```

### Updated Endpoints
```
GET  /api/recipes (add filters: category, cuisine, difficulty, search)
POST /api/recipes (add category, cuisine, difficulty, tags, source_url)
```

## Files to Create

### Backend
- `backend/migrations/026_recipe_enhancements.sql`
- `backend/src/utils/recipeScraperEnhanced.js` (expanded scraper)
- `backend/src/services/recipeService.js` (business logic)

### Frontend
- `frontend/src/components/RecipeItemGroup.js`
- `frontend/src/components/RecipeSearch.js`
- `frontend/src/components/RecipeFilters.js`
- `frontend/src/components/InventoryComparisonModal.js`
- `frontend/src/components/RecipeCategoryBadge.js`

## Files to Update

### Backend
- `backend/src/routes/recipes.js` (fix userId bug, add new endpoints)
- `backend/src/utils/recipeScraper.js` (enhance)

### Frontend
- `frontend/src/pages/Recipes.js` (add search, filters, better layout)
- `frontend/src/pages/Pantry.js` (revamp UI)
- `frontend/src/components/RecipeModal.js` (add new fields, checkboxes)
- `frontend/src/pages/Dashboard.js` (handle recipe item groups)

## Success Metrics

- ✅ Users can import recipes from 8+ popular sites
- ✅ Recipes are properly categorized and searchable
- ✅ Users can see what ingredients they have vs need
- ✅ Recipe items are visually grouped in shopping lists
- ✅ Kitchen inventory is easy to manage and update
- ✅ Users can find recipes based on what they have
- ✅ No more `req.user.userId` bugs!

## Notes

- Prioritize fixing the userId bug first (blocks all recipe features)
- Keep backward compatibility (existing recipes should still work)
- Make all new features optional (don't break existing workflows)
- Focus on UX - make it intuitive and beautiful
- Mobile-first design (most users shop on mobile)
