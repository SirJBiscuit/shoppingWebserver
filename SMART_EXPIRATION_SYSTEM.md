# 🗓️ Smart Expiration System - Design Document

## **Overview**
Intelligent expiration tracking that learns from user behavior and provides accurate shelf-life estimates for all food items.

---

## **Core Features**

### **1. Default Expiration Database**
Pre-populated database with typical shelf life for common foods:

#### **Meats & Proteins**
- **Fresh Chicken:** 1-2 days (refrigerated), 9 months (frozen)
- **Ground Beef:** 1-2 days (refrigerated), 3-4 months (frozen)
- **Steak/Roasts:** 3-5 days (refrigerated), 6-12 months (frozen)
- **Pork Chops:** 3-5 days (refrigerated), 4-6 months (frozen)
- **Fish (fresh):** 1-2 days (refrigerated), 3-6 months (frozen)
- **Deli Meats:** 3-5 days (opened), 2 weeks (unopened)
- **Bacon:** 7 days (opened), 2 weeks (unopened)

#### **Dairy**
- **Milk:** 7 days (opened), 5-7 days past date (unopened)
- **Yogurt:** 7-10 days (opened), 2-3 weeks past date (unopened)
- **Cheese (hard):** 3-4 weeks (opened), 6 months (unopened)
- **Cheese (soft):** 1 week (opened), 2 weeks (unopened)
- **Butter:** 1-2 months (refrigerated), 6-9 months (frozen)
- **Eggs:** 3-5 weeks

#### **Produce**
- **Lettuce:** 3-7 days
- **Tomatoes:** 1 week (counter), 2 weeks (refrigerated)
- **Bananas:** 2-7 days (depends on ripeness)
- **Apples:** 1-2 months (refrigerated)
- **Berries:** 3-7 days
- **Carrots:** 3-4 weeks
- **Potatoes:** 2-3 months (cool, dark place)
- **Onions:** 2-3 months (cool, dry place)

#### **Bread & Baked Goods**
- **White Bread:** 5-7 days (pantry), 3 months (frozen)
- **Wheat Bread:** 5-7 days (pantry), 3 months (frozen)
- **Bagels:** 5-7 days (pantry), 3 months (frozen)
- **Tortillas:** 1 week (refrigerated), 6-8 months (frozen)

#### **Pantry Staples**
- **Canned Goods:** 1-5 years
- **Pasta (dry):** 1-2 years
- **Rice (white):** 4-5 years
- **Rice (brown):** 6 months
- **Flour:** 6-8 months (all-purpose), 3-6 months (whole wheat)
- **Sugar:** Indefinite
- **Honey:** Indefinite
- **Oils:** 6 months (opened), 2 years (unopened)

---

## **2. Color-Coded Expiration System**

### **Visual Indicators:**
```
🟢 GREEN (Fresh)
- More than 7 days until expiration
- "Fresh & Good"

🟡 YELLOW (Use Soon)
- 3-7 days until expiration
- "Use This Week"

🟠 ORANGE (Urgent)
- 1-2 days until expiration
- "Use Today/Tomorrow"

🔴 RED (Expired)
- 0 days or past expiration
- "Check Before Using"

⚫ BLACK (Discard)
- 3+ days past expiration
- "Throw Out - Unsafe"
```

---

## **3. Smart Learning System**

### **How It Learns:**
1. **User adds item** → System suggests expiration based on item name
2. **User sets actual expiration** → System compares to estimate
3. **User marks "expired early"** → System adjusts future estimates
4. **User marks "still good"** → System extends future estimates

### **Pattern Matching:**
```javascript
// Smart name matching
"wheat bread" → matches "bread" category
"honey wheat bread" → matches "bread" category
"whole wheat bread" → matches "bread" category
"sourdough bread" → matches "bread" category

// Learning example
User buys "Honey Wheat Bread"
- System suggests: 7 days
- User sets actual: 10 days
- Next time: System suggests 8-9 days (learned average)
```

---

## **4. Purchase History Tracking**

### **Data Stored:**
- **Purchase Date:** When item was added to pantry
- **Estimated Expiration:** System's prediction
- **Actual Expiration:** User-set or learned
- **Expired Early?** User feedback
- **Still Good?** User feedback
- **Previous Purchases:** Historical data

### **Display:**
```
📦 Chicken Breast
🟢 Fresh (5 days left)

📊 History:
- Bought: Jan 15, 2026
- Last Bought: Dec 28, 2025 (18 days ago)
- Avg Shelf Life: 2 days
- Estimated Expiry: Jan 17, 2026
- Times Bought: 12

💡 Tip: Fresh chicken should smell neutral. 
   If it smells sour or like sulfur, discard it.
```

---

## **5. Freshness Check Tips**

### **Built-in Guidance:**
```javascript
const freshnessChecks = {
  chicken: "Should smell neutral. Discard if sour or sulfur smell.",
  beef: "Should be bright red. Brown is okay, but gray/green means spoiled.",
  fish: "Should smell like the ocean. Strong fishy smell = spoiled.",
  milk: "Smell test - should be slightly sweet. Sour smell = bad.",
  eggs: "Float test - fresh eggs sink, bad eggs float.",
  bread: "Check for mold. Stale is safe but not tasty.",
  lettuce: "Should be crisp. Slimy or brown = discard.",
  cheese: "Small mold spots on hard cheese can be cut off. Soft cheese = discard all."
};
```

---

## **6. Action Buttons**

### **Pantry Item Actions:**
```
[🔄 Refresh Date] - Bought new one, reset expiration
[📅 Set Expiry] - Manually set expiration date
[⚠️ Expired Early] - Mark as spoiled before expected
[✅ Still Good] - Extend expiration estimate
[🗑️ Throw Out] - Remove and mark as discarded
[🛒 Restock] - Add to shopping list
```

---

## **7. Database Schema**

### **New Tables:**

#### **expiration_defaults**
```sql
CREATE TABLE expiration_defaults (
  id SERIAL PRIMARY KEY,
  item_pattern VARCHAR(255) NOT NULL,  -- e.g., "%bread%", "%chicken%"
  category VARCHAR(100),
  storage_location VARCHAR(50),  -- pantry, fridge, freezer
  shelf_life_days INTEGER,
  freshness_check TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **expiration_history**
```sql
CREATE TABLE expiration_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_name VARCHAR(255),
  purchase_date DATE,
  estimated_expiry DATE,
  actual_expiry DATE,
  expired_early BOOLEAN DEFAULT FALSE,
  still_good_after BOOLEAN DEFAULT FALSE,
  discarded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **user_expiration_preferences**
```sql
CREATE TABLE user_expiration_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_pattern VARCHAR(255),
  learned_shelf_life_days INTEGER,
  confidence_score FLOAT DEFAULT 0.5,  -- 0-1, higher = more data
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, item_pattern)
);
```

---

## **8. API Endpoints**

### **GET /api/expiration/defaults**
Get default expiration data for an item
```javascript
GET /api/expiration/defaults?item=chicken
Response: {
  shelf_life_days: 2,
  storage_location: "fridge",
  freshness_check: "Should smell neutral..."
}
```

### **POST /api/expiration/learn**
Record user feedback to improve predictions
```javascript
POST /api/expiration/learn
Body: {
  item_name: "honey wheat bread",
  purchase_date: "2026-01-15",
  actual_expiry: "2026-01-25",
  expired_early: false
}
```

### **GET /api/expiration/history/:itemName**
Get purchase history for an item
```javascript
GET /api/expiration/history/chicken
Response: {
  avg_shelf_life: 2,
  last_purchase: "2026-01-10",
  times_purchased: 12,
  history: [...]
}
```

---

## **9. UI Components**

### **Expiration Badge**
```jsx
<ExpirationBadge 
  expiryDate="2026-01-20"
  purchaseDate="2026-01-15"
  itemName="Chicken Breast"
/>

// Renders:
🟢 Fresh (5 days left)
```

### **Expiration Manager Modal**
```jsx
<ExpirationManager
  item={pantryItem}
  onUpdate={handleUpdate}
  onMarkExpired={handleExpired}
  onExtend={handleExtend}
/>

// Shows:
- Current expiration
- Color-coded status
- Action buttons
- Purchase history
- Freshness tips
```

---

## **10. Admin Panel**

### **Expiration Management:**
- View all default expiration rules
- Add new item patterns
- Edit shelf life estimates
- Update freshness check tips
- View learning statistics

---

## **Implementation Priority**

### **Phase 1: Core System** ✅
1. Create database tables
2. Seed default expiration data
3. Add color-coded badges
4. Basic expiration calculation

### **Phase 2: User Actions** 🔄
1. Add action buttons to pantry items
2. "Set Expiry" modal
3. "Expired Early" feedback
4. "Still Good" extension

### **Phase 3: Learning System** 📊
1. Track purchase history
2. Calculate learned averages
3. Adjust predictions based on feedback
4. Pattern matching for similar items

### **Phase 4: Advanced Features** 🚀
1. Freshness check tips
2. Purchase history display
3. Admin panel
4. Expiration notifications

---

## **Example User Flow**

### **Scenario: User buys chicken**
1. User adds "Chicken Breast" to pantry
2. System suggests: "Expires in 2 days (Jan 17)"
3. User sees 🟢 GREEN badge: "Fresh (2 days left)"
4. Day 1: Badge turns 🟡 YELLOW: "Use Today"
5. User cooks chicken, marks as used
6. System learns: User typically uses chicken within 2 days

### **Scenario: Bread lasts longer**
1. User adds "Honey Wheat Bread"
2. System suggests: "Expires in 7 days"
3. Day 8: User clicks "Still Good"
4. System learns: This bread lasts 8+ days
5. Next time: System suggests 8 days for similar bread

### **Scenario: Milk expired early**
1. User adds "Whole Milk"
2. System suggests: "Expires in 7 days"
3. Day 5: User clicks "Expired Early"
4. System asks: "When did it expire?" → User: "Day 4"
5. System learns: Adjust milk estimate to 4-5 days

---

## **Benefits**

✅ **Reduce Food Waste** - Know exactly when to use items  
✅ **Save Money** - Don't throw out good food  
✅ **Food Safety** - Clear warnings for expired items  
✅ **Smart Learning** - Gets better over time  
✅ **User-Friendly** - Color-coded, visual, simple  
✅ **Personalized** - Learns your shopping habits  

---

**This system will revolutionize how users manage their kitchen inventory!** 🎉
