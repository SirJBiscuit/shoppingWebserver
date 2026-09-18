# Backburner - Unused Components & Pages

This folder contains components and pages that are **not currently in use** but may be useful in the future.

**Purpose:** Keep code for potential future use without cluttering the active codebase.

---

## 📁 Folder Structure

```
backburner/
├── components/     - Unused React components
└── pages/          - Old/duplicate page versions
```

---

## 🔍 What's Here

### **Components (46 files)**

#### **Feature Components (Not Currently Used)**
- `AchievementsPanel.js` - Gamification achievements
- `AdvancedAnalytics.js` - Advanced analytics dashboard
- `BudgetGoals.js` - Budget goal setting
- `DealsAndCoupons.js` - Deals and coupons system
- `GroceryDelivery.js` - Delivery integration
- `IntegrationsHub.js` - Third-party integrations
- `NutritionTracker.js` - Nutrition tracking
- `PremiumPrompt.js` - Premium subscription prompts
- `ReceiptScanner.js` - Receipt scanning
- `SubscriptionModal.js` - Subscription management
- `TripPlanner.js` - Shopping trip planner
- `UserManagement.js` - User management admin panel

#### **Alternative Implementations**
- `ActiveItemFinder.js` - Alternative item finder
- `BestDayBadge.js` - Best shopping day indicator
- `BulkActions.js` - Bulk action operations
- `ClearCacheButton.js` - Cache clearing utility
- `CustomQuickActions.js` - **Replaced by CustomRadialMenu**
- `DashboardEditor.js` - Dashboard layout editor
- `FeatureManager.js` - Feature flag manager (old)
- `FeatureManagerEnhanced.js` - Feature flag manager (enhanced)
- `TabletNumberPad.js` - Tablet-optimized number pad

#### **UI Components (Alternatives/Unused)**
- `ConfirmModal.js` - Confirmation modal (old version)
- `CustomizationHub.js` - Customization center
- `CustomizationPanel.js` - Customization panel
- `ItemTooltip.js` - Item tooltip
- `LiveEditorOverlay.js` - Live editor overlay
- `Tooltip.js` - Generic tooltip

#### **Recipe/Meal Planning**
- `MealCalendar.js` - Meal calendar view
- `MealPlanner.js` - Meal planning component
- `RecipeAIAssistant.js` - AI recipe assistant
- `RecipeCardMini.js` - Mini recipe cards
- `RecipeDiscovery.js` - Recipe discovery
- `RecipeScaling.js` - Recipe scaling utility

#### **Shopping Features**
- `ShoppingRecommendations.js` - Shopping recommendations
- `ShoppingTimer.js` - Shopping timer
- `SmartShoppingMode.js` - Smart shopping mode
- `SmartSuggestionTooltip.js` - Smart suggestion tooltips
- `TrendingItems.js` - Trending items widget

#### **Store/Location**
- `MultiStoreManager.js` - Multi-store management
- `StoreLocationPicker.js` - Store location picker
- `StoreLocator.js` - Store locator
- `StoreSelector.js` - Store selector

#### **Price/History**
- `PriceChart.js` - Price chart visualization
- `PriceHistory.js` - Price history tracking

#### **Inventory**
- `InventoryPanel.js` - Inventory panel
- `ItemHistoryWidget.js` - Item history widget

#### **Lists/Templates**
- `ListTemplates.js` - List templates
- `SaveLayoutModal.js` - Save layout modal
- `ShareListModal.js` - Share list modal

#### **Other**
- `UpdateChecker.js` - Update checker
- `VoiceAssistant.js` - Voice assistant

---

### **Pages (4 files)**

#### **Old Versions**
- `Admin.old.js` - Old admin page (replaced)
- `PantryNew.js` - Pantry page iteration 1
- `PantryNewV2.js` - Pantry page iteration 2
- `RecipesNew.js` - Recipes page iteration

---

## ✅ Why These Are Here

1. **Not Currently Used** - No active imports in the codebase
2. **Potential Future Value** - May be useful for future features
3. **Code Reference** - Good examples for similar features
4. **Clean Codebase** - Keeps active components folder organized

---

## 🔄 How to Use

### **To Reactivate a Component:**

1. Move it back to `/frontend/src/components/`
   ```bash
   git mv frontend/src/backburner/components/ComponentName.js frontend/src/components/
   ```

2. Import and use it in your code
   ```javascript
   import ComponentName from '../components/ComponentName';
   ```

3. Test thoroughly - may need updates for current dependencies

---

### **To Delete Permanently:**

Only delete if you're **absolutely sure** you won't need it:

```bash
git rm frontend/src/backburner/components/ComponentName.js
```

---

## 📝 Notes

- **CustomQuickActions** was replaced by **CustomRadialMenu** (more versatile)
- **FeatureManager** has two versions - enhanced is newer
- **ConfirmModal** was replaced by **CustomNotification** system
- Old page versions kept for reference during refactoring

---

## 🎯 Recommendation

**Before deleting anything:**
1. Check if similar functionality is needed
2. Review the code for useful patterns
3. Consider if it could be refactored for current use

**Keep this folder clean:**
- Don't add broken/incomplete code
- Only add components that were once functional
- Document why each component was moved here

---

**Last Updated:** September 17, 2026
**Total Components:** 46
**Total Pages:** 4
