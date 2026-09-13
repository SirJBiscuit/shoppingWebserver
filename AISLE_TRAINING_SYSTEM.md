# Aisle Training & Learning System

## Overview
A comprehensive system for users and admins to train aisle locations, with MDL-powered learning that gets smarter over time.

## Three-Tier Approach

### 1. Quick Train/Setup (Admin & Users)
Fast bulk setup for entire store layout

### 2. User Aisle Setup
Custom aisle configuration per store with numbers and categories

### 3. Smart Learning (MDL)
Automatic learning as users shop and add items

---

## Feature 1: Quick Train/Setup Aisles

### Quick Setup Modal
```javascript
const QuickAisleSetup = ({ store }) => {
  const [aisles, setAisles] = useState([
    { number: '1', categories: [], items: [] },
    { number: '2', categories: [], items: [] },
    // ... up to 20 aisles
  ]);
  
  return (
    <div className="quick-setup-modal">
      <h2>🏪 Quick Aisle Setup: {store.name}</h2>
      <p>Set up your store layout in minutes!</p>
      
      {/* Number of Aisles */}
      <div className="aisle-count">
        <label>How many aisles does this store have?</label>
        <input 
          type="number" 
          min="1" 
          max="50" 
          value={aisles.length}
          onChange={(e) => setAisleCount(e.target.value)}
        />
      </div>
      
      {/* Aisle Grid */}
      <div className="aisle-grid">
        {aisles.map((aisle, idx) => (
          <AisleQuickCard 
            key={idx}
            aisle={aisle}
            onUpdate={(data) => updateAisle(idx, data)}
          />
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="quick-actions">
        <button onClick={autoDetectLayout}>
          ✨ Auto-Detect Common Layout
        </button>
        <button onClick={importFromTemplate}>
          📋 Use Template (Walmart, Aldi, etc.)
        </button>
        <button onClick={saveSetup}>
          💾 Save Setup
        </button>
      </div>
    </div>
  );
};

const AisleQuickCard = ({ aisle, onUpdate }) => {
  return (
    <div className="aisle-card">
      <h3>Aisle {aisle.number}</h3>
      
      {/* Quick Category Selection */}
      <div className="category-chips">
        {COMMON_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            onClick={() => toggleCategory(cat)}
            className={aisle.categories.includes(cat.name) ? 'active' : ''}
          >
            {cat.icon} {cat.name}
          </button>
        ))}
      </div>
      
      {/* Custom Input */}
      <input 
        type="text"
        placeholder="Or type custom items..."
        onBlur={(e) => addCustomItems(e.target.value)}
      />
    </div>
  );
};
```

### Store Templates
```javascript
const STORE_TEMPLATES = {
  walmart: {
    name: "Walmart Standard Layout",
    aisles: [
      { number: '1', categories: ['Produce', 'Organic'] },
      { number: '2', categories: ['Bakery', 'Bread'] },
      { number: '3', categories: ['Dairy', 'Eggs', 'Cheese'] },
      { number: '4', categories: ['Meat', 'Seafood'] },
      { number: '5', categories: ['Frozen Foods'] },
      { number: '6', categories: ['Beverages', 'Juice'] },
      { number: '7', categories: ['Snacks', 'Chips'] },
      { number: '8', categories: ['Cereal', 'Breakfast'] },
      { number: '9', categories: ['Canned Goods', 'Soup'] },
      { number: '10', categories: ['Pasta', 'Rice', 'Grains'] },
      { number: '11', categories: ['Condiments', 'Sauces'] },
      { number: '12', categories: ['Baking', 'Spices'] },
      { number: '13', categories: ['Paper Products', 'Cleaning'] },
      { number: '14', categories: ['Health & Beauty'] },
      { number: '15', categories: ['Pet Supplies'] },
    ]
  },
  aldi: {
    name: "Aldi Standard Layout",
    aisles: [
      { number: '1', categories: ['Produce'] },
      { number: '2', categories: ['Dairy', 'Eggs'] },
      { number: '3', categories: ['Meat', 'Deli'] },
      { number: '4', categories: ['Frozen'] },
      { number: '5', categories: ['Pantry', 'Canned'] },
      { number: '6', categories: ['Snacks', 'Beverages'] },
      { number: '7', categories: ['Bread', 'Bakery'] },
      { number: '8', categories: ['Household', 'Paper'] },
    ]
  },
  target: {
    name: "Target Standard Layout",
    // ... similar structure
  }
};
```

---

## Feature 2: User Aisle Setup

### Detailed Aisle Configuration
```javascript
const UserAisleSetup = ({ store }) => {
  const [aisles, setAisles] = useState([]);
  const [editingAisle, setEditingAisle] = useState(null);
  
  return (
    <div className="user-aisle-setup">
      <h2>🗺️ Customize Your Store Layout</h2>
      <p className="subtitle">{store.name} - {store.address}</p>
      
      {/* Visual Store Map */}
      <div className="store-map">
        <StoreMapView 
          aisles={aisles}
          onAisleClick={(aisle) => setEditingAisle(aisle)}
        />
      </div>
      
      {/* Aisle List */}
      <div className="aisle-list">
        <button onClick={addAisle} className="add-aisle-btn">
          + Add Aisle
        </button>
        
        {aisles.map(aisle => (
          <AisleDetailCard
            key={aisle.id}
            aisle={aisle}
            onEdit={() => setEditingAisle(aisle)}
            onDelete={() => deleteAisle(aisle.id)}
          />
        ))}
      </div>
      
      {/* Edit Modal */}
      {editingAisle && (
        <AisleEditModal
          aisle={editingAisle}
          onSave={saveAisle}
          onClose={() => setEditingAisle(null)}
        />
      )}
    </div>
  );
};

const AisleDetailCard = ({ aisle, onEdit, onDelete }) => {
  return (
    <div className="aisle-detail-card">
      <div className="aisle-header">
        <h3>Aisle {aisle.number}</h3>
        <div className="actions">
          <button onClick={onEdit}>✏️ Edit</button>
          <button onClick={onDelete}>🗑️ Delete</button>
        </div>
      </div>
      
      <div className="aisle-content">
        {/* Categories */}
        <div className="categories">
          <strong>Categories:</strong>
          <div className="category-tags">
            {aisle.categories.map(cat => (
              <span key={cat} className="tag">
                {getCategoryIcon(cat)} {cat}
              </span>
            ))}
          </div>
        </div>
        
        {/* Items */}
        <div className="items">
          <strong>Items ({aisle.items.length}):</strong>
          <div className="item-list">
            {aisle.items.slice(0, 5).map(item => (
              <span key={item} className="item-chip">{item}</span>
            ))}
            {aisle.items.length > 5 && (
              <span className="more">+{aisle.items.length - 5} more</span>
            )}
          </div>
        </div>
        
        {/* Stats */}
        <div className="stats">
          <span>📊 {aisle.confidence}% confidence</span>
          <span>👥 {aisle.user_reports} user reports</span>
        </div>
      </div>
    </div>
  );
};

const AisleEditModal = ({ aisle, onSave, onClose }) => {
  const [number, setNumber] = useState(aisle.number);
  const [name, setName] = useState(aisle.name || '');
  const [categories, setCategories] = useState(aisle.categories || []);
  const [items, setItems] = useState(aisle.items || []);
  const [newItem, setNewItem] = useState('');
  
  return (
    <div className="modal-overlay">
      <div className="aisle-edit-modal">
        <h2>Edit Aisle {number}</h2>
        
        {/* Aisle Number */}
        <div className="form-group">
          <label>Aisle Number</label>
          <input 
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="1, 2, 3A, etc."
          />
        </div>
        
        {/* Aisle Name (Optional) */}
        <div className="form-group">
          <label>Aisle Name (Optional)</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Dairy & Eggs"
          />
        </div>
        
        {/* Categories */}
        <div className="form-group">
          <label>Categories</label>
          <div className="category-selector">
            {ALL_CATEGORIES.map(cat => (
              <button
                key={cat.name}
                onClick={() => toggleCategory(cat.name)}
                className={categories.includes(cat.name) ? 'selected' : ''}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Specific Items */}
        <div className="form-group">
          <label>Specific Items</label>
          <div className="item-input">
            <input 
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addItem()}
              placeholder="Type item name and press Enter"
            />
            <button onClick={addItem}>Add</button>
          </div>
          <div className="item-chips">
            {items.map((item, idx) => (
              <span key={idx} className="chip">
                {item}
                <button onClick={() => removeItem(idx)}>×</button>
              </span>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button onClick={() => onSave({ number, name, categories, items })} className="btn-primary">
            💾 Save Aisle
          </button>
        </div>
      </div>
    </div>
  );
};
```

---

## Feature 3: Smart Learning (MDL Integration)

### "Found in Aisle" Feature in Looking For Next
```javascript
const NextItemSuggestion = ({ nextItem, store, onAisleReport }) => {
  const [reportingAisle, setReportingAisle] = useState(false);
  const [aisleNumber, setAisleNumber] = useState('');
  const [predictedAisle, setPredictedAisle] = useState(null);
  
  useEffect(() => {
    // Get MDL prediction for aisle
    loadAislePrediction(nextItem.id, store.id);
  }, [nextItem, store]);
  
  return (
    <div className="next-item-suggestion">
      {/* Item Info */}
      <h3>{nextItem.item_name}</h3>
      
      {/* Predicted Aisle */}
      {predictedAisle && (
        <div className="predicted-aisle">
          <MapPin className="w-5 h-5" />
          <div>
            <p className="font-semibold">Most Likely Aisle</p>
            <p className="text-2xl font-bold">Aisle {predictedAisle.number}</p>
            <p className="text-sm">
              {predictedAisle.confidence}% confidence • {predictedAisle.category}
            </p>
          </div>
        </div>
      )}
      
      {/* Found It? Report Aisle */}
      <div className="aisle-report">
        {!reportingAisle ? (
          <button 
            onClick={() => setReportingAisle(true)}
            className="report-aisle-btn"
          >
            📍 Found it? Tell us which aisle
          </button>
        ) : (
          <div className="aisle-input">
            <label>Which aisle did you find it in?</label>
            <div className="input-group">
              <input 
                type="text"
                value={aisleNumber}
                onChange={(e) => setAisleNumber(e.target.value)}
                placeholder="Aisle number (e.g., 5)"
                autoFocus
              />
              <button 
                onClick={() => submitAisleReport()}
                className="btn-primary"
              >
                ✓ Submit
              </button>
              <button 
                onClick={() => setReportingAisle(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
            
            {/* Quick Number Buttons */}
            <div className="quick-numbers">
              {[1,2,3,4,5,6,7,8,9,10].map(num => (
                <button 
                  key={num}
                  onClick={() => {
                    setAisleNumber(num.toString());
                    submitAisleReport(num.toString());
                  }}
                  className="number-btn"
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Feedback */}
      {predictedAisle && aisleNumber && aisleNumber !== predictedAisle.number && (
        <div className="prediction-feedback">
          <AlertCircle className="w-4 h-4" />
          <p>Thanks! We'll learn that {nextItem.item_name} is in Aisle {aisleNumber}</p>
        </div>
      )}
    </div>
  );
  
  async function submitAisleReport(aisle = aisleNumber) {
    await onAisleReport({
      itemId: nextItem.id,
      aisleNumber: aisle,
      storeId: store.id,
      wasCorrect: aisle === predictedAisle?.number
    });
    
    setReportingAisle(false);
    
    // Show success toast
    toast.success(`✓ Learned: ${nextItem.item_name} is in Aisle ${aisle}`);
  }
};
```

### MDL Learning Backend
```javascript
// When user reports aisle location
async function recordAisleReport(userId, itemId, storeId, aisleNumber, wasCorrect) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Record the report
    await client.query(`
      INSERT INTO mdl_aisle_reports (
        user_id, item_name_id, store_id, aisle_number, 
        was_prediction_correct, reported_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [userId, itemId, storeId, aisleNumber, wasCorrect]);
    
    // 2. Update item's aisle mapping for this store
    await client.query(`
      INSERT INTO mdl_location_aisles (
        item_name_id, specific_store_id, aisle_number, 
        report_count, confidence_score
      )
      SELECT 
        $1, $2, $3,
        COUNT(*) as report_count,
        CASE 
          WHEN COUNT(*) >= 10 THEN 0.95
          WHEN COUNT(*) >= 5 THEN 0.85
          WHEN COUNT(*) >= 3 THEN 0.75
          ELSE 0.60
        END as confidence
      FROM mdl_aisle_reports
      WHERE item_name_id = $1 
        AND store_id = $2
        AND aisle_number = $3
      ON CONFLICT (item_name_id, specific_store_id)
      DO UPDATE SET
        aisle_number = EXCLUDED.aisle_number,
        report_count = EXCLUDED.report_count,
        confidence_score = EXCLUDED.confidence_score,
        last_updated = CURRENT_TIMESTAMP
    `, [itemId, storeId, aisleNumber]);
    
    // 3. Update category-aisle mapping (for predictions)
    const category = await getItemCategory(itemId);
    if (category) {
      await client.query(`
        INSERT INTO mdl_category_aisles (
          category, store_id, aisle_number, item_count
        )
        SELECT $1, $2, $3, COUNT(DISTINCT item_name_id)
        FROM mdl_aisle_reports
        WHERE store_id = $2 
          AND aisle_number = $3
          AND item_name_id IN (
            SELECT id FROM mdl_item_names WHERE predicted_category = $1
          )
        ON CONFLICT (category, store_id, aisle_number)
        DO UPDATE SET
          item_count = EXCLUDED.item_count,
          last_updated = CURRENT_TIMESTAMP
      `, [category, storeId, aisleNumber]);
    }
    
    await client.query('COMMIT');
    
    // 4. Award XP to user for contributing
    await awardXP(userId, 5, 'aisle_training');
    
    return { success: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Aisle Prediction Algorithm
```javascript
async function predictAisle(itemId, storeId) {
  // Level 1: Check if this specific item has been reported at this store
  const directMapping = await pool.query(`
    SELECT aisle_number, confidence_score, report_count
    FROM mdl_location_aisles
    WHERE item_name_id = $1 
      AND specific_store_id = $2
      AND report_count >= 2
    ORDER BY confidence_score DESC
    LIMIT 1
  `, [itemId, storeId]);
  
  if (directMapping.rows.length > 0) {
    return {
      aisle: directMapping.rows[0].aisle_number,
      confidence: directMapping.rows[0].confidence_score,
      source: 'direct_mapping',
      reports: directMapping.rows[0].report_count
    };
  }
  
  // Level 2: Check category mapping at this store
  const category = await getItemCategory(itemId);
  if (category) {
    const categoryMapping = await pool.query(`
      SELECT aisle_number, item_count
      FROM mdl_category_aisles
      WHERE category = $1 
        AND store_id = $2
      ORDER BY item_count DESC
      LIMIT 1
    `, [category, storeId]);
    
    if (categoryMapping.rows.length > 0) {
      return {
        aisle: categoryMapping.rows[0].aisle_number,
        confidence: Math.min(0.7, categoryMapping.rows[0].item_count / 10),
        source: 'category_mapping',
        category: category
      };
    }
  }
  
  // Level 3: Check similar items at this store
  const similarItems = await pool.query(`
    SELECT a.aisle_number, COUNT(*) as similar_count
    FROM mdl_location_aisles a
    JOIN mdl_item_names i ON a.item_name_id = i.id
    WHERE a.specific_store_id = $1
      AND i.predicted_category = (
        SELECT predicted_category FROM mdl_item_names WHERE id = $2
      )
    GROUP BY a.aisle_number
    ORDER BY similar_count DESC
    LIMIT 1
  `, [storeId, itemId]);
  
  if (similarItems.rows.length > 0) {
    return {
      aisle: similarItems.rows[0].aisle_number,
      confidence: 0.5,
      source: 'similar_items'
    };
  }
  
  // No prediction available
  return null;
}
```

---

## Database Schema

### Aisle Reports Table
```sql
CREATE TABLE mdl_aisle_reports (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  item_name_id INTEGER REFERENCES mdl_item_names(id),
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20),
  was_prediction_correct BOOLEAN,
  reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_item_store (item_name_id, store_id),
  INDEX idx_user (user_id),
  INDEX idx_reported (reported_at DESC)
);
```

### Category-Aisle Mapping
```sql
CREATE TABLE mdl_category_aisles (
  id SERIAL PRIMARY KEY,
  category VARCHAR(100),
  store_id INTEGER REFERENCES store_locations(id),
  aisle_number VARCHAR(20),
  item_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(category, store_id, aisle_number),
  INDEX idx_category_store (category, store_id)
);
```

### User Store Layouts
```sql
CREATE TABLE user_store_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  store_id INTEGER REFERENCES store_locations(id),
  layout_data JSONB, -- Full aisle configuration
  is_public BOOLEAN DEFAULT false, -- Share with other users?
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, store_id)
);
```

---

## UI Flow Examples

### Flow 1: Quick Setup
```
1. User clicks "Set Up Store Layout"
2. Modal: "How many aisles?" → 12
3. Shows 12 aisle cards
4. User clicks categories for each aisle
5. Clicks "Save"
6. Done! ✓
```

### Flow 2: Learning While Shopping
```
1. User sees "Looking for Next: Milk"
2. Prediction: "Most likely Aisle 3"
3. User finds it in Aisle 5
4. Clicks "Found it? Tell us which aisle"
5. Types "5" or clicks quick button
6. System learns: Milk → Aisle 5
7. Next time: predicts Aisle 5 ✓
```

### Flow 3: Detailed Customization
```
1. User goes to Store Settings
2. Clicks "Customize Aisles"
3. Visual store map shown
4. Clicks Aisle 3
5. Adds categories: Dairy, Eggs, Cheese
6. Adds specific items: Milk, Yogurt, Butter
7. Saves
8. System uses this for predictions
```

---

## Benefits

### For Users
- 🗺️ **Never wander** looking for items
- ⚡ **Faster shopping** with aisle guidance
- 🎯 **Accurate predictions** for their store
- 🏆 **Earn XP** for helping train
- 📱 **Easy setup** in minutes

### For System
- 🧠 **Learns automatically** from user reports
- 📊 **Better predictions** over time
- 🎨 **Personalized** per store
- 🔄 **Self-improving** with each report
- 🌟 **Crowdsourced** accuracy

### For Community
- 🤝 **Collaborative** data building
- 📈 **Everyone benefits** from reports
- 🏪 **Store-specific** accuracy
- 💡 **Shared knowledge**

---

## Implementation Priority

### Phase 1: Foundation
1. ✅ Database tables
2. ✅ Quick setup modal
3. ✅ Store templates
4. ✅ Basic aisle CRUD

### Phase 2: Learning
1. ✅ "Found in Aisle" feature
2. ✅ MDL prediction algorithm
3. ✅ Report recording
4. ✅ Confidence scoring

### Phase 3: Advanced
1. ⏳ Visual store map
2. ⏳ Detailed customization
3. ⏳ Analytics dashboard
4. ⏳ Public layout sharing

This system combines **quick setup**, **user customization**, and **smart learning** to create the most accurate aisle guidance possible! 🎯
