# Issues and Fixes - Priority Order

## SSH Commands to Run First

### 1. Check Backend Logs for Real Errors
```bash
cd /opt/cloudmc-shop
docker-compose logs backend --tail=200 | grep -E "(POST|GET|PUT|DELETE|500|404|column|database|syntax)"
```

### 2. Check Database Schema
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_list_items"
```

### 3. Check Pantry API
```bash
docker-compose logs backend | grep -i "pantry"
```

### 4. Restart Backend (if needed)
```bash
docker-compose restart backend
```

---

## Issue 1: Add Item Black Screen ⚠️ CRITICAL

**Status:** Need to verify database schema
**Likely Cause:** Missing database column or backend API error

**Diagnosis Steps:**
1. Check if `item_icon` column exists in `shopping_list_items` table
2. Check backend logs when adding an item
3. Verify the API response

**Fix (if column missing):**
```bash
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "ALTER TABLE shopping_list_items ADD COLUMN IF NOT EXISTS item_icon VARCHAR(255);"
```

---

## Issue 2: Home Inventory Not Loading ⚠️ CRITICAL

**Component:** `PantryEnhanced.js`
**Route:** `/pantry`

**Likely Causes:**
1. Pantry API endpoint not working
2. Database table missing
3. Component error

**Diagnosis:**
```bash
# Check if pantry_inventory table exists
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d pantry_inventory"

# Check backend logs for pantry errors
docker-compose logs backend | grep -i "pantry"
```

**Frontend Check:** Open browser console (F12) and navigate to `/pantry`, check for errors

---

## Issue 3: My Stores - NREI (Not Reimplemented) 🔧

**Status:** Feature needs to be built
**Location:** Dashboard.js - "My Stores" button exists but modal not implemented

**Files to Create:**
- `frontend/src/components/MyStoresModal.js`

**Implementation Plan:**
1. Create MyStoresModal component
2. Fetch stores from `/api/mdl/stores` or `/api/stores/user`
3. Display list of saved stores
4. Allow quick switching between stores
5. Edit/delete functionality

---

## Issue 4: Manage Stores - NREI 🔧

**Status:** Feature needs to be built
**Related to:** My Stores

**Implementation:**
- Store configuration UI
- Aisle layout editor
- Store details management

---

## Issue 5: AVE Editing Tools Not Working ⚠️

**Issues:**
- ✅ Overlay working (fixed)
- ❌ Settings button doesn't open panel
- ❌ Help (?) button doesn't show guide
- ❌ Grid toggle doesn't work
- ❌ Resize icon doesn't work
- ❌ Adaptive dropdown doesn't respect dark mode

**Files to Fix:**
- `frontend/src/components/editor/EditorToolbar.js`
- `frontend/src/components/editor/PropertiesPanel.js`

**Fixes Needed:**
1. Connect Settings button to PropertiesPanel
2. Create Help modal
3. Implement grid overlay toggle
4. Add resize handles to selected widgets
5. Fix dropdown dark mode styles

---

## Issue 6: Active List Not Editable in AVE 🔧

**Component:** Dashboard.js - Active list dropdown
**Fix:** Wrap with `useAVEWidget` hook

**Implementation:**
```javascript
// In Dashboard.js
const ActiveListDropdown = () => {
  const { wrapWithAVE, props } = useAVEWidget('active-list-dropdown', 'dashboard');
  
  return wrapWithAVE(
    <CustomDropdownList
      value={activeList?.id}
      onChange={handleListChange}
      options={listOptions}
      {...props}
    />
  );
};
```

---

## Issue 7: Floating Buttons Not Editable in AVE 🔧

**Components:** 
- Add Item button
- Floating action buttons

**Fix:** Wrap each button with EditableContainer

---

## Issue 8: Beta Tester Code Generation Failed ⚠️

**Location:** Admin Beta Dashboard
**Error:** "Failed to generate code"

**Diagnosis:**
```bash
# Check backend logs for beta code generation
docker-compose logs backend | grep -i "beta"

# Check if beta_codes table exists
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d beta_codes"
```

**Likely Causes:**
1. Backend API endpoint missing
2. Database table missing
3. Permission issue

---

## Issue 9: Move Beta Tester Features to Sidebar 🔧

**Current:** Beta features in Admin page
**Target:** Move to Sidebar for easier access

**Implementation:**
1. Add "Beta Program" item to Sidebar
2. Create compact beta panel
3. Show beta code, tester count, invite link

---

## Issue 10: Sidebar Not Editable in AVE 🔧

**Component:** `Sidebar.js`
**Fix:** Make entire sidebar AVE-compatible

**Implementation:**
```javascript
// Wrap Sidebar with useAVEWidget
const Sidebar = () => {
  const { wrapWithAVE, props } = useAVEWidget('sidebar', 'sidebar');
  
  return wrapWithAVE(
    <SidebarContent {...props} />
  );
};
```

---

## Quick Wins (Can Fix Immediately)

### 1. Fix AVE Dark Mode Dropdown
**File:** `frontend/src/components/editor/EditorToolbar.js`
**Issue:** Adaptive dropdown doesn't respect dark mode

### 2. Add Help Button Functionality
**File:** `frontend/src/components/editor/EditorToolbar.js`
**Create:** `frontend/src/components/editor/HelpModal.js`

### 3. Connect Settings Button
**File:** `frontend/src/components/editor/EditorToolbar.js`
**Fix:** Make settings button toggle PropertiesPanel

---

## Commands Summary

**Run these in your SSH terminal:**

```bash
# 1. Navigate to project
cd /opt/cloudmc-shop

# 2. Check for errors
docker-compose logs backend --tail=200 | grep -E "(error|Error|failed|Failed|500|404)"

# 3. Check database tables
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\dt"

# 4. Check shopping_list_items schema
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_list_items"

# 5. Check pantry_inventory schema
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d pantry_inventory"

# 6. Check beta_codes table
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d beta_codes"

# 7. Restart backend if needed
docker-compose restart backend

# 8. Watch logs in real-time
docker-compose logs -f backend
```

---

## Next Steps

1. **Run the SSH commands above** and paste the output
2. I'll identify the exact database/backend issues
3. Fix critical bugs (black screen, pantry not loading)
4. Implement AVE editing tools
5. Build My Stores and Manage Stores features
6. Move beta features to sidebar
7. Make all components AVE-editable

**Please run the commands and share the output so I can provide exact fixes!**
