# MDL Item Tracking System

## Problem Statement
The current localStorage-based item tracking system has limitations:
- ❌ Limited storage capacity (~5-10MB)
- ❌ No cross-device sync
- ❌ Can't handle thousands of items efficiently
- ❌ No intelligent data pruning
- ❌ No pattern recognition across users

## Solution: MDL-Powered Item Tracking

### Core Principles

1. **Always Track Names** - Never forget an item name, even if rarely used
2. **Smart Frequency Management** - Keep detailed stats for frequently used items
3. **Intelligent Pruning** - Archive old data while maintaining name registry
4. **Cross-User Learning** - Learn patterns across all users
5. **Optimized Storage** - Compress and index data efficiently

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   MDL Item Tracker                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Name Registry│  │ Hot Frequency│  │ Cold Archive │ │
│  │  (Always)    │  │  (Active)    │  │  (Historical)│ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│         │                  │                  │        │
│         └──────────────────┴──────────────────┘        │
│                            │                           │
│                   ┌────────▼────────┐                  │
│                   │  MDL Processor  │                  │
│                   │  - Categorize   │                  │
│                   │  - Predict      │                  │
│                   │  - Optimize     │                  │
│                   └─────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

### Database Schema

#### 1. **mdl_item_names** (Name Registry - Always Keep)
```sql
CREATE TABLE mdl_item_names (
  id SERIAL PRIMARY KEY,
  normalized_name VARCHAR(255) UNIQUE NOT NULL,
  original_variations JSONB, -- All variations seen
  first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_uses BIGINT DEFAULT 0,
  user_count INTEGER DEFAULT 0, -- How many users used it
  is_trained BOOLEAN DEFAULT false,
  category_confidence DECIMAL(3,2), -- 0.00 to 1.00
  predicted_category VARCHAR(100),
  predicted_icon VARCHAR(10),
  metadata JSONB -- Extensible data
);
```

#### 2. **mdl_item_frequency** (Hot Data - Active Tracking)
```sql
CREATE TABLE mdl_item_frequency (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  user_id INTEGER REFERENCES users(id),
  frequency_count INTEGER DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usage_pattern JSONB, -- Time of day, day of week patterns
  price_history JSONB, -- Recent prices (last 10)
  store_associations JSONB, -- Which stores
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(item_name_id, user_id)
);
```

#### 3. **mdl_item_archive** (Cold Data - Historical)
```sql
CREATE TABLE mdl_item_archive (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  user_id INTEGER REFERENCES users(id),
  archived_data JSONB, -- Compressed historical data
  archive_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_uses INTEGER,
  date_range DATERANGE -- When this data covers
);
```

#### 4. **mdl_training_queue** (Items Needing Training)
```sql
CREATE TABLE mdl_training_queue (
  id SERIAL PRIMARY KEY,
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  priority INTEGER DEFAULT 0, -- Higher = more important
  reason VARCHAR(100), -- 'high_frequency', 'new_variation', 'user_request'
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending'
);
```

### Optimization Strategies

#### 1. **Data Lifecycle Management**

```
New Item Added
    ↓
[Name Registry] ← Always keep name
    ↓
[Hot Frequency] ← Track for 30 days or until inactive
    ↓
If inactive for 30 days:
    ↓
[Cold Archive] ← Compress and move
    ↓
If used again:
    ↓
[Hot Frequency] ← Restore from archive
```

#### 2. **Smart Indexing**
- B-tree index on normalized_name for fast lookups
- GiST index on usage_pattern JSONB for pattern queries
- Partial index on is_trained = false for training queue
- Composite index on (user_id, last_used) for user queries

#### 3. **Data Compression**
```javascript
// Compress usage patterns
{
  "daily": [0,0,2,1,0,0,0], // Mon-Sun
  "hourly": [0,0,0,0,0,0,1,2,1,0,0,0,...], // 0-23
  "monthly": [5,3,7,4,6,8,9,7,5,4,3,2] // Jan-Dec
}

// Compress to:
{
  "d": "0021000",
  "h": "000000121000...",
  "m": "537468975432"
}
```

#### 4. **Batch Processing**
- Process item tracking in batches every 5 minutes
- Aggregate multiple uses into single DB update
- Use Redis for real-time tracking, sync to PostgreSQL periodically

### MDL Processing Pipeline

```javascript
// When user adds/uses an item:

1. Normalize name → "wheat bread" → "wheatbread"
2. Check Name Registry
   - Exists? → Update last_seen, increment total_uses
   - New? → Add to registry
3. Update/Create Hot Frequency record
4. Check if needs training:
   - Frequency threshold met?
   - New variation detected?
   - User requested?
   → Add to training queue
5. Run MDL predictions:
   - Predict category (if not trained)
   - Predict icon (if not trained)
   - Calculate confidence scores
6. Archive old data (async job):
   - Move records older than 30 days to archive
   - Compress data
   - Update name registry stats
```

### API Endpoints

#### **POST /api/mdl/track-item**
```javascript
{
  "item_name": "Wheat Bread",
  "context": {
    "price": 3.99,
    "store": "Walmart",
    "timestamp": "2026-09-12T19:38:00Z"
  }
}
```

#### **GET /api/mdl/suggestions**
Get smart suggestions based on MDL analysis

#### **GET /api/mdl/training-queue**
Get items that need training (admin)

#### **POST /api/mdl/train-item**
Train an item with proper categorization

#### **GET /api/mdl/stats**
Get MDL system statistics

### Performance Targets

- ✅ Handle 1M+ unique item names
- ✅ Track 10M+ usage events
- ✅ Query response time < 50ms
- ✅ Archive process < 5 minutes daily
- ✅ Training queue processing < 1 second
- ✅ Cross-user pattern detection in real-time

### Machine Learning Features

#### 1. **Category Prediction**
```python
# Train model on existing categorized items
# Features: item name tokens, common words, patterns
# Output: category + confidence score

"organic whole wheat bread" → 
  Category: "Bakery" (0.95 confidence)
```

#### 2. **Icon Prediction**
```python
# Learn from user selections
# Features: category, item name, user preferences
# Output: emoji + confidence score

"chicken breast" → 🍗 (0.92 confidence)
```

#### 3. **Price Prediction**
```python
# Analyze historical prices
# Features: item, store, location, time
# Output: expected price range

"milk gallon" at "Walmart" → $3.50-$4.50 (0.88 confidence)
```

#### 4. **Usage Pattern Detection**
```python
# Detect shopping patterns
# Features: time series data, user behavior
# Output: predicted next purchase date

"eggs" → Likely to buy again in 7-10 days
```

### Integration with Item Training System

```javascript
// Enhanced training flow with MDL

1. User types item frequently
2. MDL detects high frequency + low confidence
3. Add to training queue with priority
4. Show training modal to user/admin
5. User provides training data
6. MDL learns from training:
   - Update category prediction model
   - Update icon prediction model
   - Improve confidence scores
7. Apply learning to similar items
```

### Migration Strategy

#### Phase 1: Setup MDL Tables
- Create new MDL tables
- Set up indexes
- Create archive jobs

#### Phase 2: Migrate Existing Data
- Import from localStorage tracking
- Import from item_preferences
- Build initial name registry

#### Phase 3: Dual-Write Period
- Write to both old and new systems
- Validate data consistency
- Monitor performance

#### Phase 4: Full Cutover
- Switch reads to MDL system
- Deprecate old localStorage tracking
- Archive old data

### Monitoring & Maintenance

#### Daily Jobs:
- Archive old frequency data
- Update name registry statistics
- Process training queue
- Generate ML predictions
- Clean up duplicates

#### Weekly Jobs:
- Retrain ML models
- Optimize indexes
- Generate analytics reports
- Identify trending items

#### Monthly Jobs:
- Deep archive very old data
- Vacuum and analyze tables
- Review and tune performance
- Update prediction algorithms

### Benefits

#### For Users:
- 🚀 Faster autocomplete (indexed lookups)
- 🎯 Better suggestions (ML predictions)
- 📱 Cross-device sync (cloud-based)
- 🔄 Never lose item history

#### For Admins:
- 📊 Rich analytics and insights
- 🎓 Smarter training queue
- 🔍 Pattern detection across users
- ⚡ Efficient data management

#### For System:
- 💾 Optimized storage usage
- ⚙️ Scalable architecture
- 🧠 Continuous learning
- 📈 Performance at scale

### Next Steps

1. ✅ Create MDL database tables (migration)
2. ✅ Build MDL tracking API
3. ✅ Implement batch processing
4. ✅ Set up archive jobs
5. ✅ Integrate with item training
6. ✅ Build ML prediction models
7. ✅ Create admin dashboard for MDL
8. ✅ Migrate existing data
9. ✅ Performance testing
10. ✅ Deploy and monitor

This MDL system will be the foundation for intelligent, scalable item tracking that grows smarter over time!
