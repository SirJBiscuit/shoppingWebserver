# 🗺️ Implementation Roadmap

## Current Status (Sep 11, 2026)

### ✅ Completed Today
1. Sound Management fixes (close button, ConfirmModal, removed duplicate toggle)
2. "Grab These Too" checkbox fix (now toggles correct item)
3. Quick price entry redesign (increment/decrement buttons, learned prices)
4. Price display improvements (clear quantity context, warnings)
5. MDL backend routes registered
6. MDL admin tab placeholder created

### 📝 Documentation Created
- `PRICE_LEARNING_SYSTEM.md` - Price learning architecture
- `ADMIN_TRAINING_SYSTEM.md` - Comprehensive training system plan
- Updated `MDL_IMPLEMENTATION.md` with training system reference

---

## 🎯 Priority Queue

### **HIGH PRIORITY - Next Session**

#### 1. Admin Training System (Week 1-2)
**Goal:** Replace old "Learn Prices" with comprehensive training interface

**Tasks:**
- [ ] Create `frontend/src/pages/AdminTraining.js`
- [ ] Add "Training System" to admin sidebar
- [ ] Build price review interface (approve/reject/edit)
- [ ] Create `price_history` table migration
- [ ] Implement outlier detection algorithm
- [ ] Add price approval/rejection endpoints
- [ ] Test with real price data

**Files to Create:**
- `frontend/src/pages/AdminTraining.js`
- `frontend/src/components/admin/PriceTrainingTab.js`
- `frontend/src/components/admin/PriceReviewCard.js`
- `backend/migrations/create_price_history.sql`
- `backend/src/routes/admin/training.js`

**Estimated Time:** 8-12 hours

---

#### 2. MDL Product Management Interface (Week 2-3)
**Goal:** Full CRUD interface for product master data

**Tasks:**
- [ ] Build product list view with search/filter
- [ ] Create product editor form
- [ ] Implement icon upload/selection
- [ ] Add category assignment
- [ ] Create product aliases system
- [ ] Build bulk import/export
- [ ] Add data validation

**Files to Create:**
- `frontend/src/components/admin/ProductManagementTab.js`
- `frontend/src/components/admin/ProductEditor.js`
- `frontend/src/components/admin/IconSelector.js`
- `backend/migrations/create_product_aliases.sql`
- `backend/src/routes/admin/products.js`

**Estimated Time:** 12-16 hours

---

#### 3. Data Quality Dashboard (Week 3-4)
**Goal:** Monitor and maintain data quality

**Tasks:**
- [ ] Create outlier detection dashboard
- [ ] Build duplicate product finder
- [ ] Implement missing data reporter
- [ ] Add data quality scoring
- [ ] Create automated cleanup tools
- [ ] Build quality metrics visualization

**Files to Create:**
- `frontend/src/components/admin/DataQualityTab.js`
- `frontend/src/components/admin/OutlierDetector.js`
- `backend/migrations/create_data_quality_issues.sql`
- `backend/src/services/dataQuality.js`

**Estimated Time:** 10-14 hours

---

### **MEDIUM PRIORITY - Future Sessions**

#### 4. Category Management System
- [ ] Hierarchical category tree view
- [ ] Category CRUD operations
- [ ] Aisle mapping interface
- [ ] Category icon management
- [ ] Bulk category assignment

**Estimated Time:** 6-8 hours

---

#### 5. Price Intelligence Enhancements
- [ ] Store-specific price tracking
- [ ] Price trend visualization
- [ ] Price alert system
- [ ] Seasonal price analysis
- [ ] Multi-store price comparison

**Estimated Time:** 8-10 hours

---

#### 6. Import/Export System
- [ ] CSV template generator
- [ ] Bulk product import parser
- [ ] Data validation on import
- [ ] Export with filters
- [ ] Receipt OCR integration (future)

**Estimated Time:** 6-8 hours

---

### **LOW PRIORITY - Nice to Have**

#### 7. Analytics & Reporting
- [ ] Price trend charts
- [ ] Category analytics
- [ ] User contribution stats
- [ ] Data quality reports
- [ ] Export reports to PDF

**Estimated Time:** 8-10 hours

---

#### 8. Machine Learning Integration
- [ ] Auto-approve prices within confidence threshold
- [ ] Predict missing product data
- [ ] Smart category suggestions
- [ ] Anomaly detection improvements
- [ ] Price forecasting

**Estimated Time:** 12-16 hours

---

## 📊 Database Migrations Needed

### Immediate (Next Session)
```sql
-- Price history with review status
CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  product_id INTEGER,
  item_name VARCHAR(255),
  store_id INTEGER,
  price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,
  unit VARCHAR(50),
  status VARCHAR(20) DEFAULT 'pending',
  is_outlier BOOLEAN DEFAULT false,
  reviewed_by INTEGER REFERENCES users(id),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE INDEX idx_price_history_status ON price_history(status);
CREATE INDEX idx_price_history_user ON price_history(user_id);
CREATE INDEX idx_price_history_created ON price_history(created_at);
```

### Phase 2
```sql
-- Product aliases
CREATE TABLE product_aliases (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES product_master_data(id),
  alias VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories with hierarchy
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
  issue_type VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id INTEGER,
  severity VARCHAR(20),
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by INTEGER REFERENCES users(id)
);
```

### Phase 3
```sql
-- Enhanced product_master_data
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

---

## 🔧 Technical Debt to Address

### Code Cleanup
- [ ] Remove old "Learn Prices" page (if exists)
- [ ] Migrate legacy price data to new system
- [ ] Consolidate duplicate price logic
- [ ] Refactor MDL API routes for consistency
- [ ] Add comprehensive error handling

### Testing
- [ ] Unit tests for outlier detection
- [ ] Integration tests for price approval flow
- [ ] E2E tests for admin training workflow
- [ ] Performance tests for bulk operations
- [ ] Data validation tests

### Documentation
- [ ] API documentation for training endpoints
- [ ] Admin user guide for training system
- [ ] Database schema documentation
- [ ] Deployment guide updates
- [ ] Troubleshooting guide

---

## 🎯 Success Metrics

### Data Quality Goals
- **95%+** of products have verified data
- **<5%** outlier rate in price submissions
- **80%+** of common products in MDL
- **70%+** of users see suggested prices

### Performance Goals
- **<2 min** average admin review time per price
- **<500ms** API response for price queries
- **<3 sec** page load for training dashboard
- **100+** products processed per bulk import

### User Adoption Goals
- **50%+** of users enter prices regularly
- **80%+** price accuracy (vs. receipts)
- **90%+** admin approval rate
- **<10%** data rejection rate

---

## 📅 Timeline Estimate

### Sprint 1 (Week 1-2): Foundation
- Admin Training System basic interface
- Price review and approval
- Outlier detection
- Database migrations

### Sprint 2 (Week 2-3): Product Management
- Product CRUD interface
- Icon management
- Category assignment
- Bulk operations

### Sprint 3 (Week 3-4): Quality & Polish
- Data quality dashboard
- Automated cleanup tools
- Analytics and reporting
- Testing and bug fixes

### Sprint 4 (Week 4-5): Enhancement
- Advanced features
- Machine learning integration
- Performance optimization
- Documentation

**Total Estimated Time:** 4-5 weeks for core features

---

## 🚀 Deployment Strategy

### Phase 1: Beta Testing
1. Deploy to staging environment
2. Admin-only access
3. Test with sample data
4. Gather feedback
5. Fix critical bugs

### Phase 2: Limited Rollout
1. Deploy to production
2. Enable for admin users
3. Monitor performance
4. Collect real data
5. Iterate based on usage

### Phase 3: Full Release
1. Open to all users
2. Announce new features
3. Provide training materials
4. Monitor adoption
5. Continuous improvement

---

## 📝 Notes

- Markdown lints are cosmetic - not blocking development
- Focus on functionality first, polish later
- Incremental commits for easier rollback
- Test migrations on staging before production
- Keep documentation updated as we build
- User feedback is critical for success

---

## 🔗 Related Documents

- `ADMIN_TRAINING_SYSTEM.md` - Detailed training system design
- `PRICE_LEARNING_SYSTEM.md` - Price learning architecture
- `MDL_IMPLEMENTATION.md` - MDL system overview
- `DEPLOY_TODAY.md` - Current deployment guide
- `SESSION_SUMMARY.md` - Session history

---

**Last Updated:** Sep 11, 2026
**Next Review:** Start of next development session
