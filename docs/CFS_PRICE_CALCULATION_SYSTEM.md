# CFS Price Calculation System

**Status:** Planned  
**Priority:** Medium (After Shopping Lists + AVE are working)  
**Category:** Custom Feature Scripts (CFS)

---

## Overview

A comprehensive price intelligence system that helps users make informed purchasing decisions by:
- Tracking historical price data per user
- Comparing prices across stores
- Estimating prices for new items
- Detecting sales and price drops
- Providing price trend insights

---

## Architecture

### Core Components

#### 1. **PriceCalculationEngine** (Backend Service)
```javascript
// backend/src/services/priceCalculation.js

class PriceCalculationEngine {
  // Get price estimate for an item
  async estimatePrice(itemName, storeId, userId) {
    // 1. Check user's price history
    // 2. Check MDL location prices
    // 3. Check category average
    // 4. Return confidence-weighted estimate
  }
  
  // Compare prices across stores
  async comparePrices(itemName, userLocation) {
    // Returns array of {store, price, distance, confidence}
  }
  
  // Detect if current price is a good deal
  async analyzeDeal(itemName, currentPrice, storeId) {
    // Returns {isDeal, percentSaved, historicalAvg}
  }
  
  // Track price changes over time
  async trackPriceChange(itemId, oldPrice, newPrice, userId) {
    // Records in mdl_price_history
  }
}
```

#### 2. **PriceEstimateWidget** (Frontend Component)
```javascript
// frontend/src/components/price/PriceEstimateWidget.js

const PriceEstimateWidget = ({ itemName, currentPrice, storeId }) => {
  const { estimate, confidence, trend } = usePriceEstimate(itemName, storeId);
  
  return (
    <div className="price-estimate-widget">
      {/* Estimated Price Badge */}
      <PriceEstimateBadge 
        estimate={estimate}
        confidence={confidence}
        trend={trend}
      />
      
      {/* Price Comparison Button */}
      <button onClick={() => setShowComparison(true)}>
        Compare Prices
      </button>
      
      {/* Price Comparison Modal */}
      {showComparison && (
        <PriceComparisonModal 
          itemName={itemName}
          currentStore={storeId}
        />
      )}
    </div>
  );
};
```

#### 3. **PriceComparisonModal** (Frontend Component)
```javascript
// frontend/src/components/price/PriceComparisonModal.js

const PriceComparisonModal = ({ itemName, currentStore }) => {
  const { stores, loading } = usePriceComparison(itemName);
  
  return (
    <CustomPanel title="Price Comparison" size="large">
      <div className="grid gap-4">
        {stores.map(store => (
          <StorePrice
            key={store.id}
            store={store.name}
            price={store.price}
            distance={store.distance}
            confidence={store.confidence}
            isCurrent={store.id === currentStore}
            trend={store.trend}
          />
        ))}
      </div>
      
      {/* Price History Chart */}
      <PriceHistoryChart itemName={itemName} />
    </CustomPanel>
  );
};
```

#### 4. **InlinePriceBadge** (Frontend Component)
```javascript
// frontend/src/components/price/InlinePriceBadge.js

const InlinePriceBadge = ({ price, estimate, dealStatus }) => {
  const badgeColor = getDealColor(dealStatus);
  
  return (
    <div className="inline-flex items-center gap-2">
      {/* Current Price */}
      <span className="text-lg font-bold">${price}</span>
      
      {/* Deal Indicator */}
      {dealStatus === 'great' && (
        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
          🔥 Great Deal!
        </span>
      )}
      
      {dealStatus === 'high' && (
        <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full">
          ⚠️ Higher than usual
        </span>
      )}
      
      {/* Estimated Price (if different) */}
      {estimate && Math.abs(price - estimate) > 0.5 && (
        <span className="text-sm text-gray-500">
          Usually ${estimate.toFixed(2)}
        </span>
      )}
    </div>
  );
};
```

---

## Database Schema

### New Tables

```sql
-- Price history tracking
CREATE TABLE mdl_price_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    item_name VARCHAR(255) NOT NULL,
    store_id INTEGER REFERENCES store_locations(id),
    price DECIMAL(10,2) NOT NULL,
    quantity DECIMAL(10,2),
    unit VARCHAR(50),
    recorded_at TIMESTAMP DEFAULT NOW(),
    source VARCHAR(50) DEFAULT 'user_input', -- 'user_input', 'receipt_scan', 'api'
    INDEX idx_price_history_item (item_name, store_id),
    INDEX idx_price_history_user (user_id, item_name)
);

-- Store price aggregates (cross-user)
CREATE TABLE mdl_store_prices (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    store_id INTEGER REFERENCES store_locations(id),
    average_price DECIMAL(10,2),
    min_price DECIMAL(10,2),
    max_price DECIMAL(10,2),
    sample_size INTEGER DEFAULT 0,
    confidence DECIMAL(3,2), -- 0.00 to 1.00
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(item_name, store_id)
);

-- Price alerts (notify when price drops)
CREATE TABLE price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    item_name VARCHAR(255) NOT NULL,
    target_price DECIMAL(10,2),
    store_id INTEGER REFERENCES store_locations(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    triggered_at TIMESTAMP
);
```

---

## API Endpoints

### Backend Routes (`/api/prices/`)

```javascript
// Get price estimate
GET /api/prices/estimate/:itemName/:storeId
Response: {
  estimate: 3.49,
  confidence: 0.85,
  trend: 'stable', // 'rising', 'falling', 'stable'
  historicalAvg: 3.25,
  sampleSize: 47
}

// Compare prices across stores
GET /api/prices/compare/:itemName?location=lat,lng
Response: [
  {
    storeId: 1,
    storeName: 'Walmart',
    price: 3.49,
    distance: 2.3, // miles
    confidence: 0.9,
    trend: 'stable',
    lastUpdated: '2026-09-20'
  },
  ...
]

// Analyze if current price is a deal
POST /api/prices/analyze
Body: { itemName, currentPrice, storeId }
Response: {
  isDeal: true,
  dealQuality: 'great', // 'great', 'good', 'average', 'high'
  percentSaved: 15.2,
  historicalAvg: 4.12,
  recommendation: 'Buy now - 15% below average'
}

// Track price change
POST /api/prices/track
Body: { itemName, price, quantity, unit, storeId }
Response: { success: true, priceId: 123 }

// Get price history
GET /api/prices/history/:itemName/:storeId?days=30
Response: [
  { date: '2026-09-01', price: 3.49, source: 'user_input' },
  ...
]

// Set price alert
POST /api/prices/alert
Body: { itemName, targetPrice, storeId }
Response: { success: true, alertId: 456 }
```

---

## Integration Points

### 1. Dashboard.js - Add Item
```javascript
// When user adds item, show price estimate
const { estimate, confidence } = usePriceEstimate(newItemName, currentStore?.id);

<div className="price-input-section">
  <input 
    type="number" 
    value={newItemPrice}
    onChange={(e) => setNewItemPrice(e.target.value)}
    placeholder={estimate ? `Est. $${estimate}` : 'Price'}
  />
  
  {estimate && (
    <InlinePriceBadge 
      price={newItemPrice}
      estimate={estimate}
      dealStatus={analyzeDealStatus(newItemPrice, estimate)}
    />
  )}
  
  <button onClick={() => setShowPriceComparison(true)}>
    <DollarSign /> Compare
  </button>
</div>
```

### 2. Shopping List Items
```javascript
// Show price badges on each item
{items.map(item => (
  <div className="item-row">
    <span>{item.item_name}</span>
    
    <InlinePriceBadge 
      price={item.price}
      estimate={item.estimated_price}
      dealStatus={item.deal_status}
    />
    
    <button onClick={() => openPriceComparison(item)}>
      Compare
    </button>
  </div>
))}
```

### 3. NextItemSuggestion.js
```javascript
// Show price estimate for next item
<div className="next-item-price">
  <PriceEstimateWidget 
    itemName={nextItem.item_name}
    currentPrice={nextItem.price}
    storeId={currentStore?.id}
  />
</div>
```

---

## Future Enhancements

### Phase 1: Basic Price Tracking (MVP)
- ✅ Track user's price history
- ✅ Calculate average prices per store
- ✅ Show price estimates when adding items
- ✅ Basic price comparison modal

### Phase 2: MDL Integration
- 🔄 Cross-user price aggregation
- 🔄 Location-based price estimates
- 🔄 Confidence scoring
- 🔄 Price trend detection

### Phase 3: Advanced Features
- 📅 Price alerts (notify when price drops)
- 📅 Price history charts
- 📅 Deal detection algorithm
- 📅 "Best time to buy" suggestions

### Phase 4: External Data (Future)
- 📅 Receipt scanning (extract prices)
- 📅 Store API integration (if available)
- 📅 Web scraping (legal considerations)
- 📅 Coupon integration
- 📅 Sale detection

---

## Price Estimation Algorithm

```javascript
async function estimatePrice(itemName, storeId, userId) {
  // 1. User's personal history (highest weight)
  const userPrices = await getUserPriceHistory(userId, itemName, storeId);
  const userAvg = calculateAverage(userPrices);
  const userWeight = userPrices.length > 0 ? 0.5 : 0;
  
  // 2. Store-specific average (medium weight)
  const storePrices = await getStorePrices(itemName, storeId);
  const storeAvg = storePrices.average_price;
  const storeWeight = storePrices.sample_size > 5 ? 0.3 : 0;
  
  // 3. Category average (low weight)
  const category = await getItemCategory(itemName);
  const categoryPrices = await getCategoryPrices(category, storeId);
  const categoryAvg = categoryPrices.average_price;
  const categoryWeight = 0.2;
  
  // Weighted average
  const totalWeight = userWeight + storeWeight + categoryWeight;
  const estimate = (
    (userAvg * userWeight) +
    (storeAvg * storeWeight) +
    (categoryAvg * categoryWeight)
  ) / totalWeight;
  
  // Confidence score
  const confidence = Math.min(
    (userPrices.length / 10) * 0.5 +
    (storePrices.sample_size / 50) * 0.3 +
    0.2,
    1.0
  );
  
  return { estimate, confidence };
}
```

---

## Deal Detection Algorithm

```javascript
function analyzeDeal(currentPrice, historicalAvg, trend) {
  const percentDiff = ((currentPrice - historicalAvg) / historicalAvg) * 100;
  
  if (percentDiff <= -15) return 'great'; // 15%+ below average
  if (percentDiff <= -5) return 'good';   // 5-15% below average
  if (percentDiff >= 10) return 'high';   // 10%+ above average
  return 'average';
}
```

---

## UI/UX Design

### Price Badge Colors
- 🟢 **Green** - Great deal (15%+ below average)
- 🟡 **Yellow** - Good deal (5-15% below average)
- ⚪ **Gray** - Average price
- 🔴 **Red** - High price (10%+ above average)

### Confidence Indicators
- ⭐⭐⭐ High confidence (10+ data points)
- ⭐⭐ Medium confidence (3-9 data points)
- ⭐ Low confidence (1-2 data points)
- ❓ No data

### Price Comparison Layout
```
┌─────────────────────────────────────┐
│ Price Comparison: Milk (1 Gallon)  │
├─────────────────────────────────────┤
│ ✓ Walmart (Current)        $3.49   │
│   2.3 miles • High confidence       │
│   📊 Stable trend                   │
├─────────────────────────────────────┤
│   Target                   $3.79   │
│   3.1 miles • Medium confidence     │
│   📈 Rising trend                   │
├─────────────────────────────────────┤
│   Kroger                   $3.29   │
│   4.5 miles • Low confidence        │
│   📉 Falling trend                  │
└─────────────────────────────────────┘
```

---

## Implementation Checklist

### Backend
- [ ] Create `mdl_price_history` table
- [ ] Create `mdl_store_prices` table
- [ ] Create `price_alerts` table
- [ ] Build `PriceCalculationEngine` service
- [ ] Create `/api/prices/` routes
- [ ] Add price tracking to item creation
- [ ] Build price aggregation batch job

### Frontend
- [ ] Create `PriceEstimateWidget.js`
- [ ] Create `PriceComparisonModal.js`
- [ ] Create `InlinePriceBadge.js`
- [ ] Create `PriceHistoryChart.js`
- [ ] Create `usePriceEstimate` hook
- [ ] Create `usePriceComparison` hook
- [ ] Integrate into Dashboard.js
- [ ] Integrate into NextItemSuggestion.js
- [ ] Add price tracking on item edit

### Testing
- [ ] Test price estimation accuracy
- [ ] Test deal detection algorithm
- [ ] Test price comparison across stores
- [ ] Test price alerts
- [ ] Test with various confidence levels
- [ ] Performance test with large datasets

---

## Success Metrics

**Week 1:**
- Price tracking working
- Basic estimates showing
- 50+ price data points collected

**Month 1:**
- 80%+ estimate accuracy
- Price comparison functional
- 1000+ price data points

**Month 3:**
- Deal detection 90%+ accurate
- Price alerts working
- Users saving avg 10%+ on groceries

---

## Privacy & Data

- User price data is private by default
- Aggregated store prices are anonymous
- Users can opt-in to share price data
- Users can export/delete all price history
- Location data used only for distance calculations

---

## Related Systems

- **MDL System** - Provides historical data and patterns
- **ASI System** - Store location data
- **CFS System** - UI components and widgets
- **Leveling System** - Award XP for price reporting

---

**Created:** September 25, 2026  
**Last Updated:** September 25, 2026  
**Next Review:** After Shopping Lists + AVE are working
