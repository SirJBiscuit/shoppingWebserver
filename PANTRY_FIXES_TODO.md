# Kitchen Inventory Fixes - TODO List

## 🔴 Critical Issues

### 1. Clear Pantry Button Failing
**Problem:** Button says "failed to clear pantry"
**Root Cause:** Backend endpoint exists, need to verify error handling
**Fix:** 
- Replace `window.confirm()` with custom confirmation modal
- Ensure proper error messages from backend
- Use custom toast notifications (not browser alerts)

### 2. Toast/Popup System - Unprofessional Branding
**Problem:** App shows "listzy.app" in popups - looks unprofessional
**Fix:**
- Remove ALL `window.confirm()`, `window.alert()`, `window.prompt()`
- Replace with custom modal components
- Ensure all toasts use `useToast()` hook
- Never show "listzy.app" domain in user-facing messages

### 3. Statistics Not Loading
**Problem:** Kitchen inventory statistics aren't implemented or loading
**Fix:**
- Implement `/api/inventory/stats` endpoint integration
- Create statistics display component
- Show: total items, expiring soon, low stock, total value, etc.

### 4. Feature Management Not Working
**Problem:** Feature flags don't actually disable features in sidebar/UI
**Fix:**
- Create FeatureFlagContext
- Wrap Sidebar items with feature checks
- Hide disabled features from UI
- Show upgrade prompts when feature is disabled

### 5. Multiple Storage Locations UI
**Problem:** When many custom locations exist, UI becomes cluttered
**Fix:**
- Create custom dropdown with 3D scrollbar
- Condense locations into dropdown when > 3 custom locations
- Use custom-scrollbar CSS class

## 🟡 Medium Priority

### 6. Quantity Display
**Current:** Shows 1.00
**Desired:** Show 1 (integer) unless decimal entered
**Status:** Partially fixed in AddItemModal, need to fix in InventoryCard display

### 7. Auto-Detection
**Status:** Implemented in AddItemModal
**Verify:** Category, unit, icon auto-detection working

### 8. Compact Modal Design
**Status:** In progress
**Keep:** User shelf life estimate section (don't remove!)

## ✅ Implementation Checklist

- [ ] Fix clear pantry error handling
- [ ] Replace all window.confirm/alert with custom modals
- [ ] Remove "listzy.app" branding from all messages
- [ ] Implement statistics loading and display
- [ ] Create FeatureFlagContext
- [ ] Update Sidebar to respect feature flags
- [ ] Create storage location dropdown with 3D scrollbar
- [ ] Fix quantity display in InventoryCard
- [ ] Test all toast notifications
- [ ] Verify auto-detection working
- [ ] Keep learning estimate section in modal

## 📝 Files to Modify

### Frontend
1. `frontend/src/pages/PantryNew.js` - Replace window.confirm, add stats
2. `frontend/src/components/inventory/AddItemModal.js` - Keep compact, keep learning section
3. `frontend/src/components/inventory/InventoryCard.js` - Fix quantity display
4. `frontend/src/context/FeatureFlagContext.js` - CREATE NEW
5. `frontend/src/components/Sidebar.js` - Add feature flag checks
6. `frontend/src/components/ConfirmModal.js` - CREATE NEW (custom confirm dialog)
7. `frontend/src/components/inventory/StorageLocationDropdown.js` - CREATE NEW

### Backend
1. `backend/src/routes/inventory_enhanced.js` - Verify clear endpoints, add better error messages
2. `backend/src/routes/features.js` - Ensure feature flags work

## 🎯 Success Criteria

1. ✅ No browser alerts/confirms anywhere
2. ✅ All toasts use custom system
3. ✅ No "listzy.app" branding visible
4. ✅ Statistics load and display correctly
5. ✅ Feature flags actually hide disabled features
6. ✅ Storage locations condense into dropdown
7. ✅ Quantity shows as integer when appropriate
8. ✅ Learning estimate section remains in modal
