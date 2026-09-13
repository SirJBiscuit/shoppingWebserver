# MDL Location-Aware Data System

## Problem Statement

**Why Location Matters:**
- 🏪 Store layouts differ by state/region (Aldi in CA ≠ Aldi in NY)
- 💰 Prices vary significantly by location
- 📦 Product availability differs (regional products)
- 🗺️ Aisle numbering/organization is store-specific
- 🌎 Cultural/regional food preferences vary

**Current Issue:**
Using data from an Aldi in California to predict for an Aldi in Texas would give:
- ❌ Wrong aisle predictions
- ❌ Inaccurate price estimates
- ❌ Irrelevant product suggestions
- ❌ Poor user experience

## Solution: Multi-Level Location Hierarchy

### Location Granularity Levels

```
Country (USA)
  ↓
State (California, Texas, New York)
  ↓
Region/Metro (Los Angeles, San Francisco)
  ↓
Store Chain (Aldi, Walmart, Target)
  ↓
Specific Store (Aldi #1234 - 123 Main St)
```

### Data Segmentation Strategy

**Level 1: State-Level Data** (Primary)
- Most important for price trends
- Regional product availability
- State-wide patterns

**Level 2: Store Chain + State** (Recommended)
- "Aldi in California" vs "Aldi in Texas"
- Best balance of specificity and data volume
- Enough users for statistical significance

**Level 3: Specific Store** (Optional)
- Individual store layout
- Exact aisle locations
- Most accurate but requires more data

## Database Schema

### User Location Table
```sql
CREATE TABLE user_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) UNIQUE,
  
  -- Location Data
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2), -- Two-letter state code (CA, TX, NY)
  zip_code VARCHAR(10),
  city VARCHAR(100),
  metro_area VARCHAR(100), -- Optional: "Los Angeles", "San Francisco Bay Area"
  
  -- Privacy Settings
  location_sharing_level VARCHAR(20) DEFAULT 'state', -- 'none', 'state', 'city', 'exact'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_state (state),
  INDEX idx_metro (metro_area)
);
```

### Store Locations Table
```sql
CREATE TABLE store_locations (
  id SERIAL PRIMARY KEY,
  
  -- Store Identity
  chain_name VARCHAR(100), -- "Aldi", "Walmart", "Target"
  store_number VARCHAR(50), -- Chain's internal store number
  store_name VARCHAR(255), -- "Aldi - Downtown"
  
  -- Location
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2),
  city VARCHAR(100),
  zip_code VARCHAR(10),
  address TEXT,
  metro_area VARCHAR(100),
  
  -- Coordinates (for distance calculations)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(chain_name, store_number),
  INDEX idx_chain_state (chain_name, state),
  INDEX idx_location (latitude, longitude)
);
```

### Location-Aware Price Data
```sql
CREATE TABLE mdl_location_prices (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  
  -- Location Specificity
  country VARCHAR(2) DEFAULT 'US',
  state VARCHAR(2),
  metro_area VARCHAR(100),
  store_chain VARCHAR(100),
  specific_store_id INTEGER REFERENCES store_locations(id),
  
  -- Price Stats
  average_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  sample_size INTEGER, -- How many data points
  
  -- Temporal
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Confidence
  confidence_score DECIMAL(3,2), -- Based on sample size and recency
  
  INDEX idx_item_state (item_name_id, state),
  INDEX idx_item_chain_state (item_name_id, store_chain, state)
);
```

### Location-Aware Aisle Data
```sql
CREATE TABLE mdl_location_aisles (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  category VARCHAR(100),
  
  -- Location
  store_chain VARCHAR(100),
  state VARCHAR(2),
  specific_store_id INTEGER REFERENCES store_locations(id),
  
  -- Aisle Info
  aisle_number VARCHAR(20),
  aisle_name VARCHAR(100), -- "Dairy", "Frozen Foods"
  section VARCHAR(100), -- "Left side", "End cap"
  
  -- Stats
  confidence_score DECIMAL(3,2),
  report_count INTEGER, -- How many users confirmed this
  
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_item_chain_state (item_name_id, store_chain, state),
  INDEX idx_store (specific_store_id)
);
```

## Location-Aware Query Logic

### Price Prediction with Location Fallback
```javascript
async function getPriceEstimate(itemNameId, userId) {
  const userLocation = await getUserLocation(userId);
  
  // Try multiple levels of specificity, from most to least specific
  
  // Level 1: Specific store (if user has a preferred store)
  if (userLocation.preferred_store_id) {
    const price = await db.query(`
      SELECT average_price, confidence_score
      FROM mdl_location_prices
      WHERE item_name_id = $1 
        AND specific_store_id = $2
        AND sample_size >= 3
      ORDER BY confidence_score DESC
      LIMIT 1
    `, [itemNameId, userLocation.preferred_store_id]);
    
    if (price.rows.length > 0 && price.rows[0].confidence_score > 0.7) {
      return {
        price: price.rows[0].average_price,
        confidence: price.rows[0].confidence_score,
        source: 'specific_store'
      };
    }
  }
  
  // Level 2: Store chain + State
  if (userLocation.preferred_chain && userLocation.state) {
    const price = await db.query(`
      SELECT average_price, confidence_score
      FROM mdl_location_prices
      WHERE item_name_id = $1 
        AND store_chain = $2
        AND state = $3
        AND sample_size >= 5
      ORDER BY confidence_score DESC
      LIMIT 1
    `, [itemNameId, userLocation.preferred_chain, userLocation.state]);
    
    if (price.rows.length > 0 && price.rows[0].confidence_score > 0.6) {
      return {
        price: price.rows[0].average_price,
        confidence: price.rows[0].confidence_score,
        source: 'chain_state'
      };
    }
  }
  
  // Level 3: State only
  if (userLocation.state) {
    const price = await db.query(`
      SELECT AVG(average_price) as avg_price, 
             AVG(confidence_score) as avg_confidence,
             COUNT(*) as sources
      FROM mdl_location_prices
      WHERE item_name_id = $1 
        AND state = $2
        AND sample_size >= 3
      GROUP BY item_name_id
    `, [itemNameId, userLocation.state]);
    
    if (price.rows.length > 0 && price.rows[0].sources >= 2) {
      return {
        price: price.rows[0].avg_price,
        confidence: price.rows[0].avg_confidence * 0.8, // Reduce confidence for aggregated data
        source: 'state'
      };
    }
  }
  
  // Level 4: National average (fallback)
  const price = await db.query(`
    SELECT AVG(average_price) as avg_price
    FROM mdl_location_prices
    WHERE item_name_id = $1
      AND sample_size >= 5
  `, [itemNameId]);
  
  return {
    price: price.rows[0]?.avg_price || null,
    confidence: 0.3, // Low confidence for national average
    source: 'national'
  };
}
```

### Aisle Prediction with Location
```javascript
async function getAislePrediction(itemNameId, userId) {
  const userLocation = await getUserLocation(userId);
  const userStore = await getUserPreferredStore(userId);
  
  // Try specific store first
  if (userStore?.id) {
    const aisle = await db.query(`
      SELECT aisle_number, aisle_name, confidence_score
      FROM mdl_location_aisles
      WHERE item_name_id = $1
        AND specific_store_id = $2
      ORDER BY confidence_score DESC, report_count DESC
      LIMIT 1
    `, [itemNameId, userStore.id]);
    
    if (aisle.rows.length > 0) {
      return {
        aisle: aisle.rows[0].aisle_number,
        name: aisle.rows[0].aisle_name,
        confidence: aisle.rows[0].confidence_score,
        source: 'specific_store'
      };
    }
  }
  
  // Try chain + state
  if (userStore?.chain_name && userLocation.state) {
    const aisle = await db.query(`
      SELECT aisle_number, aisle_name, 
             AVG(confidence_score) as avg_confidence,
             COUNT(*) as store_count
      FROM mdl_location_aisles
      WHERE item_name_id = $1
        AND store_chain = $2
        AND state = $3
      GROUP BY aisle_number, aisle_name
      ORDER BY store_count DESC, avg_confidence DESC
      LIMIT 1
    `, [itemNameId, userStore.chain_name, userLocation.state]);
    
    if (aisle.rows.length > 0 && aisle.rows[0].store_count >= 2) {
      return {
        aisle: aisle.rows[0].aisle_number,
        name: aisle.rows[0].aisle_name,
        confidence: aisle.rows[0].avg_confidence * 0.9,
        source: 'chain_state'
      };
    }
  }
  
  // Fallback to category-based prediction
  return getCategoryBasedAisle(itemNameId);
}
```

## User Onboarding Flow

### Step 1: Location Setup
```javascript
// During signup or first use
const LocationSetup = () => {
  return (
    <div className="location-setup">
      <h2>📍 Set Your Location</h2>
      <p>Help us provide accurate prices and store layouts for your area</p>
      
      {/* State Selection */}
      <select name="state">
        <option value="">Select Your State</option>
        <option value="AL">Alabama</option>
        <option value="CA">California</option>
        {/* ... all states */}
      </select>
      
      {/* Optional: City/Zip */}
      <input 
        type="text" 
        placeholder="City (optional)" 
        name="city"
      />
      
      <input 
        type="text" 
        placeholder="ZIP Code (optional)" 
        name="zip_code"
      />
      
      {/* Privacy Notice */}
      <p className="text-sm text-gray-600">
        🔒 Your location is only used to provide accurate local data.
        We never share your exact location.
      </p>
      
      {/* Privacy Level */}
      <select name="sharing_level">
        <option value="state">State-level only (recommended)</option>
        <option value="city">City-level</option>
        <option value="none">Don't use location data</option>
      </select>
    </div>
  );
};
```

### Step 2: Store Preferences
```javascript
const StoreSetup = () => {
  const [stores, setStores] = useState([]);
  
  useEffect(() => {
    // Load stores in user's area
    loadNearbyStores(userState);
  }, []);
  
  return (
    <div className="store-setup">
      <h2>🏪 Your Preferred Stores</h2>
      <p>Select stores you shop at regularly</p>
      
      {stores.map(store => (
        <label key={store.id}>
          <input 
            type="checkbox" 
            value={store.id}
          />
          {store.chain_name} - {store.city}
          <span className="distance">{store.distance} miles away</span>
        </label>
      ))}
      
      {/* Manual Entry */}
      <button onClick={() => setShowManual(true)}>
        + Add Store Manually
      </button>
    </div>
  );
};
```

## Data Collection & Aggregation

### When User Adds Item with Price
```javascript
async function trackItemWithLocation(userId, itemData) {
  const userLocation = await getUserLocation(userId);
  const userStore = await getCurrentStore(userId); // From current list
  
  // 1. Record individual entry
  await db.query(`
    INSERT INTO mdl_user_item_history (
      user_id, item_name_id, price, store_name,
      user_state, user_city
    ) VALUES ($1, $2, $3, $4, $5, $6)
  `, [
    userId,
    itemData.itemNameId,
    itemData.price,
    userStore?.name,
    userLocation.state,
    userLocation.city
  ]);
  
  // 2. Update location-specific aggregates (async)
  await updateLocationPrices(
    itemData.itemNameId,
    userLocation.state,
    userStore?.chain_name,
    userStore?.id,
    itemData.price
  );
}
```

### Aggregate Location Prices (Batch Job)
```javascript
async function updateLocationPrices(itemNameId, state, chain, storeId, newPrice) {
  // Update state-level aggregate
  await db.query(`
    INSERT INTO mdl_location_prices (
      item_name_id, state, average_price, min_price, max_price, sample_size
    )
    SELECT 
      $1, $2,
      AVG(price) as avg_price,
      MIN(price) as min_price,
      MAX(price) as max_price,
      COUNT(*) as sample_size
    FROM mdl_user_item_history
    WHERE item_name_id = $1 
      AND user_state = $2
      AND price > 0
      AND added_at > CURRENT_DATE - INTERVAL '6 months'
    ON CONFLICT (item_name_id, state)
    DO UPDATE SET
      average_price = EXCLUDED.average_price,
      min_price = EXCLUDED.min_price,
      max_price = EXCLUDED.max_price,
      sample_size = EXCLUDED.sample_size,
      last_updated = CURRENT_TIMESTAMP
  `, [itemNameId, state]);
  
  // Update chain + state aggregate
  if (chain) {
    await db.query(`
      INSERT INTO mdl_location_prices (
        item_name_id, state, store_chain, average_price, sample_size
      )
      SELECT 
        $1, $2, $3,
        AVG(price) as avg_price,
        COUNT(*) as sample_size
      FROM mdl_user_item_history
      WHERE item_name_id = $1 
        AND user_state = $2
        AND store_name LIKE $3 || '%'
        AND price > 0
        AND added_at > CURRENT_DATE - INTERVAL '6 months'
      ON CONFLICT (item_name_id, state, store_chain)
      DO UPDATE SET
        average_price = EXCLUDED.average_price,
        sample_size = EXCLUDED.sample_size,
        last_updated = CURRENT_TIMESTAMP
    `, [itemNameId, state, chain]);
  }
}
```

## UI Enhancements

### Show Location-Aware Data
```javascript
const ItemPriceDisplay = ({ item, userLocation }) => {
  const [priceData, setPriceData] = useState(null);
  
  useEffect(() => {
    loadPriceEstimate(item.id, userLocation);
  }, [item, userLocation]);
  
  return (
    <div className="price-info">
      <div className="estimated-price">
        <span className="price">${priceData.price}</span>
        <span className="confidence">
          {priceData.confidence > 0.8 ? '✓ High confidence' : 
           priceData.confidence > 0.5 ? '~ Medium confidence' :
           '? Low confidence'}
        </span>
      </div>
      
      <div className="price-source">
        {priceData.source === 'specific_store' && (
          <span>📍 Based on your store</span>
        )}
        {priceData.source === 'chain_state' && (
          <span>📍 Based on {chain} in {state}</span>
        )}
        {priceData.source === 'state' && (
          <span>📍 Based on {state} average</span>
        )}
        {priceData.source === 'national' && (
          <span>🌎 National average (update your location for better accuracy)</span>
        )}
      </div>
    </div>
  );
};
```

### Location Settings Page
```javascript
const LocationSettings = () => {
  return (
    <div className="settings-page">
      <h2>📍 Location & Store Settings</h2>
      
      {/* Current Location */}
      <section>
        <h3>Your Location</h3>
        <p>State: {userLocation.state}</p>
        <p>City: {userLocation.city || 'Not set'}</p>
        <button onClick={editLocation}>Edit Location</button>
      </section>
      
      {/* Preferred Stores */}
      <section>
        <h3>Your Stores</h3>
        {userStores.map(store => (
          <div key={store.id} className="store-card">
            <h4>{store.chain_name}</h4>
            <p>{store.address}</p>
            <p>{store.distance} miles away</p>
            <button onClick={() => setDefault(store.id)}>
              {store.is_default ? '✓ Default' : 'Set as Default'}
            </button>
          </div>
        ))}
        <button onClick={addStore}>+ Add Store</button>
      </section>
      
      {/* Privacy */}
      <section>
        <h3>Privacy Settings</h3>
        <select value={sharingLevel} onChange={updateSharing}>
          <option value="state">State-level only</option>
          <option value="city">City-level</option>
          <option value="none">Don't use location</option>
        </select>
        <p className="help-text">
          Higher precision = better predictions, but less privacy
        </p>
      </section>
      
      {/* Data Stats */}
      <section>
        <h3>Your Contribution</h3>
        <p>You've helped train {contributionCount} items in {state}!</p>
        <p>Thank you for making the app better for everyone in your area 🎉</p>
      </section>
    </div>
  );
};
```

## Benefits

### For Users
- 🎯 **Accurate prices** for their actual location
- 🗺️ **Correct aisle info** for their specific stores
- 📦 **Relevant products** available in their area
- 💰 **Better budgeting** with local price data
- 🏪 **Store-specific** layouts and organization

### For System
- 📊 **Better data quality** (segmented by location)
- 🎨 **Personalized** experience per region
- 🔄 **Scalable** (works with any number of locations)
- 🧠 **Smarter** predictions with context
- 🌍 **Expandable** to other countries

### For Community
- 🤝 **Collaborative** data building per region
- 📈 **Regional insights** and trends
- 🏆 **Local leaderboards** and contributions
- 🌟 **Better for everyone** in the same area

## Privacy Considerations

### What We Store
- ✅ State (always)
- ✅ City (optional)
- ✅ ZIP code (optional)
- ❌ Exact address (never)
- ❌ GPS coordinates (never)

### User Controls
- Choose privacy level
- View all location data
- Export location history
- Delete location data
- Opt out completely

### Data Aggregation
- Individual entries anonymized after 30 days
- Only aggregated stats kept long-term
- Minimum sample size (5+) before showing data
- No personally identifiable information in aggregates

## Implementation Priority

1. ✅ Add user location table
2. ✅ Add store locations table
3. ✅ Add location-aware price tracking
4. ✅ Implement location-based queries
5. ⏳ Build location setup UI
6. ⏳ Add store preferences
7. ⏳ Implement aisle tracking by location
8. ⏳ Build analytics dashboard

This location-aware system ensures users get accurate, relevant data for **their** area, not someone else's! 🎯
