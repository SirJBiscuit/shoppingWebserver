# Testing Kitchen Inventory System

## 🎯 Test URL
**Local:** http://localhost:3006/pantry-new
**Production:** https://listzy.app/pantry-new

## ✅ Pre-Test Checklist

### Backend (Already Deployed ✅)
- [x] Database migration run (026_kitchen_inventory_revamp.sql)
- [x] Backend API deployed (inventory_enhanced.js)
- [x] Expiration service deployed (expirationService.js)
- [x] Server restarted

### Frontend (Ready to Test)
- [x] All components created
- [x] Route added (/pantry-new)
- [x] API service created
- [x] Expiration helper added

## 📋 Test Plan

### 1. Page Load Test
**Steps:**
1. Navigate to `/pantry-new`
2. Check for loading spinner
3. Verify page loads without errors

**Expected:**
- ✅ Page loads successfully
- ✅ No console errors
- ✅ Sidebar visible
- ✅ Header shows "Kitchen Inventory"

**Potential Issues:**
- ❌ 404 on API calls → Check backend is running
- ❌ Auth errors → Check token in localStorage
- ❌ Component errors → Check console for missing imports

---

### 2. Storage Location Tabs Test
**Steps:**
1. Check default tabs (All Items, Pantry, Fridge, Freezer)
2. Click "+ Add Location" button
3. Create custom location:
   - Name: "Wine Rack"
   - Icon: 🍷
   - Color: Purple
4. Save and verify it appears

**Expected:**
- ✅ All 4 default tabs visible
- ✅ Modal opens with icon/color pickers
- ✅ Custom location appears in tabs
- ✅ Can edit/delete custom location (hover to see buttons)

**Potential Issues:**
- ❌ Tabs not showing → Check API response format
- ❌ Modal not opening → Check state management
- ❌ Can't save location → Check API endpoint

---

### 3. Add Item Test
**Steps:**
1. Click "+ Add Item" button
2. Fill out form:
   - Item Name: "Milk"
   - Storage Location: Fridge
   - Category: Dairy & Eggs
   - Quantity: 1
   - Unit: gallon
   - Bought Date: Today
   - Price: 3.99
   - Store: Walmart
3. Save item

**Expected:**
- ✅ Modal opens with all fields
- ✅ Dropdowns populated
- ✅ Item saves successfully
- ✅ Item appears in grid
- ✅ Expiration badge shows (auto-calculated)

**Potential Issues:**
- ❌ Modal doesn't open → Check showAddModal state
- ❌ Dropdowns empty → Check categories/locations data
- ❌ Save fails → Check API payload format
- ❌ No expiration badge → Check expirationHelper

---

### 4. Inventory Card Test
**Steps:**
1. View the created item card
2. Check all displayed info:
   - Item name
   - Quantity
   - Location icon
   - Category badge
   - Bought date
   - Price
   - Store
3. Click menu button (top left)
4. Try each action:
   - Edit Item
   - Add to Shopping List
   - Mark as Opened
   - Still Good
   - Went Bad
   - Delete

**Expected:**
- ✅ All info displays correctly
- ✅ Expiration badge shows color-coded status
- ✅ Menu opens with all actions
- ✅ Each action works without errors

**Potential Issues:**
- ❌ Missing data → Check item object structure
- ❌ Actions fail → Check API endpoints
- ❌ Menu doesn't close → Check state management

---

### 5. Expiration Status Test
**Steps:**
1. Add items with different expiration dates:
   - Fresh: Expiry in 10 days (Green)
   - Use Soon: Expiry in 5 days (Yellow)
   - Urgent: Expiry in 2 days (Orange)
   - Expired: Expiry yesterday (Red)
2. Verify badge colors
3. Click "Still Good" on urgent item
4. Verify expiration extends by 3 days
5. Click "Went Bad" on an item
6. Verify it's removed and learning recorded

**Expected:**
- ✅ Badges show correct colors
- ✅ "Still Good" extends expiration
- ✅ "Went Bad" removes item
- ✅ Toast notifications appear

**Potential Issues:**
- ❌ Wrong colors → Check expirationHelper logic
- ❌ "Still Good" doesn't work → Check API endpoint
- ❌ "Went Bad" fails → Check learning endpoint

---

### 6. Filter & Search Test
**Steps:**
1. Add multiple items (different categories, locations)
2. Use search bar to find item
3. Click "Expiring Soon" filter
4. Click "Opened" filter
5. Open advanced filters:
   - Filter by category
   - Filter by price range
   - Filter by freshness status
6. Try sorting options:
   - Sort by Name
   - Sort by Expiration
   - Sort by Date Added
   - Sort by Category

**Expected:**
- ✅ Search filters items in real-time
- ✅ Quick filters work
- ✅ Advanced filters apply correctly
- ✅ Sorting changes order
- ✅ Can clear all filters

**Potential Issues:**
- ❌ Search doesn't work → Check API query params
- ❌ Filters don't apply → Check filter state
- ❌ Sort doesn't work → Check sort_by param

---

### 7. Stats Dashboard Test
**Steps:**
1. Click "Show Stats" button
2. Verify all stat cards:
   - Total Items
   - Expiring Soon
   - Expired
   - Opened Items
   - Storage Locations
   - Total Value
3. Check "Items Expiring Soon" list
4. Click "Hide Stats"

**Expected:**
- ✅ All stats display correctly
- ✅ Counts match actual items
- ✅ Total value calculates correctly
- ✅ Expiring soon list shows items
- ✅ Toggle works

**Potential Issues:**
- ❌ Stats don't load → Check /stats endpoint
- ❌ Counts wrong → Check calculation logic
- ❌ Value incorrect → Check price parsing

---

### 8. Location Switching Test
**Steps:**
1. Add items to different locations
2. Click "All Items" tab
3. Click "Pantry" tab
4. Click "Fridge" tab
5. Click "Freezer" tab
6. Click custom location tab
7. Verify item counts on tabs

**Expected:**
- ✅ All Items shows everything
- ✅ Each tab shows only items in that location
- ✅ Item counts are correct
- ✅ Switching is smooth

**Potential Issues:**
- ❌ Wrong items shown → Check location filter
- ❌ Counts wrong → Check getItemCounts logic
- ❌ Custom location doesn't work → Check custom_location_id

---

### 9. Mobile/Tablet Test
**Steps:**
1. Open on tablet (or use browser dev tools)
2. Test touch interactions:
   - Tap cards
   - Tap buttons
   - Scroll tabs
   - Open modals
3. Verify responsive layout:
   - Grid adjusts to screen size
   - Buttons are large enough (60px+)
   - Text is readable

**Expected:**
- ✅ All touch targets are 60px+ minimum
- ✅ Layout adapts to screen size
- ✅ No horizontal scrolling
- ✅ Modals are full-screen on mobile

**Potential Issues:**
- ❌ Buttons too small → Add min-height/width
- ❌ Layout breaks → Check responsive classes
- ❌ Can't scroll → Check overflow settings

---

### 10. Error Handling Test
**Steps:**
1. Try to add item without name
2. Try to delete custom location with items
3. Disconnect internet and try to load
4. Try invalid API calls

**Expected:**
- ✅ Validation errors show
- ✅ Can't delete location with items
- ✅ Error toasts appear
- ✅ Loading states handle failures

**Potential Issues:**
- ❌ No error messages → Add error handling
- ❌ App crashes → Add try/catch blocks
- ❌ No loading states → Add loading indicators

---

## 🐛 Common Issues & Fixes

### Issue: "Cannot read property 'map' of undefined"
**Cause:** API returned unexpected format
**Fix:** Add default values: `items || []`

### Issue: Expiration badge not showing
**Cause:** expirationStatus not calculated
**Fix:** Check enrichItemsWithExpirationStatus is called

### Issue: Custom locations not loading
**Cause:** API endpoint not found
**Fix:** Verify backend route is registered

### Issue: "401 Unauthorized"
**Cause:** Token expired or missing
**Fix:** Re-login or check localStorage token

### Issue: Items not filtering by location
**Cause:** Wrong filter parameter
**Fix:** Check storage_location vs custom_location_id

---

## 📊 Success Criteria

✅ **Must Have:**
- [ ] Page loads without errors
- [ ] Can add/edit/delete items
- [ ] Expiration badges show correct colors
- [ ] Filters and search work
- [ ] Stats display correctly
- [ ] Mobile responsive

✅ **Nice to Have:**
- [ ] Smooth animations
- [ ] Fast load times (<2s)
- [ ] No console warnings
- [ ] Accessible (keyboard navigation)

---

## 🚀 Next Steps After Testing

1. **If tests pass:**
   - Replace old /pantry route with PantryNew
   - Deploy to production
   - Announce new feature

2. **If tests fail:**
   - Document bugs
   - Fix critical issues
   - Re-test
   - Iterate

3. **Future enhancements:**
   - Add receipt scanner
   - Add drag & drop
   - Add barcode scanner
   - Add image upload
   - Add export data

---

## 📝 Test Results Template

```
Date: ___________
Tester: ___________
Environment: Local / Production

Test 1 - Page Load: ✅ / ❌
Notes: ___________

Test 2 - Storage Tabs: ✅ / ❌
Notes: ___________

Test 3 - Add Item: ✅ / ❌
Notes: ___________

Test 4 - Inventory Card: ✅ / ❌
Notes: ___________

Test 5 - Expiration Status: ✅ / ❌
Notes: ___________

Test 6 - Filters & Search: ✅ / ❌
Notes: ___________

Test 7 - Stats Dashboard: ✅ / ❌
Notes: ___________

Test 8 - Location Switching: ✅ / ❌
Notes: ___________

Test 9 - Mobile/Tablet: ✅ / ❌
Notes: ___________

Test 10 - Error Handling: ✅ / ❌
Notes: ___________

Overall Status: PASS / FAIL
Critical Bugs: ___________
Minor Bugs: ___________
Recommendations: ___________
```
