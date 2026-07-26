# Recipe Book Fix Plan

## Issues Found:

1. **Data Format Mismatch**
   - Frontend sends: `amount` (single field like "2 cups")
   - Backend expects: `quantity` and `unit` (separate fields)
   - This causes recipe creation to fail

2. **Missing Features**
   - No proper URL import UI
   - No active recipe tracking
   - No inventory comparison integration
   - No shopping list integration from recipe view

3. **Poor UX**
   - Import from URL is hidden/unclear
   - No visual feedback on what's missing
   - Can't track which recipes you're making

## Fixes Needed:

### 1. Fix RecipeModal Data Format
- Parse `amount` field into `quantity` and `unit`
- Handle various formats: "2 cups", "1/2 tsp", "3", etc.
- Send correct format to backend

### 2. Enhanced URL Import
- Prominent "Import from URL" button
- Support multiple recipe sites
- Show preview before saving
- Auto-fill all fields

### 3. Active Recipe Tracking
- Add `is_active` flag to recipes table
- "Start Cooking" button
- Show active recipes prominently
- Timer/progress tracking

### 4. Inventory Integration
- "Check Ingredients" button on each recipe
- Show what you have vs need
- Color-coded (green=have, red=need)
- One-click add missing to shopping list

### 5. Shopping List Integration
- "Add to Shopping List" button
- Tag items with recipe_id
- Group recipe items together
- Track completion

## Implementation Steps:

1. Update RecipeModal to parse amount field
2. Add import URL UI prominently
3. Add inventory comparison modal
4. Add shopping list integration
5. Add active recipe tracking
6. Test all flows end-to-end
