# Bug Fix & Implementation Plan

**Created:** September 24, 2026  
**Status:** Ready to Execute

---

## 📋 Overview

This document outlines the complete plan to:
1. Fix all critical bugs
2. Restore AVE functionality
3. Implement ASI (Aisle System Implementation)

---

## 🔴 Phase 1: Fix Critical Bugs (IMMEDIATE)

### Files Created:
- ✅ `DIAGNOSE_BUGS.sh` - Diagnostic script
- ✅ `FIX_ALL_BUGS.sql` - Comprehensive database fixes
- ✅ `RUN_BUG_FIXES.md` - Step-by-step commands

### What Gets Fixed:
1. **Add Item Black Screen**
   - Adds `item_icon` column to `shopping_list_items`
   - Adds any other missing columns

2. **Home Inventory Not Loading**
   - Fixes `pantry_inventory` table columns
   - Adds missing columns: `barcode`, `image_url`, `source`, `storage_location`, `profile_id`
   - Fixes unique constraint

3. **Shopping List Recipes**
   - Adds `is_completed` column

4. **AVE Tables**
   - Creates `ave_layouts` table
   - Creates `ave_snapshots` table

5. **Beta System**
   - Creates `beta_codes` table
   - Creates `beta_testers` table
   - Creates `beta_feedback` table

6. **MDL/ASI Tables**
   - Creates `store_locations` table
   - Creates `mdl_aisle_reports` table
   - Creates `mdl_location_aisles` table

### How to Run:

```bash
# 1. SSH to server
ssh root@cup2cup
cd /opt/cloudmc-shop

# 2. Run diagnostic
chmod +x DIAGNOSE_BUGS.sh
./DIAGNOSE_BUGS.sh > diagnostic_output.txt

# 3. Apply fixes
docker exec -i shop_postgres psql -U shopuser -d shopdb < FIX_ALL_BUGS.sql

# 4. Restart backend
docker-compose restart backend

# 5. Test
# - Try adding item
# - Try visiting /pantry-new-v2
# - Check console for errors
```

---

## 🟡 Phase 2: Fix AVE Editing Tools

### Current Status:
- ✅ Overlay working
- ❌ Settings button (needs PropertiesPanel connection)
- ❌ Help button (HelpModal created, needs integration)
- ❌ Grid toggle (needs implementation)
- ❌ Resize handles (needs to be added)
- ❌ Dark mode dropdown (styling issues)

### Files to Modify:

#### 1. `frontend/src/components/editor/EditorToolbar.js`

**Fixes Needed:**
- Wire Settings button to show PropertiesPanel
- Integrate HelpModal (already created)
- Implement grid overlay toggle
- Fix dark mode dropdown styles

#### 2. `frontend/src/components/editor/PropertiesPanel.js`

**Fixes Needed:**
- Ensure it shows when Settings clicked
- Connect to EditorContext
- Display selected widget properties

#### 3. `frontend/src/components/editor/EditableWidget.js`

**Fixes Needed:**
- Add resize handles (8 handles: corners + sides)
- Make handles draggable
- Update widget dimensions on drag

### Implementation Order:
1. Fix Settings button → PropertiesPanel connection
2. Integrate HelpModal
3. Add grid overlay toggle
4. Add resize handles
5. Fix dark mode dropdown

---

## 🟢 Phase 3: Implement ASI Frontend

### Files to Create:

#### 1. `frontend/src/components/MyStoresModal.js`

**Purpose:** Manage user's saved stores

**Features:**
- List saved stores from `/api/mdl/stores/user`
- Show store details (name, location, aisle count)
- Quick switch between stores
- Edit/delete stores
- Mark favorites

**Component Structure:**
```javascript
import { Store, MapPin, Edit, Trash2, Star } from 'lucide-react';
import CustomPanel from './CustomPanel';

const MyStoresModal = ({ isOpen, onClose }) => {
  const [stores, setStores] = useState([]);
  
  // Load stores from API
  // Display in grid/list
  // Handle switch/edit/delete
  
  return (
    <CustomPanel isOpen={isOpen} onClose={onClose} title="My Stores">
      {/* Store cards */}
    </CustomPanel>
  );
};
```

#### 2. Update `frontend/src/components/NextItemSuggestion.js`

**Add Features:**
- Load aisle prediction from `/api/mdl/aisle/:itemName/:storeId`
- Display aisle badges:
  - Purple badge = Confirmed aisle (from `item.aisle`)
  - Amber badge = Predicted aisle (from MDL)
- Add "Found in Aisle" button
- Show aisle reporting UI (grid 1-20 + custom input)
- Submit reports to `/api/mdl/aisle/report`

**Code to Add:**
```javascript
const [predictedAisle, setPredictedAisle] = useState(null);
const [showAisleReport, setShowAisleReport] = useState(false);

useEffect(() => {
  // Load aisle prediction
  if (nextItem && currentStore?.id) {
    fetch(`/api/mdl/aisle/${encodeURIComponent(nextItem.item_name)}/${currentStore.id}`)
      .then(res => res.json())
      .then(data => setPredictedAisle(data));
  }
}, [nextItem, currentStore]);

const reportAisle = async (aisleNumber) => {
  await fetch('/api/mdl/aisle/report', {
    method: 'POST',
    body: JSON.stringify({
      itemName: nextItem.item_name,
      aisleNumber,
      storeId: currentStore.id,
      wasCorrect: aisleNumber === predictedAisle?.aisle
    })
  });
  // Award XP, update item, close modal
};
```

#### 3. Update `frontend/src/pages/Dashboard.js`

**Add:**
- "My Stores" button handler
- Store context/state management
- Current store display

---

## 📊 Testing Checklist

### After Phase 1 (Database Fixes):
- [ ] Add item to shopping list (no black screen)
- [ ] Navigate to /pantry-new-v2 (loads correctly)
- [ ] Check browser console (no errors)
- [ ] Check backend logs (no errors)

### After Phase 2 (AVE Tools):
- [ ] Enable AVE mode
- [ ] Click Settings button (PropertiesPanel appears)
- [ ] Click Help button (HelpModal appears)
- [ ] Toggle Grid (overlay appears/disappears)
- [ ] Select widget (resize handles appear)
- [ ] Drag resize handle (widget resizes)
- [ ] Dark mode dropdown (styled correctly)

### After Phase 3 (ASI):
- [ ] Click "My Stores" (modal opens)
- [ ] View saved stores (list displays)
- [ ] Switch store (updates current store)
- [ ] View "Looking for Next" (aisle badge shows)
- [ ] Click "Found in Aisle" (reporting UI appears)
- [ ] Report aisle (submits successfully)
- [ ] Check next time (aisle prediction improved)

---

## 🎯 Success Criteria

### Phase 1 Complete When:
✅ No black screens  
✅ All tables exist  
✅ Backend logs clean  
✅ Frontend loads without errors

### Phase 2 Complete When:
✅ All AVE toolbar buttons work  
✅ Can edit widget properties  
✅ Can resize widgets  
✅ Grid overlay toggles  
✅ Help modal displays

### Phase 3 Complete When:
✅ Can manage stores  
✅ Aisle predictions display  
✅ Can report aisles  
✅ System learns from reports  
✅ Predictions improve over time

---

## 📝 Notes

- **Markdown Lints:** All documentation files have minor formatting warnings (missing blank lines). These are cosmetic and don't affect functionality. Can be fixed later if needed.

- **Backend Complete:** All backend APIs for ASI are already implemented. Only frontend integration needed.

- **AVE Backend:** AVE database tables will be created in Phase 1. Backend routes already exist.

- **Testing:** Test each phase thoroughly before moving to next phase.

---

## 🚀 Next Actions

**YOU NEED TO:**
1. Run `DIAGNOSE_BUGS.sh` on server
2. Share diagnostic output
3. Run `FIX_ALL_BUGS.sql`
4. Restart backend
5. Test add item and home inventory
6. Report results

**THEN I WILL:**
1. Fix AVE editing tools
2. Implement ASI frontend
3. Test everything
4. Deploy to production

---

**Ready to start? Run the diagnostic script first!**
