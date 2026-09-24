# ASI (Aisle System Implementation)

**Complete guide to the Aisle Learning and Prediction System**

---

## 🎯 Overview

The Aisle System Implementation (ASI) is an intelligent system that learns and predicts which aisle items are located in at specific stores. It uses crowdsourced data from users to continuously improve predictions.

**Purpose:** Help users find items faster by showing which aisle to go to in their store.

**Status:** Backend complete, frontend integration in progress

---

## 🏗️ Architecture

### Data Flow

```
User adds "Milk" to list
    ↓
MDL tracks item → mdl_user_item_history
    ↓
User shops at "Walmart"
    ↓
"Looking for Next" shows "Milk"
    ↓
System queries: /api/mdl/aisle/milk/walmart-id
    ↓
Returns: "Most Likely Aisle 12" (amber badge)
    ↓
User finds milk in Aisle 10
    ↓
User clicks "Found in Aisle" → Selects 10
    ↓
System records: mdl_aisle_reports
    ↓
Aggregates: mdl_location_aisles
    ↓
Next time: Shows "Aisle 10" (purple badge, confirmed)
```

---

## 📊 Database Schema

### Core Tables

#### 1. `store_locations`
Physical stores database with learned aisle data.

```sql
CREATE TABLE store_locations (
  id SERIAL PRIMARY KEY,
  chain_name VARCHAR(100),           -- "Walmart", "Target", etc.
  store_name VARCHAR(255) NOT NULL,  -- "Walmart Supercenter #1234"
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(50),
  zip_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  total_aisles INTEGER,              -- How many aisles in store
  aisle_count INTEGER DEFAULT 0,     -- How many aisles configured
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_locations_chain ON store_locations(chain_name);
CREATE INDEX idx_store_locations_city_state ON store_locations(city, state);
```

#### 2. `mdl_aisle_reports`
Individual user reports of item locations.

```sql
CREATE TABLE mdl_aisle_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_name VARCHAR(255) NOT NULL,
  aisle_number VARCHAR(20) NOT NULL,  -- "5", "5A", "End Cap 3"
  store_id INTEGER REFERENCES store_locations(id),
  category_id INTEGER,
  was_correct BOOLEAN,                -- Did prediction match?
  confidence_before DECIMAL(3, 2),    -- Confidence before report
  reported_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_aisle_reports_item_store ON mdl_aisle_reports(item_name, store_id);
CREATE INDEX idx_aisle_reports_user ON mdl_aisle_reports(user_id);
```

#### 3. `mdl_location_aisles`
Aggregated aisle predictions per store.

```sql
CREATE TABLE mdl_location_aisles (
  id SERIAL PRIMARY KEY,
  item_name VARCHAR(255) NOT NULL,
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20) NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.5,  -- 0.0 to 1.0
  total_reports INTEGER DEFAULT 1,
  correct_reports INTEGER DEFAULT 0,
  last_reported TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_name, store_id)
);

CREATE INDEX idx_location_aisles_item ON mdl_location_aisles(item_name);
CREATE INDEX idx_location_aisles_store ON mdl_location_aisles(store_id);
CREATE INDEX idx_location_aisles_confidence ON mdl_location_aisles(confidence DESC);
```

#### 4. `mdl_category_aisles`
Category-to-aisle mappings (fallback predictions).

```sql
CREATE TABLE mdl_category_aisles (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL,
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20) NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 0.3,
  total_reports INTEGER DEFAULT 0,
  UNIQUE(category_id, store_id)
);

CREATE INDEX idx_category_aisles_store ON mdl_category_aisles(store_id);
```

#### 5. `user_store_layouts`
User's custom store aisle configurations.

```sql
CREATE TABLE user_store_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20) NOT NULL,
  aisle_name VARCHAR(100),           -- "Dairy", "Frozen Foods"
  section VARCHAR(100),              -- "Left side", "Back wall"
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, store_id, aisle_number)
);

CREATE INDEX idx_user_store_layouts_user_store ON user_store_layouts(user_id, store_id);
```

---

## 🔌 Backend API

### Endpoints

#### 1. Get Aisle Prediction
```javascript
GET /api/mdl/aisle/:itemName/:storeId

// Response
{
  "aisle": "12",
  "confidence": 0.85,
  "source": "user_reports",  // or "category_fallback"
  "totalReports": 45
}
```

#### 2. Report Aisle Location
```javascript
POST /api/mdl/aisle/report

// Request Body
{
  "itemName": "Milk",
  "aisleNumber": "10",
  "storeId": 123,
  "wasCorrect": false,
  "categoryId": 5
}

// Response
{
  "success": true,
  "newConfidence": 0.78,
  "xpAwarded": 5
}
```

#### 3. Search Stores
```javascript
GET /api/mdl/stores/search?name=Walmart&city=Springfield&state=IL

// Response
[
  {
    "id": 123,
    "storeName": "Walmart Supercenter #1234",
    "address": "123 Main St",
    "city": "Springfield",
    "state": "IL",
    "totalAisles": 20,
    "aisleCount": 15
  }
]
```

#### 4. Get User's Stores
```javascript
GET /api/mdl/stores/user

// Response
[
  {
    "id": 123,
    "storeName": "Walmart Supercenter #1234",
    "lastUsed": "2026-09-20T10:30:00Z",
    "aislesConfigured": 15,
    "isFavorite": true
  }
]
```

#### 5. Create/Update Store
```javascript
POST /api/mdl/stores

// Request Body
{
  "chainName": "Walmart",
  "storeName": "Walmart Supercenter #1234",
  "address": "123 Main St",
  "city": "Springfield",
  "state": "IL",
  "zipCode": "62701",
  "totalAisles": 20
}

// Response
{
  "id": 123,
  "storeName": "Walmart Supercenter #1234"
}
```

---

## 🎨 Frontend Components

### 1. NextItemSuggestion.js (Existing)

**Current Implementation:**
- Shows "Looking for Next" item
- Displays item name, quantity, category
- "Mark as Found" button

**ASI Integration Needed:**
- Load aisle prediction on mount
- Display aisle badge (purple = confirmed, amber = predicted)
- Add "Found in Aisle" button
- Show aisle reporting UI

**Code to Add:**

```javascript
import { MapPin } from 'lucide-react';

const NextItemSuggestion = ({ nextItem, onMarkFound }) => {
  const [predictedAisle, setPredictedAisle] = useState(null);
  const [showAisleReport, setShowAisleReport] = useState(false);
  const currentStore = useStore(); // Get current store from context

  // Load aisle prediction
  useEffect(() => {
    const loadAislePrediction = async () => {
      if (!nextItem || !currentStore?.id) return;
      
      try {
        const response = await fetch(
          `/api/mdl/aisle/${encodeURIComponent(nextItem.item_name)}/${currentStore.id}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();
        
        if (data.aisle) {
          setPredictedAisle({
            number: data.aisle,
            confidence: data.confidence,
            source: data.source
          });
        }
      } catch (error) {
        console.error('Failed to load aisle prediction:', error);
      }
    };
    
    loadAislePrediction();
  }, [nextItem?.item_name, currentStore?.id]);

  // Report aisle location
  const reportAisle = async (aisleNumber) => {
    try {
      await fetch('/api/mdl/aisle/report', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          itemName: nextItem.item_name,
          aisleNumber: aisleNumber,
          storeId: currentStore.id,
          wasCorrect: aisleNumber === predictedAisle?.number,
          categoryId: nextItem.category_id
        })
      });
      
      toast.success(`✓ Learned: ${nextItem.item_name} is in Aisle ${aisleNumber}`);
      setShowAisleReport(false);
      
      // Update item's aisle field
      await updateItem(nextItem.id, { aisle: aisleNumber });
      
    } catch (error) {
      console.error('Failed to report aisle:', error);
      toast.error('Failed to report aisle location');
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Looking for Next</h2>
      
      {/* Item Info */}
      <div className="mb-4">
        <p className="text-xl">{nextItem.item_name}</p>
        <p className="text-gray-600">Quantity: {nextItem.quantity}</p>
      </div>

      {/* Aisle Display */}
      <div className="flex gap-2 mb-4">
        {/* Confirmed Aisle (from item) */}
        {nextItem.aisle && (
          <div className="flex items-center gap-2 bg-purple-500 px-4 py-2 rounded-xl shadow-md">
            <MapPin className="w-5 h-5 text-white" />
            <div className="flex flex-col">
              <span className="text-xs text-purple-100 leading-none">Aisle</span>
              <span className="text-lg font-bold text-white leading-tight">
                {nextItem.aisle}
              </span>
            </div>
          </div>
        )}

        {/* Predicted Aisle (from MDL) */}
        {!nextItem.aisle && predictedAisle && (
          <div className="flex items-center gap-2 bg-amber-500 px-4 py-2 rounded-xl shadow-md">
            <MapPin className="w-5 h-5 text-white" />
            <div className="flex flex-col">
              <span className="text-xs text-amber-100 leading-none">Most Likely Aisle</span>
              <span className="text-lg font-bold text-white leading-tight">
                Aisle {predictedAisle.number}
              </span>
            </div>
            {predictedAisle.confidence && (
              <span className="text-xs text-amber-100">
                {Math.round(predictedAisle.confidence * 100)}% sure
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onMarkFound}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
        >
          Mark as Found
        </button>
        
        <button
          onClick={() => setShowAisleReport(!showAisleReport)}
          className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Found in Aisle
        </button>
      </div>

      {/* Aisle Reporting UI */}
      {showAisleReport && (
        <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <p className="text-sm font-medium mb-3">Which aisle did you find this in?</p>
          
          {/* Quick Number Buttons 1-20 */}
          <div className="grid grid-cols-5 gap-2 mb-3">
            {[...Array(20)].map((_, i) => (
              <button
                key={i + 1}
                onClick={() => reportAisle((i + 1).toString())}
                className="px-3 py-2 bg-white dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg font-medium transition-colors"
              >
                {i + 1}
              </button>
            ))}
          </div>
          
          {/* Custom Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Other aisle (e.g., 5A, End Cap 3)..."
              className="flex-1 px-3 py-2 border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && e.target.value) {
                  reportAisle(e.target.value);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => setShowAisleReport(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### 2. MyStoresModal.js (To Be Created)

**Purpose:** Manage user's saved stores

**Features:**
- List all saved stores
- Quick switch between stores
- Edit store details
- Configure store aisles
- Mark favorites
- Delete stores

**UI Design:**

```javascript
import { Store, MapPin, Edit, Trash2, Star } from 'lucide-react';

const MyStoresModal = ({ isOpen, onClose }) => {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStores();
    }
  }, [isOpen]);

  const loadStores = async () => {
    try {
      const response = await fetch('/api/mdl/stores/user', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setStores(data);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchToStore = async (store) => {
    // Update current list's store
    await updateList(currentList.id, { store_name: store.storeName });
    onClose();
  };

  return (
    <CustomPanel
      isOpen={isOpen}
      onClose={onClose}
      title="My Stores"
      position="right"
      width="500px"
    >
      <div className="space-y-4">
        {loading ? (
          <p>Loading stores...</p>
        ) : stores.length === 0 ? (
          <div className="text-center py-8">
            <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No stores saved yet
            </p>
            <button className="px-4 py-2 bg-blue-500 text-white rounded-lg">
              Add Your First Store
            </button>
          </div>
        ) : (
          stores.map(store => (
            <div
              key={store.id}
              className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              {/* Store Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    {store.storeName}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {store.city}, {store.state}
                  </p>
                </div>
                <button className="text-yellow-500 hover:text-yellow-600">
                  <Star className={`w-5 h-5 ${store.isFavorite ? 'fill-current' : ''}`} />
                </button>
              </div>

              {/* Store Stats */}
              <div className="flex items-center gap-4 mb-3 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span>{store.aislesConfigured} aisles configured</span>
                </div>
                <span>•</span>
                <span>Last used {formatDate(store.lastUsed)}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => switchToStore(store)}
                  className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
                >
                  Use This Store
                </button>
                <button
                  onClick={() => editStore(store)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteStore(store.id)}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </CustomPanel>
  );
};
```

---

### 3. ManageStoresModal.js (To Be Created)

**Purpose:** Configure store aisle layouts

**Features:**
- Set total number of aisles
- Name each aisle
- Assign categories to aisles
- Visual aisle map
- Import/export layouts

---

## 🧠 Learning Algorithm

### Confidence Calculation

```javascript
function calculateConfidence(correctReports, totalReports) {
  if (totalReports === 0) return 0.0;
  
  const accuracy = correctReports / totalReports;
  const sampleSize = Math.min(totalReports / 10, 1); // Max at 10 reports
  
  return accuracy * sampleSize;
}

// Examples:
// 1 correct out of 1 report = 0.1 confidence (low sample)
// 5 correct out of 5 reports = 0.5 confidence (medium sample)
// 10 correct out of 10 reports = 1.0 confidence (high sample)
// 8 correct out of 10 reports = 0.8 confidence (high sample, good accuracy)
```

### Aggregation Logic

```javascript
async function aggregateAisleReports(itemName, storeId) {
  // Get all reports for this item at this store
  const reports = await db.query(`
    SELECT aisle_number, COUNT(*) as count
    FROM mdl_aisle_reports
    WHERE item_name = $1 AND store_id = $2
    GROUP BY aisle_number
    ORDER BY count DESC
  `, [itemName, storeId]);
  
  if (reports.rows.length === 0) return null;
  
  // Most reported aisle wins
  const mostReported = reports.rows[0];
  const totalReports = reports.rows.reduce((sum, r) => sum + r.count, 0);
  const correctReports = mostReported.count;
  
  // Calculate confidence
  const confidence = calculateConfidence(correctReports, totalReports);
  
  // Update or insert aggregated data
  await db.query(`
    INSERT INTO mdl_location_aisles 
      (item_name, store_id, aisle_number, confidence, total_reports, correct_reports)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (item_name, store_id)
    DO UPDATE SET
      aisle_number = $3,
      confidence = $4,
      total_reports = $5,
      correct_reports = $6,
      last_reported = NOW()
  `, [itemName, storeId, mostReported.aisle_number, confidence, totalReports, correctReports]);
  
  return {
    aisle: mostReported.aisle_number,
    confidence,
    totalReports
  };
}
```

---

## 🎮 User Experience Flow

### First Time User

1. User adds "Milk" to shopping list
2. System has no aisle data → No aisle shown
3. User finds milk in Aisle 10
4. User clicks "Found in Aisle" → Selects 10
5. System records first report
6. Next time: Shows "Most Likely Aisle 10" (low confidence, amber badge)

### After Multiple Reports

1. 5 users report milk in Aisle 10
2. Confidence increases to 0.5 (medium)
3. Badge stays amber but shows "50% sure"
4. After 10 reports: Confidence = 1.0 (high)
5. Badge turns purple (confirmed)

### Wrong Prediction

1. System predicts Aisle 10
2. User finds milk in Aisle 12
3. User reports Aisle 12 with `wasCorrect: false`
4. System adjusts: Now 5 reports for Aisle 10, 1 for Aisle 12
5. Aisle 10 still wins but confidence drops
6. After more reports for Aisle 12, it becomes the prediction

---

## 🏆 Gamification

### XP Rewards

- **Report aisle:** +5 XP
- **Correct prediction:** +10 XP (bonus)
- **First to report item:** +15 XP (pioneer bonus)
- **Configure store layout:** +25 XP

### Achievements

- **Navigator:** Report 10 aisles
- **Cartographer:** Report 50 aisles
- **Store Expert:** Configure complete store layout
- **Community Helper:** 100 aisle reports

---

## 📈 Analytics

### Store-Level Metrics

- Total aisles configured
- Items with aisle data
- Average confidence score
- Most reported items
- Most active users

### System-Level Metrics

- Total stores in database
- Total aisle reports
- Average reports per item
- Prediction accuracy rate
- User engagement rate

---

## 🚀 Implementation Checklist

### Phase 1: Database ✅
- [x] Create tables (migrations 039 & 040)
- [x] Add indexes
- [x] Test schema

### Phase 2: Backend API ✅
- [x] Aisle prediction endpoint
- [x] Aisle reporting endpoint
- [x] Store search endpoint
- [x] Store management endpoints

### Phase 3: Frontend Integration ⏳
- [ ] Update NextItemSuggestion.js
  - [ ] Load aisle predictions
  - [ ] Display aisle badges
  - [ ] Add "Found in Aisle" button
  - [ ] Aisle reporting UI
- [ ] Create MyStoresModal.js
  - [ ] List saved stores
  - [ ] Switch between stores
  - [ ] Edit/delete stores
- [ ] Create ManageStoresModal.js
  - [ ] Configure store aisles
  - [ ] Visual aisle map
- [ ] Update Dashboard.js
  - [ ] "My Stores" button handler
  - [ ] Store context provider

### Phase 4: Testing ⏳
- [ ] Test aisle prediction accuracy
- [ ] Test reporting flow
- [ ] Test store management
- [ ] Test edge cases

### Phase 5: Polish ⏳
- [ ] Add loading states
- [ ] Add error handling
- [ ] Add animations
- [ ] Add tooltips/help text
- [ ] Mobile optimization

---

## 🐛 Known Issues

1. **Store matching** - Need fuzzy matching for store names
2. **Aisle formats** - Support "5A", "End Cap 3", etc.
3. **Store chains** - Link stores by chain for better predictions
4. **Category fallback** - Implement category-based predictions

---

## 📝 Future Enhancements

### Short Term
- Visual store map
- Aisle photos
- Store chain linking
- Category-based fallback predictions

### Long Term
- AR navigation (point phone, see aisle)
- Crowdsourced store layouts
- Aisle traffic patterns
- Optimal shopping route
- Integration with store apps

---

**Status:** Backend complete, frontend integration in progress  
**Next Step:** Update NextItemSuggestion.js with aisle prediction display  
**Documentation:** Complete

