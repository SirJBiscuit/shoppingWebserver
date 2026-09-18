# 🎓 Admin Training System

## Overview
A comprehensive admin interface for training and managing the MDL (Master Data Library) system with price intelligence, product data, and machine learning features.

## Purpose
- Train the system with accurate product data
- Review and correct user-submitted prices
- Manage product categories, icons, and metadata
- Monitor data quality and outliers
- Bulk import/export product data

## Location
**Admin Sidebar → Training System**

## Features

### 1. **Price Training Dashboard**
- View all recent price submissions
- Flag outliers and suspicious data
- Approve/reject price entries
- Bulk edit prices
- Price trend visualization

### 2. **Product Data Management**
- Add/edit/delete products in MDL
- Assign categories and aisles
- Upload product icons
- Set default units and quantities
- Manage product aliases (e.g., "milk" = "whole milk")

### 3. **Category & Aisle Management**
- Create/edit product categories
- Define aisle mappings
- Set category icons
- Organize hierarchy (category → subcategory)

### 4. **Data Quality Tools**
- Outlier detection dashboard
- Duplicate product finder
- Missing data reporter
- Data validation rules
- Bulk cleanup tools

### 5. **Import/Export**
- CSV import for bulk products
- Export MDL data for backup
- Import price data from receipts
- Template downloads

### 6. **Analytics & Insights**
- Price trends over time
- Most/least expensive items
- Category price averages
- User contribution stats
- Data quality score

## UI Layout

```
┌─────────────────────────────────────────────────────┐
│ 🎓 Training System                                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  [Price Training] [Products] [Categories] [Quality]│
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Recent Price Submissions (Last 24h)         │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 🥛 Milk - $3.99 (2 gal) ⚠️ Outlier          │  │
│  │   User: john_doe | Store: Walmart           │  │
│  │   [✓ Approve] [✗ Reject] [✏️ Edit]          │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 🍞 Bread - $2.49 (1 loaf) ✓ Normal          │  │
│  │   User: jane_smith | Store: Target          │  │
│  │   [✓ Approve] [✗ Reject] [✏️ Edit]          │  │
│  └─────────────────────────────────────────────┘  │
│                                                     │
│  ┌─────────────────────────────────────────────┐  │
│  │ Quick Stats                                  │  │
│  ├─────────────────────────────────────────────┤  │
│  │ 📊 1,234 Products | 💰 5,678 Prices         │  │
│  │ ⚠️ 23 Outliers | ✓ 98% Data Quality         │  │
│  └─────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

## Database Schema Enhancements

### New Tables

```sql
-- Price history with metadata
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER REFERENCES product_master_data(id),
  store_id INTEGER,
  price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
  is_outlier BOOLEAN DEFAULT false,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

-- Product aliases for better matching
CREATE TABLE product_aliases (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES product_master_data(id),
  alias VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Category hierarchy
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id INTEGER REFERENCES categories(id),
  icon VARCHAR(10),
  aisle_hint VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Data quality tracking
CREATE TABLE data_quality_issues (
  id SERIAL PRIMARY KEY,
  issue_type VARCHAR(50), -- outlier, duplicate, missing_data
  entity_type VARCHAR(50), -- product, price, category
  entity_id INTEGER,
  severity VARCHAR(20), -- low, medium, high
  description TEXT,
  status VARCHAR(20) DEFAULT 'open', -- open, resolved, ignored
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id)
);
```

### Enhanced product_master_data

```sql
ALTER TABLE product_master_data ADD COLUMN IF NOT EXISTS
  avg_price DECIMAL(10,2),
  price_count INTEGER DEFAULT 0,
  last_price_update TIMESTAMP,
  category_id INTEGER REFERENCES categories(id),
  data_quality_score INTEGER DEFAULT 100,
  is_verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  verified_at TIMESTAMP;
```

## API Endpoints

### Price Training
```
GET    /api/admin/training/prices/pending
GET    /api/admin/training/prices/outliers
POST   /api/admin/training/prices/:id/approve
POST   /api/admin/training/prices/:id/reject
PUT    /api/admin/training/prices/:id
GET    /api/admin/training/prices/stats
```

### Product Management
```
GET    /api/admin/training/products
POST   /api/admin/training/products
PUT    /api/admin/training/products/:id
DELETE /api/admin/training/products/:id
GET    /api/admin/training/products/:id/history
POST   /api/admin/training/products/bulk-import
GET    /api/admin/training/products/export
```

### Categories
```
GET    /api/admin/training/categories
POST   /api/admin/training/categories
PUT    /api/admin/training/categories/:id
DELETE /api/admin/training/categories/:id
```

### Data Quality
```
GET    /api/admin/training/quality/issues
GET    /api/admin/training/quality/duplicates
GET    /api/admin/training/quality/missing-data
POST   /api/admin/training/quality/scan
```

## Component Structure

```
frontend/src/pages/
  AdminTraining.js          # Main training page

frontend/src/components/admin/
  PriceTrainingTab.js       # Price review interface
  ProductManagementTab.js   # Product CRUD
  CategoryManagementTab.js  # Category management
  DataQualityTab.js         # Quality dashboard
  ImportExportTab.js        # Bulk operations
  
  PriceReviewCard.js        # Individual price review
  ProductEditor.js          # Product edit form
  CategoryTree.js           # Hierarchical category view
  OutlierDetector.js        # Outlier visualization
  BulkImporter.js           # CSV import UI
```

## Implementation Phases

### Phase 1: Basic Price Training (Week 1)
- [ ] Create AdminTraining page
- [ ] Add to admin sidebar
- [ ] Build price review interface
- [ ] Implement approve/reject functionality
- [ ] Create price_history table
- [ ] Add outlier detection algorithm

### Phase 2: Product Management (Week 2)
- [ ] Product CRUD interface
- [ ] Category assignment
- [ ] Icon upload/selection
- [ ] Product aliases
- [ ] Search and filter

### Phase 3: Data Quality (Week 3)
- [ ] Outlier dashboard
- [ ] Duplicate detection
- [ ] Missing data reporter
- [ ] Quality score calculation
- [ ] Automated cleanup suggestions

### Phase 4: Import/Export (Week 4)
- [ ] CSV import parser
- [ ] Template generator
- [ ] Export functionality
- [ ] Bulk edit tools
- [ ] Data validation

### Phase 5: Analytics (Week 5)
- [ ] Price trend charts
- [ ] Category analytics
- [ ] User contribution stats
- [ ] Data quality metrics
- [ ] Reports and insights

## Outlier Detection Algorithm

```javascript
// Simple outlier detection using IQR method
function detectOutliers(prices) {
  const sorted = prices.sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerBound = q1 - (1.5 * iqr);
  const upperBound = q3 + (1.5 * iqr);
  
  return prices.map(price => ({
    price,
    isOutlier: price < lowerBound || price > upperBound,
    deviation: Math.abs(price - ((q1 + q3) / 2))
  }));
}
```

## Migration from Old "Learn Prices"

### Old Code Location
- `frontend/src/pages/LearnPrices.js` (if exists)
- Basic price entry interface
- Limited validation
- No admin review

### Migration Steps
1. Extract useful price data
2. Import into new price_history table
3. Mark as "legacy" status
4. Run outlier detection
5. Admin reviews and approves
6. Update product_master_data averages
7. Archive old interface

### Data Cleanup
```sql
-- Mark legacy prices
UPDATE price_history 
SET notes = 'Migrated from legacy system'
WHERE created_at < '2026-09-11';

-- Flag for review
UPDATE price_history 
SET status = 'pending'
WHERE status IS NULL;
```

## User Permissions

### Required Role
- `isAdmin = true` (existing)
- Future: `canTrainSystem` permission flag

### Access Control
```javascript
// Middleware check
if (!req.user.isAdmin) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

## Success Metrics

- **Data Quality**: >95% of products have verified data
- **Price Accuracy**: <5% outlier rate
- **Coverage**: >80% of common products in MDL
- **User Adoption**: Users see suggested prices 70% of the time
- **Admin Efficiency**: <2 minutes average review time per price

## Future Enhancements

- **Machine Learning**: Auto-approve prices within confidence threshold
- **Receipt Scanning**: OCR integration for bulk price import
- **Store Comparison**: Multi-store price tracking
- **Price Alerts**: Notify users of price drops
- **Seasonal Trends**: Track price changes over time
- **API Integration**: Pull prices from store APIs

## Notes

- This replaces the old "Learn Prices" page with a comprehensive system
- Integrates deeply with MDL for better data management
- Provides admin tools for maintaining data quality
- Enables machine learning and automation in the future
- Scalable architecture for future features
