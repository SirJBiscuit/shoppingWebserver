# MDL User Pattern Tracking & Prediction System

## Overview
Track every time a user types an item, including context (price, date, store), to build intelligent predictions about what they need and when.

## Core Tracking Data

### What We Track Per Item Entry
```javascript
{
  user_id: 123,
  item_name: "Milk",
  normalized_name: "milk",
  timestamp: "2026-09-12T19:52:00Z",
  price: 3.99,
  quantity: 1,
  store: "Walmart",
  list_id: 456,
  day_of_week: 5, // Friday
  hour_of_day: 19,
  week_of_month: 2,
  month: 9,
  season: "fall"
}
```

## Database Schema

### Enhanced MDL Item Frequency Table
```sql
CREATE TABLE mdl_user_item_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  
  -- When & Where
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  hour_of_day INTEGER, -- 0-23
  week_of_month INTEGER, -- 1-5
  month INTEGER, -- 1-12
  season VARCHAR(10), -- spring, summer, fall, winter
  
  -- What & How Much
  quantity DECIMAL(10,2),
  unit VARCHAR(50),
  price DECIMAL(10,2),
  store_name VARCHAR(255),
  list_id INTEGER,
  
  -- Context
  was_suggestion BOOLEAN DEFAULT false, -- Did we suggest it?
  user_typed BOOLEAN DEFAULT true, -- Or selected from autocomplete?
  
  -- Indexes for fast queries
  INDEX idx_user_item (user_id, item_name_id),
  INDEX idx_timestamp (added_at DESC),
  INDEX idx_day_hour (day_of_week, hour_of_day)
);
```

### User Pattern Summary Table (Aggregated)
```sql
CREATE TABLE mdl_user_patterns (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  
  -- Frequency Stats
  total_times_added INTEGER DEFAULT 0,
  first_added TIMESTAMP,
  last_added TIMESTAMP,
  average_days_between DECIMAL(10,2), -- How often they buy it
  
  -- Price Stats
  average_price DECIMAL(10,2),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  last_price DECIMAL(10,2),
  price_trend VARCHAR(20), -- 'increasing', 'decreasing', 'stable'
  
  -- Quantity Stats
  average_quantity DECIMAL(10,2),
  typical_unit VARCHAR(50),
  
  -- Temporal Patterns
  preferred_day_of_week INTEGER, -- Most common day
  preferred_time_of_day INTEGER, -- Most common hour
  seasonal_pattern JSONB, -- {spring: 5, summer: 2, fall: 8, winter: 3}
  monthly_pattern JSONB, -- {1: 2, 2: 3, 3: 1, ...}
  
  -- Store Preferences
  preferred_stores JSONB, -- {"Walmart": 15, "Target": 5}
  
  -- Prediction Data
  next_predicted_date DATE,
  prediction_confidence DECIMAL(3,2), -- 0.00 to 1.00
  
  -- Metadata
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, item_name_id)
);
```

## Tracking Logic

### When User Types/Adds Item
```javascript
async function trackItemEntry(userId, itemData) {
  const {
    itemName,
    price,
    quantity,
    unit,
    store,
    listId
  } = itemData;
  
  const now = new Date();
  
  // 1. Get or create item in name registry
  const itemNameId = await getOrCreateItemName(itemName);
  
  // 2. Record this specific entry
  await db.query(`
    INSERT INTO mdl_user_item_history (
      user_id, item_name_id, added_at,
      day_of_week, hour_of_day, week_of_month, month, season,
      quantity, unit, price, store_name, list_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
  `, [
    userId,
    itemNameId,
    now,
    now.getDay(),
    now.getHours(),
    Math.ceil(now.getDate() / 7),
    now.getMonth() + 1,
    getSeason(now),
    quantity,
    unit,
    price,
    store,
    listId
  ]);
  
  // 3. Update aggregated patterns (async job)
  await updateUserPatterns(userId, itemNameId);
  
  // 4. Check if we should suggest related items
  await checkRelatedItemSuggestions(userId, itemNameId);
}
```

### Update User Patterns (Aggregation)
```javascript
async function updateUserPatterns(userId, itemNameId) {
  // Get all history for this user + item
  const history = await db.query(`
    SELECT * FROM mdl_user_item_history
    WHERE user_id = $1 AND item_name_id = $2
    ORDER BY added_at ASC
  `, [userId, itemNameId]);
  
  if (history.rows.length === 0) return;
  
  const entries = history.rows;
  
  // Calculate patterns
  const patterns = {
    total_times_added: entries.length,
    first_added: entries[0].added_at,
    last_added: entries[entries.length - 1].added_at,
    
    // Average days between purchases
    average_days_between: calculateAverageDaysBetween(entries),
    
    // Price stats
    average_price: calculateAverage(entries.map(e => e.price)),
    min_price: Math.min(...entries.map(e => e.price || Infinity)),
    max_price: Math.max(...entries.map(e => e.price || 0)),
    last_price: entries[entries.length - 1].price,
    price_trend: calculatePriceTrend(entries),
    
    // Quantity stats
    average_quantity: calculateAverage(entries.map(e => e.quantity)),
    typical_unit: getMostCommon(entries.map(e => e.unit)),
    
    // Temporal patterns
    preferred_day_of_week: getMostCommon(entries.map(e => e.day_of_week)),
    preferred_time_of_day: getMostCommon(entries.map(e => e.hour_of_day)),
    seasonal_pattern: groupByCount(entries, 'season'),
    monthly_pattern: groupByCount(entries, 'month'),
    
    // Store preferences
    preferred_stores: groupByCount(entries, 'store_name'),
    
    // Predict next purchase
    next_predicted_date: predictNextPurchase(entries),
    prediction_confidence: calculateConfidence(entries)
  };
  
  // Upsert into patterns table
  await db.query(`
    INSERT INTO mdl_user_patterns (user_id, item_name_id, ...)
    VALUES (...)
    ON CONFLICT (user_id, item_name_id)
    DO UPDATE SET ...
  `, [...]);
}
```

## Prediction Algorithms

### 1. Next Purchase Date Prediction
```javascript
function predictNextPurchase(entries) {
  if (entries.length < 2) return null;
  
  // Calculate intervals between purchases
  const intervals = [];
  for (let i = 1; i < entries.length; i++) {
    const days = daysBetween(entries[i-1].added_at, entries[i].added_at);
    intervals.push(days);
  }
  
  // Use weighted average (recent intervals matter more)
  const weights = intervals.map((_, i) => Math.pow(1.5, i)); // Exponential weight
  const weightedAvg = weightedAverage(intervals, weights);
  
  // Predict next date
  const lastDate = new Date(entries[entries.length - 1].added_at);
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + Math.round(weightedAvg));
  
  return nextDate;
}
```

### 2. Confidence Score Calculation
```javascript
function calculateConfidence(entries) {
  if (entries.length < 2) return 0.1;
  
  let confidence = 0;
  
  // More data = higher confidence (up to 0.4)
  confidence += Math.min(entries.length / 20, 0.4);
  
  // Consistent intervals = higher confidence (up to 0.3)
  const intervals = calculateIntervals(entries);
  const intervalStdDev = standardDeviation(intervals);
  const intervalAvg = average(intervals);
  const consistency = 1 - (intervalStdDev / intervalAvg);
  confidence += consistency * 0.3;
  
  // Recent activity = higher confidence (up to 0.2)
  const daysSinceLastPurchase = daysBetween(entries[entries.length - 1].added_at, new Date());
  const avgInterval = average(intervals);
  const recency = Math.max(0, 1 - (daysSinceLastPurchase / avgInterval));
  confidence += recency * 0.2;
  
  // Price consistency = higher confidence (up to 0.1)
  const prices = entries.map(e => e.price).filter(p => p > 0);
  if (prices.length > 0) {
    const priceStdDev = standardDeviation(prices);
    const priceAvg = average(prices);
    const priceConsistency = 1 - (priceStdDev / priceAvg);
    confidence += priceConsistency * 0.1;
  }
  
  return Math.min(confidence, 1.0);
}
```

### 3. Price Trend Analysis
```javascript
function calculatePriceTrend(entries) {
  const prices = entries.map(e => ({ date: e.added_at, price: e.price }))
    .filter(e => e.price > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  
  if (prices.length < 3) return 'stable';
  
  // Linear regression
  const slope = calculateSlope(prices);
  
  // Threshold: 5% change per month
  const avgPrice = average(prices.map(p => p.price));
  const threshold = avgPrice * 0.05;
  
  if (slope > threshold) return 'increasing';
  if (slope < -threshold) return 'decreasing';
  return 'stable';
}
```

## Smart Suggestions Based on Patterns

### 1. "You Usually Buy This Now" Suggestions
```javascript
async function getSuggestionsForUser(userId) {
  const now = new Date();
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMonth = now.getMonth() + 1;
  
  // Find items user typically buys around this time
  const suggestions = await db.query(`
    SELECT 
      p.*,
      i.item_name,
      i.predicted_icon,
      i.predicted_category
    FROM mdl_user_patterns p
    JOIN mdl_item_names i ON p.item_name_id = i.id
    WHERE p.user_id = $1
      AND p.next_predicted_date <= CURRENT_DATE + INTERVAL '3 days'
      AND p.prediction_confidence > 0.5
      AND (
        p.preferred_day_of_week = $2
        OR p.monthly_pattern->$3::text IS NOT NULL
      )
    ORDER BY p.prediction_confidence DESC, p.total_times_added DESC
    LIMIT 10
  `, [userId, currentDay, currentMonth]);
  
  return suggestions.rows;
}
```

### 2. "Running Low?" Predictions
```javascript
async function getRunningLowPredictions(userId) {
  // Items that are past their predicted restock date
  const predictions = await db.query(`
    SELECT 
      p.*,
      i.item_name,
      CURRENT_DATE - p.next_predicted_date as days_overdue
    FROM mdl_user_patterns p
    JOIN mdl_item_names i ON p.item_name_id = i.id
    WHERE p.user_id = $1
      AND p.next_predicted_date < CURRENT_DATE
      AND p.prediction_confidence > 0.6
      AND p.total_times_added >= 3
    ORDER BY days_overdue DESC, p.prediction_confidence DESC
    LIMIT 5
  `, [userId]);
  
  return predictions.rows;
}
```

### 3. "Price Alert" Notifications
```javascript
async function checkPriceAlerts(userId, itemName, currentPrice) {
  const pattern = await getUserPattern(userId, itemName);
  
  if (!pattern) return null;
  
  // Alert if price is significantly higher than average
  const priceIncrease = (currentPrice - pattern.average_price) / pattern.average_price;
  
  if (priceIncrease > 0.15) { // 15% higher
    return {
      type: 'price_alert',
      message: `${itemName} is ${Math.round(priceIncrease * 100)}% higher than your average price of $${pattern.average_price.toFixed(2)}`,
      severity: 'warning'
    };
  }
  
  // Alert if it's a good deal
  if (currentPrice < pattern.min_price) {
    return {
      type: 'good_deal',
      message: `Great price! ${itemName} is cheaper than you've ever paid ($${pattern.min_price.toFixed(2)})`,
      severity: 'success'
    };
  }
  
  return null;
}
```

## UI Features

### 1. Smart Shopping List Auto-Population
```javascript
// When user opens app, suggest items they typically buy
const suggestions = await getSuggestionsForUser(userId);

// Show banner: "Based on your patterns, you might need:"
// - Milk (usually buy every 7 days, last bought 6 days ago)
// - Eggs (typically buy on Fridays)
// - Bread (running low - predicted restock was 2 days ago)
```

### 2. Item Entry Enhancements
```javascript
// When user types "milk"
const pattern = await getUserPattern(userId, "milk");

// Show helpful info:
// - "You usually pay $3.99"
// - "Last bought 6 days ago"
// - "Typically buy 1 gallon"
// - "Usually shop at Walmart"

// Pre-fill quantity and unit based on patterns
```

### 3. Analytics Dashboard
```javascript
// Show user their shopping patterns:
// - Most frequently bought items
// - Average spending per item
// - Price trends over time
// - Shopping frequency patterns
// - Predicted next shopping date
```

## Performance Optimizations

### 1. Batch Processing
```javascript
// Don't update patterns on every entry
// Queue updates and process in batches every 5 minutes
const updateQueue = new Set();

function queuePatternUpdate(userId, itemNameId) {
  updateQueue.add(`${userId}:${itemNameId}`);
}

setInterval(async () => {
  const updates = Array.from(updateQueue);
  updateQueue.clear();
  
  for (const key of updates) {
    const [userId, itemNameId] = key.split(':');
    await updateUserPatterns(userId, itemNameId);
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

### 2. Caching
```javascript
// Cache user patterns in Redis
const patternCache = new Map();

async function getUserPattern(userId, itemName) {
  const cacheKey = `pattern:${userId}:${itemName}`;
  
  // Check cache first
  if (patternCache.has(cacheKey)) {
    return patternCache.get(cacheKey);
  }
  
  // Fetch from DB
  const pattern = await db.query(...);
  
  // Cache for 1 hour
  patternCache.set(cacheKey, pattern);
  setTimeout(() => patternCache.delete(cacheKey), 60 * 60 * 1000);
  
  return pattern;
}
```

### 3. Archiving Old Data
```javascript
// Move entries older than 1 year to archive table
// Keep aggregated patterns, discard individual entries
async function archiveOldEntries() {
  await db.query(`
    INSERT INTO mdl_user_item_history_archive
    SELECT * FROM mdl_user_item_history
    WHERE added_at < CURRENT_DATE - INTERVAL '1 year'
  `);
  
  await db.query(`
    DELETE FROM mdl_user_item_history
    WHERE added_at < CURRENT_DATE - INTERVAL '1 year'
  `);
}
```

## Privacy & Data Control

### User Controls
- View all tracked data
- Export personal data
- Delete specific entries
- Disable pattern tracking
- Opt out of predictions

### Data Retention
- Individual entries: 1 year
- Aggregated patterns: Forever (anonymized)
- User can request full deletion

## Benefits

### For Users
- 🎯 Smart suggestions based on their actual habits
- 💰 Price alerts when items are expensive
- 📅 Never forget to buy regular items
- ⚡ Faster shopping with pre-filled data
- 📊 Insights into spending patterns

### For System
- 🧠 Learns individual user preferences
- 🎨 Personalized experience
- 📈 Better predictions over time
- 💾 Efficient data storage
- 🔄 Self-improving

## Implementation Priority

1. ✅ Basic tracking (record each entry)
2. ✅ Pattern aggregation (calculate stats)
3. ✅ Next purchase prediction
4. ✅ Smart suggestions
5. ⏳ Price alerts
6. ⏳ Analytics dashboard
7. ⏳ ML model training

This system turns every item entry into valuable data that makes the app smarter and more helpful over time!
