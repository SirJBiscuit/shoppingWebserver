# 🐛 Bugs To Fix

**Last Updated:** September 9, 2026 - 11:52 PM

## ❌ Not Fixed Yet

### Critical Priority (Blocking Usage)

None! All critical bugs have been fixed.

### High Priority

- [ ] **Admin Toolbar Toggle Not Working Properly**
  - **Issue:** Can't hide admin toolbar with toggle button
  - **Root Cause:** localStorage toggle may not be working, or page not refreshing
  - **Fix:** Debug toggle functionality, ensure it actually hides toolbar
  - **Status:** Needs investigation
  - **Test:** Toggle admin toolbar in Settings, verify it hides/shows

- [ ] **Feature Flags Issues with Home Inventory**
  - **Issue:** Feature flags causing problems with home inventory functionality
  - **Root Cause:** Specific features not loading or misconfigured
  - **Fix:** TBD - need to identify which flags are problematic
  - **Status:** Needs more details
  - **Test:** Check console for feature flag errors on home inventory page

- [ ] **Feature Flags Issues with Store Location**
  - **Issue:** Store location feature having flag-related problems
  - **Root Cause:** TBD
  - **Fix:** TBD
  - **Status:** Needs more details
  - **Test:** TBD

- [ ] **Home Inventory Icons Not Displaying**
  - **Issue:** Item/ingredient icons don't show properly in home inventory
  - **Root Cause:** Icon URLs missing, cosmetic_icons table empty, or image paths wrong
  - **Fix:** Check cosmetic_icons table, verify icon URLs, check image rendering
  - **Status:** Needs investigation
  - **Test:** Open home inventory, verify items show icons

- [ ] **Sidebar Hidden on Meal Planner Page**
  - **Issue:** Meal planner page doesn't show sidebar
  - **Root Cause:** Meal planner component may not include Sidebar
  - **Fix:** Add Sidebar to meal planner layout
  - **Status:** Needs fix
  - **Test:** Navigate to meal planner, verify sidebar is visible

### Medium Priority

- [ ] **Feature Management - Drag to Reorder Doesn't Work**
  - **Issue:** In /admin feature management, dragging features doesn't change order
  - **Root Cause:** Drag handlers not saving order to backend, or not updating state
  - **Fix:** Implement save on drag end, update display_order in database
  - **Status:** Needs fix
  - **Test:** Drag features in admin, verify order persists and updates live preview

- [ ] **Feature Management - Enable/Disable Doesn't Update Sidebar**
  - **Issue:** Toggling features on/off doesn't immediately update sidebar
  - **Root Cause:** Sidebar not listening to feature flag changes, no real-time update
  - **Fix:** Add feature flag context listener, refresh sidebar on changes
  - **Status:** Needs fix
  - **Test:** Toggle a feature in admin, verify sidebar updates without page refresh

---

## ✅ Fixed & Verified

- [x] **Ghost Items in Home Inventory**
  - **Fixed:** September 9, 2026
  - **Solution:** Changed LEFT JOIN to INNER JOIN in inventory query to prevent orphaned records from showing. Added cleanup script to remove existing ghost items.
  - **Commit:** e7d17f4

- [x] **Delete Item Fails - Column Mismatch**
  - **Fixed:** September 9, 2026
  - **Solution:** Fixed delete route to properly JOIN with items table to get item_name. Fixed column name from i.icon to i.preferred_icon in suggestions.
  - **Commit:** bef1a04, 802262e

- [x] **Auto-Price Overriding Manual Input (Complete Fix)**
  - **Fixed:** September 9, 2026
  - **Solution:** Added manualPriceSet checks in all auto-fill locations (preferences, search results, suggestions) to prevent overriding user's manual price changes
  - **Commit:** 3dc2960

- [x] **Flying Animation Going to Wrong Position**
  - **Fixed:** September 9, 2026
  - **Solution:** Added requestAnimationFrame to recalculate cart position immediately when flying items change (e.g., when switching lists)
  - **Commit:** 3dc2960

- [x] **XP Notifications Too Slow**
  - **Fixed:** September 9, 2026
  - **Solution:** Reduced duration from 600ms to 400ms, added consolidation for multiple XP gains within 500ms, made smaller on mobile
  - **Commit:** 3dc2960

- [x] **Expired Items Cluttering Inventory**
  - **Fixed:** September 9, 2026
  - **Solution:** Created ExpiredItemsAlert component to show expired items as dismissible notifications instead of in main inventory list
  - **Commit:** e7d17f4

- [x] **Sidebar Hidden on /settings Page**
  - **Fixed:** September 8, 2026
  - **Solution:** Added Sidebar component to Settings.js with proper lg:ml-72 margin
  - **Commit:** 69c624d

- [x] **Sidebar Hidden on Meal Planner Page**
  - **Fixed:** September 8, 2026
  - **Solution:** Added Sidebar component to MealPlan.js with proper lg:ml-72 margin
  - **Commit:** 69c624d

- [x] **Admin Toolbar Covering Normal Toolbar**
  - **Fixed:** September 8, 2026
  - **Solution:** Changed from fixed to sticky positioning, lowered z-index to 20
  - **Commit:** 461dbd6

- [x] **Home Inventory Icons Not Displaying (Partial)**
  - **Fixed:** September 8, 2026
  - **Solution:** Added detectIcon fallback logic in InventoryCard component
  - **Commit:** bd49836
  - **Note:** Full 3D icon integration pending (requires browser automation for scraping)

---

## 📝 Notes

- Always test fixes on production server before marking as complete
- Check browser console (F12) for detailed error messages
- Run `./fix-features.sh` script to fix database-related issues
