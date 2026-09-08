# 🐛 Bugs To Fix

**Last Updated:** September 8, 2026 - 1:54 PM

## ❌ Not Fixed Yet

### Critical Priority (Blocking Usage)

- [ ] **Automatic Price Override - Can't Manually Set Price**
  - **Issue:** When typing item name (e.g., "bread"), automatic price is added and can't be changed manually
  - **Root Cause:** Auto-suggestion overriding manual input, no way to disable auto-price
  - **Fix:** Add toggle to disable auto-price, or allow manual override after auto-fill
  - **Status:** Needs fix
  - **Test:** Type "bread", try to manually change price field

- [ ] **Delete Item Still Fails After Running fix-features.sh**
  - **Issue:** Delete still returns 500 error even after running fix script
  - **Root Cause:** Migration may not have run correctly, or different issue
  - **Fix:** Check server logs, verify migration ran, investigate actual error
  - **Status:** Needs investigation
  - **Test:** Delete an item, check backend logs for exact error

- [ ] **Admin Toolbar Covering Normal Toolbar**
  - **Issue:** Admin mode toolbar blocks important elements in normal toolbar
  - **Root Cause:** Z-index and positioning conflicts
  - **Fix:** Adjust z-index, add proper spacing/margin
  - **Status:** Needs fix
  - **Test:** Check if normal toolbar is accessible with admin toolbar visible

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

- [x] **Sidebar Hidden on /settings Page**
  - **Fixed:** September 8, 2026
  - **Solution:** Added Sidebar component to Settings.js with proper lg:ml-72 margin
  - **Commit:** 69c624d

- [x] **Sidebar Hidden on Meal Planner Page**
  - **Fixed:** September 8, 2026
  - **Solution:** Added Sidebar component to MealPlan.js with proper lg:ml-72 margin
  - **Commit:** 69c624d

- [x] **Auto-Price Overriding Manual Input**
  - **Fixed:** September 8, 2026
  - **Solution:** Added manualPriceSet flag to track user input and prevent auto-override
  - **Commit:** ea489e3

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
