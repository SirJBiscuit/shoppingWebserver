# 🧠 Smart Inventory Features

## Overview
Intelligent kitchen inventory management with AI-powered suggestions, usage pattern analysis, and proactive notifications.

---

## ✅ Completed Features

### 1. **Duplicate Button Fix**
- ✅ Removed redundant "Add First Item" button
- ✅ Single "+ Add Item" button always visible in header
- ✅ Empty state now points users to the button

### 2. **Smart Suggestion Tooltip Component**
**File:** `frontend/src/components/SmartSuggestionTooltip.js`

Beautiful inline tooltips that appear on shopping list items with 4 types:

#### **A. Already Have It Warning** 🟡
```jsx
<SmartSuggestionTooltip 
  type="already-have"
  item={{ name: "Milk" }}
  inventoryData={{
    location: "Fridge",
    quantity: 1,
    unit: "gallon",
    expiresIn: 5
  }}
  onAction={(action) => {
    // 'remove' or 'keep'
  }}
/>
```

Shows:
- ⚠️ "You already have this in Fridge"
- Quantity and expiration
- [Remove from list] [Keep anyway] buttons

#### **B. Smart Reorder Suggestion** 🔵
```jsx
<SmartSuggestionTooltip 
  type="smart-reorder"
  item={{ name: "Bread" }}
  inventoryData={{
    avgDays: 5,
    suggestedAmount: 2,
    unit: "loaves"
  }}
  onAction={(action, amount) => {
    // 'add-suggested' or 'customize'
  }}
/>
```

Shows:
- 💡 "Based on your usage, you buy Bread every 5 days"
- Suggested amount based on history
- [Add 2] [Custom amount] buttons

#### **C. Low Stock Alert** 🟠
```jsx
<SmartSuggestionTooltip 
  type="low-stock"
  item={{ name: "Eggs" }}
  inventoryData={{
    currentAmount: 3,
    unit: "eggs",
    avgUsage: "12/week"
  }}
  onAction={(action, amount) => {
    // 'add' with amount or 'customize'
  }}
/>
```

Shows:
- 📉 "Running low on Eggs"
- Current amount and usage rate
- [Add 1] [Add 2] [Custom] buttons

#### **D. Expiring Soon Alert** 🔴
```jsx
<SmartSuggestionTooltip 
  type="expiring-soon"
  item={{ name: "Yogurt" }}
  inventoryData={{
    daysUntilExpiry: 2,
    location: "Fridge"
  }}
  onAction={(action) => {
    // 'add-to-list' or 'use-now'
  }}
/>
```

Shows:
- 🔔 "Yogurt is expiring soon"
- Days until expiry and location
- [Add to shopping list] [I'll use it] buttons

### 3. **Smart Suggestions Backend Service**
**File:** `backend/src/services/smartSuggestionsService.js`

#### **Functions:**

**`checkInventoryForItem(userId, itemName)`**
- Checks if user already has an item
- Returns quantity, location, expiration info
- Used when adding items to shopping lists

**`getSmartReorderSuggestion(userId, itemName)`**
- Analyzes last 10 purchases
- Calculates average days between purchases
- Suggests optimal reorder amount
- Returns confidence score (0-1)

**`checkLowStock(userId, itemId)`**
- Analyzes usage patterns
- Calculates days remaining
- Alerts when < 3 days worth left

**`getExpiringItemsSuggestions(userId, daysThreshold)`**
- Gets all items expiring within X days
- Sorted by expiration date
- Perfect for proactive shopping

**`calculateExpirationFromSellBy(sellByDate, category, storageLocation)`**
- Converts sell-by date to actual expiration
- Category-specific adjustments:
  - Dairy: +5 days (fridge)
  - Meat: +2 days (fridge), +90 days (freezer)
  - Produce: +7 days (fridge)
  - Bread: +2 days (pantry), +90 days (freezer)
  - Eggs: +21 days (fridge)
  - Milk: +5 days (fridge), +90 days (freezer)

### 4. **Smart Suggestions API Endpoints**
**File:** `backend/src/routes/inventory_enhanced.js`

```javascript
// Check if item exists in inventory
POST /api/inventory/check-inventory
Body: { itemName: "Milk" }
Response: { hasItem: true, quantity: 1, location: "Fridge", expiresIn: 5 }

// Get smart reorder suggestion
GET /api/inventory/smart-suggestion/:itemName
Response: { hasSuggestion: true, avgDays: 5, suggestedAmount: 2, unit: "loaves" }

// Check if item is low stock
GET /api/inventory/low-stock/:id
Response: { isLow: true, currentAmount: 0.5, avgUsage: "1/week", daysRemaining: 2 }

// Get expiring items suggestions
GET /api/inventory/expiring-suggestions?days=3
Response: [{ itemName: "Milk", daysUntilExpiry: 2, location: "Fridge" }]

// Calculate expiration from sell-by date
POST /api/inventory/calculate-expiry-from-sellby
Body: { sellByDate: "2026-07-30", category: "dairy", storageLocation: "fridge" }
Response: { estimatedExpiryDate: "2026-08-04", daysAfterSellBy: 5, confidence: 90 }
```

---

## 🚧 Pending Features (Next Steps)

### 5. **Shopping List Integration**
**Goal:** Show smart suggestions directly on shopping list items

**Implementation:**
1. When user adds item to shopping list, call `/api/inventory/check-inventory`
2. If item exists, show "already-have" tooltip
3. If item has purchase history, show "smart-reorder" tooltip
4. Add visual indicators (badges) on list items

**Files to modify:**
- `frontend/src/pages/Dashboard.js` (shopping list page)
- `frontend/src/components/ItemList.js` (list item component)

### 6. **Expiring Soon Notifications**
**Goal:** Proactive alerts for expiring items

**Implementation:**
1. Add notification badge to Pantry nav item
2. Show count of expiring items (next 3 days)
3. Click to see list with quick-add to shopping list
4. Daily check at login

**Files to create:**
- `frontend/src/components/ExpiringItemsNotification.js`

### 7. **Sell-By Date Input**
**Goal:** Let users enter sell-by date instead of expiration date

**Implementation:**
1. Add "Sell-By Date" field to inventory form
2. Call `/api/inventory/calculate-expiry-from-sellby` on change
3. Show calculated expiration with confidence indicator
4. Allow manual override

**Files to modify:**
- `frontend/src/components/inventory/InventoryFormModal.js`

### 8. **Visual Pantry Status Indicators**
**Goal:** Show pantry status on shopping list items

**Badges to add:**
- 🟢 "In Stock (5 days left)" - Have it, not expiring soon
- 🟡 "In Stock (Expiring Soon)" - Have it, expires in < 3 days
- 🔴 "Expired" - Have it but expired
- 🔵 "Low Stock" - Have it but running low
- ⚪ "Not in Pantry" - Don't have it

---

## 📊 How It Works

### **Usage Pattern Learning**
1. User adds item to inventory with bought_date
2. User removes/uses item (removed_date recorded in inventory_history)
3. System calculates: `days_lasted = removed_date - bought_date`
4. After 2+ purchases, system can suggest reorder timing and amount

### **Expiration Intelligence**
1. User enters sell-by date
2. System looks up category-specific offset
3. Adjusts based on storage location (freezer lasts longer)
4. Returns estimated expiration with confidence score
5. User can override if needed

### **Smart Suggestions Logic**
```
IF item in shopping list:
  CHECK inventory for item
  IF found AND not expiring:
    SHOW "already-have" tooltip
  ELSE IF found AND expiring soon:
    SHOW "expiring-soon" tooltip
  
  CHECK purchase history
  IF 2+ purchases:
    CALCULATE average days between purchases
    CALCULATE suggested amount
    SHOW "smart-reorder" tooltip

IF item in inventory:
  CHECK usage patterns
  CALCULATE days remaining
  IF < 3 days:
    SHOW "low-stock" alert
```

---

## 🎨 UI/UX Design

### **Tooltip Colors**
- 🟡 Yellow: Already have it (warning)
- 🔵 Blue: Smart suggestion (info)
- 🟠 Orange: Low stock (caution)
- 🔴 Red: Expiring soon (urgent)

### **Animation**
- Tooltips slide in from top
- Dismissible with X button
- Auto-hide after action taken
- Smooth transitions

### **Mobile Responsive**
- Touch-friendly buttons (44px minimum)
- Readable text sizes
- Proper spacing
- Swipe to dismiss

---

## 🚀 Deployment

```bash
# Commit changes
git add .
git commit -m "feat: Smart inventory suggestions with AI-powered recommendations

- Added SmartSuggestionTooltip component with 4 types
- Created smartSuggestionsService for usage pattern analysis
- Added 5 new API endpoints for smart features
- Fixed duplicate Add Item buttons
- Implemented sell-by date to expiration conversion
- Added purchase history analysis and reorder suggestions"

git push origin main

# Deploy to server
cd /opt/cloudmc-shop
./update-server.sh
```

---

## 📝 Future Enhancements

1. **Machine Learning Integration**
   - Train model on user behavior
   - Predict exact expiration dates
   - Personalized suggestions

2. **Recipe Integration**
   - Suggest recipes using expiring ingredients
   - "Cook this before it expires" alerts

3. **Price Tracking**
   - Alert when item goes on sale
   - "Good time to stock up" suggestions

4. **Seasonal Patterns**
   - Learn seasonal buying habits
   - Suggest items based on time of year

5. **Family Sharing**
   - Share inventory with family members
   - Collaborative shopping lists
   - Who bought what tracking

---

## 🐛 Testing Checklist

- [ ] Add item to shopping list → Check for "already have" tooltip
- [ ] Add item with purchase history → Check for "smart reorder" tooltip
- [ ] View item with low quantity → Check for "low stock" alert
- [ ] View expiring items → Check for "expiring soon" notification
- [ ] Enter sell-by date → Verify expiration calculation
- [ ] Test all tooltip actions (remove, keep, add, customize)
- [ ] Test on mobile (touch targets, readability)
- [ ] Test dark mode appearance
- [ ] Test with no purchase history (graceful fallback)
- [ ] Test with multiple items expiring same day

---

## 📚 Related Files

**Frontend:**
- `frontend/src/components/SmartSuggestionTooltip.js` - Tooltip component
- `frontend/src/pages/PantryNew.js` - Inventory page (button fix)

**Backend:**
- `backend/src/services/smartSuggestionsService.js` - Core logic
- `backend/src/routes/inventory_enhanced.js` - API endpoints

**Documentation:**
- `SMART_INVENTORY_FEATURES.md` - This file
- `KITCHEN_INVENTORY_FIXES_NEEDED.md` - Previous fixes

---

**Status:** ✅ Phase 1 Complete (Backend + Components)
**Next:** 🚧 Phase 2 - Shopping List Integration
