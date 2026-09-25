# Code Modernization Plan

**Goal:** Convert all old code to use modern CFS, AVE, MDL, and ASI systems for consistency and better integration.

---

## 🎯 Modernization Principles

1. **Use CFS (Custom Feature Scripts)** - For all UI components and widgets
2. **Use AVE (Admin Visual Editor)** - Make everything editable
3. **Use MDL (Machine Data Learning)** - For all item tracking and predictions
4. **Use ASI (Aisle System Implementation)** - For store and aisle management
5. **Use Custom Components** - CustomPanel, CustomKeypad, CustomNotification, CustomDropdownList
6. **No Old Code** - Delete deprecated components, don't maintain legacy systems

---

## 📋 Components to Modernize

### ✅ Already Modernized

1. **CustomNotification** - Replaced old modals
2. **CustomPanel** - Modern panel system
3. **CustomKeypad** - Number input system
4. **CustomDropdownList** - Dropdown system
5. **ErrorBoundary** - Global error handling
6. **HelpModal** - AVE help system

### 🔄 In Progress

1. **PantryNewV2** - Just converted to CustomNotification ✅

### ❌ Needs Modernization

#### High Priority (Blocking Features)

1. **Dashboard.js**
   - Convert to use CustomNotification instead of window.confirm
   - Make all widgets AVE-editable
   - Integrate MDL item tracking
   - Use CustomDropdownList for all dropdowns
   - Add ASI store management integration

2. **NextItemSuggestion.js**
   - Add ASI aisle prediction display
   - Add "Found in Aisle" reporting
   - Make AVE-editable
   - Use CustomNotification for confirmations

3. **Sidebar.js**
   - Make AVE-editable
   - Use CFS for configuration
   - Add beta features section
   - Modern styling

4. **Shopping List Components**
   - ItemList.js - Make AVE-editable
   - ShoppingListRecipes.js - Use CustomNotification
   - Convert all confirmations to CustomNotification

#### Medium Priority

5. **Admin Pages**
   - AdminTraining.js - Use CustomPanel
   - BetaDashboard.js - Move to Sidebar, use CFS
   - Settings pages - Use CustomPanel and CustomDropdownList

6. **Inventory Components** (in backburner/components)
   - Convert all to use CustomNotification
   - Make AVE-compatible
   - Use CFS for configuration

#### Low Priority

7. **Legacy Components to Delete**
   - Old modals (replace with CustomNotification)
   - Old panels (replace with CustomPanel)
   - Old dropdowns (replace with CustomDropdownList)
   - Deprecated pantry code

---

## 🗑️ Components Moved to Limbo

### Limbo Folder: `frontend/src/limbo/`

Instead of deleting deprecated components, we move them to the **limbo** folder for reference during migration.

**Already Moved:**
1. ✅ `limbo/modals/ConfirmModal.js` - Replaced by CustomNotification
2. ✅ `limbo/modals/ConfirmDialog.js` - Replaced by CustomNotification

**To Be Moved:**

1. **Old Pantry System**
   - `PantryEnhanced.js` → `limbo/pages/PantryEnhanced.js`
   - Old pantry components → `limbo/components/`

2. **Old Dropdown Components**
   - Any dropdowns not using CustomDropdownList → `limbo/components/`

3. **Old Panel Components**
   - Any panels not using CustomPanel → `limbo/components/`

**Timeline:**
- Once modernization is 100% complete, delete the entire limbo folder

---

## 🔧 Modernization Tasks

### Phase 1: Dashboard Modernization (CURRENT)

**File:** `frontend/src/pages/Dashboard.js`

**Changes:**
1. ✅ Replace `window.confirm` with `CustomNotification.confirmDelete()`
2. ✅ Replace all dropdowns with `CustomDropdownList`
3. ✅ Wrap all widgets with AVE `EditableContainer`
4. ✅ Add MDL item tracking on add item
5. ✅ Add ASI store management buttons
6. ✅ Use `useNotification` hook

**Benefits:**
- Consistent UX across app
- All widgets editable in AVE mode
- Better error handling
- Modern, professional UI

---

### Phase 2: NextItemSuggestion + ASI Integration

**File:** `frontend/src/components/NextItemSuggestion.js`

**Changes:**
1. ✅ Add aisle prediction display (purple/amber badges)
2. ✅ Add "Found in Aisle" button
3. ✅ Add aisle reporting UI (1-20 grid + custom input)
4. ✅ Integrate with `/api/mdl/aisle/` endpoints
5. ✅ Make AVE-editable
6. ✅ Use CustomNotification for confirmations

**Benefits:**
- Users see aisle predictions
- System learns from user reports
- Saves shopping time
- Gamification (XP rewards)

---

### Phase 3: Sidebar Modernization

**File:** `frontend/src/components/Sidebar.js`

**Changes:**
1. ✅ Make entire sidebar AVE-editable
2. ✅ Add Beta Program section
3. ✅ Use CFS for menu configuration
4. ✅ Modern animations and styling
5. ✅ Collapsible sections

**Benefits:**
- Customizable navigation
- Easy access to beta features
- Professional appearance

---

### Phase 4: Shopping List Modernization

**Files:**
- `frontend/src/components/ItemList.js`
- `frontend/src/components/ShoppingListRecipes.js`

**Changes:**
1. ✅ Replace all `window.confirm` with CustomNotification
2. ✅ Make AVE-editable
3. ✅ Use CustomDropdownList
4. ✅ Add MDL tracking
5. ✅ Modern card designs

---

### Phase 5: Admin Modernization

**Files:**
- `frontend/src/pages/AdminTraining.js`
- `frontend/src/components/BetaDashboard.js`

**Changes:**
1. ✅ Use CustomPanel for all panels
2. ✅ Move beta features to Sidebar
3. ✅ Use CustomNotification
4. ✅ Modern tab system
5. ✅ AVE-compatible

---

### Phase 6: Cleanup

**Actions:**
1. ✅ Delete deprecated components
2. ✅ Remove old imports
3. ✅ Update documentation
4. ✅ Remove unused dependencies
5. ✅ Clean up CSS

---

## 📊 Progress Tracking

### Overall Progress: 15%

- ✅ **CFS System** - 100% (Complete)
- ✅ **AVE System** - 95% (Needs toolbar fixes)
- ✅ **MDL System** - 100% (Backend complete)
- ✅ **ASI System** - 50% (Backend complete, frontend pending)
- ✅ **Custom Components** - 100% (All created)
- 🔄 **Dashboard** - 30% (Partial modernization)
- ❌ **NextItemSuggestion** - 0% (Not started)
- ❌ **Sidebar** - 0% (Not started)
- ❌ **Shopping List** - 0% (Not started)
- ❌ **Admin Pages** - 0% (Not started)

---

## 🎯 Next Actions

### Immediate (Today)

1. ✅ Finish frontend build (fix PantryNewV2) - DONE
2. 🔄 Modernize Dashboard.js - START NOW
3. 🔄 Test add item and home inventory

### This Week

1. Modernize NextItemSuggestion (ASI integration)
2. Create MyStoresModal (ASI)
3. Modernize Sidebar
4. Fix AVE toolbar buttons

### Next Week

1. Modernize Shopping List components
2. Modernize Admin pages
3. Delete deprecated components
4. Full testing and QA

---

## 🚀 Benefits of Modernization

### For Users
- ✅ Consistent, professional UI
- ✅ Better error messages
- ✅ Faster, smoother interactions
- ✅ Smart predictions (MDL/ASI)
- ✅ Customizable interface (AVE)

### For Developers
- ✅ Single source of truth (CFS)
- ✅ Reusable components
- ✅ Easy to maintain
- ✅ No duplicate code
- ✅ Modern React patterns

### For System
- ✅ Better performance
- ✅ Smaller bundle size
- ✅ Easier debugging
- ✅ Scalable architecture
- ✅ Future-proof

---

## 📝 Code Patterns

### Old Pattern (BAD ❌)
```javascript
// Old confirmation
if (window.confirm('Delete this item?')) {
  deleteItem();
}

// Old dropdown
<select onChange={(e) => setValue(e.target.value)}>
  <option value="1">Option 1</option>
</select>

// Old modal
<OldModal isOpen={isOpen} onClose={onClose}>
  Content
</OldModal>
```

### New Pattern (GOOD ✅)
```javascript
// New confirmation
const { confirmDelete } = useNotification();
confirmDelete('Delete this item?', 'Cannot be undone', () => deleteItem());

// New dropdown
<CustomDropdownList
  value={value}
  onChange={setValue}
  options={[{ value: '1', label: 'Option 1' }]}
  searchable
/>

// New panel
<CustomPanel isOpen={isOpen} onClose={onClose} title="Title">
  Content
</CustomPanel>
```

### AVE Integration Pattern
```javascript
// Make component AVE-editable
import { useEditor } from '../context/EditorContext';
import EditableContainer from '../components/editor/EditableContainer';

const MyComponent = () => {
  const { isEditorActive, selectWidget, selectedWidget, widgetProperties } = useEditor();
  const props = widgetProperties['my-widget'] || {};
  
  return (
    <EditableContainer
      isEditorActive={isEditorActive}
      componentName="My Widget"
      onSelect={() => selectWidget('my-widget', 'dashboard')}
      isSelected={selectedWidget === 'my-widget'}
    >
      <ActualComponent {...props} />
    </EditableContainer>
  );
};
```

---

## 🎓 Learning Resources

- **CFS Guide:** `docs/guides/aes-editor/CFS_FOUNDATION.md`
- **AVE Guide:** `docs/AVE_SYSTEM_SUMMARY.md`
- **AVE Quick Guide:** `docs/AVE_QUICK_GUIDE.md`
- **MDL Integration:** `SYSTEM_OVERVIEW.md`
- **ASI Documentation:** `docs/ASI_AISLE_SYSTEM_IMPLEMENTATION.md`
- **Custom Components:** `docs/guides/custom-components/`

---

**Last Updated:** September 24, 2026  
**Status:** Active Development  
**Priority:** High
