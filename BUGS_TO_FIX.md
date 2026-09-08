# 🐛 Bugs To Fix

**Last Updated:** September 8, 2026

## ❌ Not Fixed Yet

### High Priority
- [ ] **Home Inventory - Delete Item Fails (500 Error)**
  - **Issue:** Deleting items returns 500 error
  - **Root Cause:** Missing `inventory_history` table on production server
  - **Fix:** Run migration 030 (`fix-features.sh` script updated)
  - **Status:** Fix ready, needs deployment
  - **Test:** Delete an item in Home Inventory, check console for success

- [ ] **Feature Flags Not Loading**
  - **Issue:** All features show "not found" in console
  - **Root Cause:** `feature_flags` table empty or missing
  - **Fix:** Run `fix-features.sh` to populate table
  - **Status:** Fix ready, needs deployment
  - **Test:** Check console, features should load without errors

- [ ] **Inventory Stats API Failing (500 Error)**
  - **Issue:** `api/inventory/stats` returns 500 error
  - **Root Cause:** Unknown - needs investigation after history table fix
  - **Fix:** TBD
  - **Status:** Needs investigation
  - **Test:** Open Home Inventory, check if stats load

### Medium Priority
- [ ] **Admin Toolbar Blocking Content**
  - **Issue:** Admin toolbar covers logout button and other UI elements
  - **Root Cause:** Z-index conflicts
  - **Fix:** Toggle added in Settings page to hide toolbar
  - **Status:** Workaround implemented, needs testing
  - **Test:** Go to Settings → Toggle Admin Toolbar off

- [ ] **User Management - Failed to Fetch Users (403)**
  - **Issue:** User management page shows "failed to fetch users"
  - **Root Cause:** User not logged in as admin account
  - **Fix:** Log in as `guy69` (admin account)
  - **Status:** User error, not a bug
  - **Test:** Log out, log in as `guy69`, check User Management

### Low Priority
- [ ] **Mobile/Desktop Responsiveness Issues in Home Inventory**
  - **Issue:** Layout problems on mobile/desktop (needs specifics)
  - **Root Cause:** TBD - needs user to specify which screens/elements
  - **Fix:** TBD
  - **Status:** Needs more details
  - **Test:** TBD

---

## ✅ Fixed & Verified

*(Nothing here yet - move items here after testing confirms they work)*

---

## 📝 Notes

- Always test fixes on production server before marking as complete
- Check browser console (F12) for detailed error messages
- Run `./fix-features.sh` script to fix database-related issues
