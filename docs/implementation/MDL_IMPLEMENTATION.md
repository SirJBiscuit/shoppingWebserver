# MDL (Master Data Library) Implementation Plan

## 🆕 NEW: Admin Training System Integration
See `ADMIN_TRAINING_SYSTEM.md` for comprehensive training system that will integrate with MDL.

---

# MDL (Massive Data List) Implementation Guide

Complete guide to implementing the product master database with food icons throughout Listzy.

## Overview

The MDL system provides:
- **100s of food products** with 3D icons
- **Automatic categorization** into proper categories
- **Price intelligence** learned from user data
- **Smart suggestions** when adding items
- **Consistent icons** across all features

## Implementation Steps

### 1. Get Food Icons

**Current Status:** The automated scraper is having issues with the JavaScript-heavy food.getwicked.app site.

**Recommended Approach (Choose One):**

#### Option A: Use Emoji Icons (Quickest - Already Working!)
Your app already has excellent emoji icon detection. Skip icon downloads for now:

```bash
# Just learn prices from existing data
node scripts/learn-prices-from-db.js

# Skip to Step 2 (database setup)
```

#### Option B: Manual Download (Best Quality)
For the items you use most:

1. Visit https://food.getwicked.app
2. Browse to specific items (banana, apple, chicken, etc.)
3. Click download button, save to `public/food-icons/`
4. Name files as: `{item-slug}.png` (e.g., `banana.png`)
5. Run optimizer:
   ```bash
   node scripts/optimize-food-icons.js
   ```

#### Option C: Wait for Scraper Fix
The site structure may change or we can contact them for API access.

**For Now:** Proceed with emoji icons - they work great!

### 2. Run Database Migration

```bash
# Create MDL tables
docker exec -i shop_postgres psql -U shopuser -d shopdb < backend/migrations/035_create_mdl_system.sql
```

### 3. Import Icons to Database

```bash
# Import all scraped products into MDL
node scripts/import-icons-to-mdl.js
```

### 4. Register API Routes

Add to `backend/src/index.js`:

```javascript
const mdlRoutes = require('./routes/mdl');
app.use('/api/mdl', mdlRoutes);
```

### 5. Frontend Integration

#### A. Create MDL API Service

`frontend/src/services/mdlAPI.js`:

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3007/api';

export const mdlAPI = {
  // Search products
  searchProducts: (query, category = null) => 
    axios.get(`${API_URL}/mdl/search`, { 
      params: { q: query, category } 
    }),
  
  // Get product details
  getProduct: (identifier) => 
    axios.get(`${API_URL}/mdl/product/${identifier}`),
  
  // Get categories
  getCategories: () => 
    axios.get(`${API_URL}/mdl/categories`),
  
  // Get popular products
  getPopular: (limit = 20) => 
    axios.get(`${API_URL}/mdl/popular`, { params: { limit } }),
};
```

#### B. Update Dashboard to Use MDL

In `Dashboard.js`, replace emoji detection with MDL lookup:

```javascript
import { mdlAPI } from '../services/mdlAPI';

// When user types item name
const handleItemNameChange = async (value) => {
  setNewItemName(value);
  
  if (value.length >= 2) {
    // Search MDL for suggestions
    const results = await mdlAPI.searchProducts(value);
    setSuggestions(results.data);
  }
};

// When user selects a suggestion
const selectSuggestion = (product) => {
  setNewItemName(product.product_name);
  setNewItemCategory(product.category);
  setNewItemPrice(product.average_price);
  setNewItemIcon(`/food-icons/optimized/${product.icon_filename}`);
  // Or use product.icon_emoji if you prefer emojis
};
```

#### C. Update Inventory Card to Show Icons

In `InventoryCard.js`:

```javascript
{/* Show 3D food icon if available */}
{item.icon_image_url ? (
  <img 
    src={`/food-icons/optimized/${item.icon_filename}`}
    alt={item.item_name}
    className="w-full h-full object-contain"
  />
) : (
  <div className={styles.icon}>
    {item.item_icon || detectIcon(item.item_name) || '📦'}
  </div>
)}
```

#### D. Create Product Picker Component

`frontend/src/components/ProductPicker.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { mdlAPI } from '../services/mdlAPI';

const ProductPicker = ({ onSelect }) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  
  useEffect(() => {
    loadCategories();
  }, []);
  
  useEffect(() => {
    if (search.length >= 2) {
      searchProducts();
    }
  }, [search, selectedCategory]);
  
  const loadCategories = async () => {
    const response = await mdlAPI.getCategories();
    setCategories(response.data);
  };
  
  const searchProducts = async () => {
    const response = await mdlAPI.searchProducts(search, selectedCategory);
    setResults(response.data);
  };
  
  return (
    <div className="product-picker">
      {/* Category filter */}
      <div className="categories">
        {categories.map(cat => (
          <button 
            key={cat.category}
            onClick={() => setSelectedCategory(cat.category)}
            className={selectedCategory === cat.category ? 'active' : ''}
          >
            {cat.category} ({cat.count})
          </button>
        ))}
      </div>
      
      {/* Search */}
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products..."
      />
      
      {/* Results with icons */}
      <div className="results-grid">
        {results.map(product => (
          <div 
            key={product.id}
            onClick={() => onSelect(product)}
            className="product-card"
          >
            <img 
              src={`/food-icons/optimized/${product.icon_filename}`}
              alt={product.product_name}
            />
            <div className="product-name">{product.product_name}</div>
            <div className="product-price">${product.average_price}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductPicker;
```

### 6. Admin Interface for MDL

Create admin page to manage products:

`frontend/src/pages/AdminMDL.js`:

- View all products
- Edit prices, categories, icons
- Add new products manually
- View price history
- See usage statistics

## Benefits

### For Users:
- ✅ Beautiful 3D icons for all items
- ✅ Smart price suggestions
- ✅ Faster item entry with autocomplete
- ✅ Consistent categorization
- ✅ Better organization

### For You:
- ✅ Centralized product database
- ✅ Easy to maintain and update
- ✅ Learn from user behavior
- ✅ Scale to 1000s of products
- ✅ Professional appearance

## Maintenance

### Update Prices Periodically

```bash
# Re-learn prices from user data (monthly)
node scripts/learn-prices-from-db.js

# Re-import to update MDL
node scripts/import-icons-to-mdl.js
```

### Add New Products

```bash
# Scrape new items from getwicked.app
node scripts/scrape-all-food-icons.js

# Import new products
node scripts/import-icons-to-mdl.js
```

## Database Queries

### Most Popular Products
```sql
SELECT product_name, times_purchased, average_price
FROM product_master_data
ORDER BY times_purchased DESC
LIMIT 20;
```

### Price Trends
```sql
SELECT p.product_name, ph.price, ph.store, ph.recorded_at
FROM mdl_price_history ph
JOIN product_master_data p ON p.id = ph.product_id
WHERE p.slug = 'banana'
ORDER BY ph.recorded_at DESC;
```

### Products Needing Price Updates
```sql
SELECT product_name, average_price, last_price_update
FROM product_master_data
WHERE last_price_update < NOW() - INTERVAL '30 days'
OR last_price_update IS NULL
ORDER BY times_purchased DESC;
```

## Next Steps

1. ✅ Run scraper to get all icons
2. ✅ Import to database
3. ✅ Update frontend to use MDL
4. ✅ Create admin interface
5. ✅ Monitor usage and refine prices
6. ✅ Add more products over time

## Files Created

- `backend/migrations/035_create_mdl_system.sql` - Database schema
- `backend/src/routes/mdl.js` - API routes
- `scripts/scrape-all-food-icons.js` - Icon scraper
- `scripts/learn-prices-from-db.js` - Price learning
- `scripts/import-icons-to-mdl.js` - Import to database
- `scripts/optimize-food-icons.js` - Image optimization
