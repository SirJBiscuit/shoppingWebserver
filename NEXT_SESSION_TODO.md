# 🎯 Next Session TODO

**Created:** September 9, 2026 - 11:58 PM

## Summary of Tonight's Accomplishments ✅

1. ✅ Fixed ghost items in home inventory (INNER JOIN + cleanup script)
2. ✅ Fixed delete item bug (proper JOIN with items table)
3. ✅ Fixed automatic pricing override (respects manual price changes)
4. ✅ Fixed flying animation position when switching lists
5. ✅ Made XP notifications faster (400ms) and consolidate multiple
6. ✅ Made XP notifications smaller on mobile
7. ✅ Created ExpiredItemsAlert component for better UX
8. ✅ Updated BUGS_TO_FIX.md with all fixes

## Priority Tasks for Next Session

### High Priority (User Experience)

1. **XP Notification Settings Toggle**
   - Add option in Settings to enable/disable XP notifications
   - Add option to hide certain features/indicators
   - Location: `Settings.js` → User Preferences section
   - Store in localStorage and user preferences

2. **Fix Store Location Save Button**
   - Issue: "Failed to update list" error when saving store location
   - Check: `backend/src/routes/shopping-lists.js` update endpoint
   - Verify: Store location field exists in database schema

3. **Add Icons to "Add Items to Your List" Section**
   - Missing icons to the left of item names in Dashboard
   - Should show emoji/icon for each item
   - Check: Dashboard.js item rendering

4. **Add Checkmark Animation for "Looking for Next"**
   - Add satisfying checkmark animation when marking items
   - Use framer-motion for smooth animation
   - Location: Dashboard.js

### Medium Priority (Features)

5. **Custom Store Creation**
   - Allow users to create custom stores
   - Add to store dropdown
   - Persist in database

6. **My Stores Button/Sidebar Integration**
   - Add "My Stores" button next to "+ Set Store Location"
   - Or add to sidebar for quick access
   - Show list of user's saved stores

7. **Animated Dropdown Categories in Sidebar**
   - Implement collapsible/expandable categories
   - Smooth animations with framer-motion
   - Organize features into logical groups

8. **Admin Toolbar Toggle Button**
   - Add visible toggle button to show/hide admin toolbar
   - Make it accessible from settings or main UI
   - Persist state in localStorage

9. **Improve Default Toolbar**
   - Add logout button
   - Add useful quick-action buttons
   - Make it more functional for regular users

### Low Priority (Performance & Polish)

10. **Faster Page Loading**
    - Optimize component lazy loading
    - Reduce initial bundle size
    - Implement code splitting

11. **Faster Page Transitions**
    - Reduce PageTransition animation duration
    - Make navigation feel snappier
    - Current: Check PageTransition.js

12. **Budget Tracker Persistence**
    - Ensure budget data saves when logged out
    - Use localStorage as backup
    - Sync with server when logged in

13. **Level/XP Saving on Logout**
    - Verify XP and level persist correctly
    - Check leveling system save logic
    - Ensure data doesn't reset

## Files to Check/Modify

### Settings & Preferences
- `frontend/src/pages/Settings.js`
- `frontend/src/utils/userPreferences.js`
- `frontend/src/context/FeatureFlagContext.js`

### Dashboard & Shopping Lists
- `frontend/src/pages/Dashboard.js`
- `backend/src/routes/shopping-lists.js`
- `frontend/src/components/FlyingItemAnimation.js`

### Sidebar & Navigation
- `frontend/src/components/Sidebar.js`
- `frontend/src/components/PageTransition.js`

### Stores & Locations
- `backend/src/routes/stores.js` (may need to create)
- `frontend/src/components/StoreSelector.js` (may need to create)

### Admin Toolbar
- `frontend/src/components/AdminToolbar.js`

### XP & Leveling
- `frontend/src/components/XPNotification.js` ✅ (already updated)
- `frontend/src/components/LevelingSystem.js`
- `backend/src/routes/user.js` (for saving XP/level)

### Budget Tracker
- `frontend/src/components/BudgetTracker.js`
- `frontend/src/services/budgetAPI.js`

## Quick Wins (Start Here)

1. **Add icons to Dashboard items** - Simple visual fix
2. **Add checkmark animation** - Quick satisfaction boost
3. **XP notification toggle** - Easy settings addition
4. **Fix store location save** - Critical bug fix

## Notes

- All critical bugs from previous session are now fixed ✅
- Focus on UX improvements and polish
- Many of these can be done in parallel
- Prioritize user-facing features over backend optimizations

## Server Deployment Checklist

When ready to deploy:
```bash
cd /opt/cloudmc-shop
git pull origin main

# Run ghost items cleanup (one-time)
docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/scripts/cleanup-ghost-items.sql

# Restart services
docker restart shop_backend
cd frontend && npm run build
docker restart shop_frontend
```
