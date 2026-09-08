# ✨ Features To Add

**Last Updated:** September 8, 2026

## 🎯 Planned Features

### High Priority

- [ ] **MDL - Massive Data List (Admin Product Database)**
  - **Description:** Admin-managed database of common products with default prices, locations, stores, sizes, and expiration data
  - **Details:**
    - Admin page to view/edit/teach the system about products
    - Fields: Product name, default price, location, store, best store, common size, expiration estimates
    - Show price ranges (low/high), best stores automatically
    - "Teach" button for admin to add new products or update existing
    - Auto-suggest from MDL when users type product names
    - Track where products are cheapest, most common sizes, typical shelf life
  - **Estimated Effort:** Large (new database table, admin UI, integration with existing forms)
  - **Dependencies:** Admin authentication, new migration for MDL table
  - **Notes:** This will dramatically improve UX by providing smart defaults for common items
  - **Database Schema:**
    ```sql
    CREATE TABLE product_master_data (
      id SERIAL PRIMARY KEY,
      product_name VARCHAR(255) UNIQUE NOT NULL,
      category VARCHAR(100),
      default_price_low DECIMAL(10,2),
      default_price_high DECIMAL(10,2),
      best_store VARCHAR(255),
      common_stores TEXT[], -- array of stores
      common_size VARCHAR(50),
      common_unit VARCHAR(50),
      typical_shelf_life_days INTEGER,
      typical_location VARCHAR(50),
      notes TEXT,
      times_purchased INTEGER DEFAULT 0,
      last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ```

- [ ] **Home Inventory Mobile Optimization**
  - **Description:** Improve responsive design for mobile devices
  - **Details:** TBD - need specifics on what needs improvement
  - **Estimated Effort:** Medium
  - **Dependencies:** None
  - **Notes:** User mentioned responsiveness issues

- [ ] **Recipe Ingredient Auto-Delete**
  - **Description:** When deleting a recipe, also delete its ingredients
  - **Details:** Currently ingredients remain orphaned in database
  - **Estimated Effort:** Small
  - **Dependencies:** None
  - **Notes:** Cascade delete on recipe_ingredients table

### Medium Priority

- [ ] **Admin Toolbar Improvements**
  - **Description:** Better positioning and z-index management
  - **Details:** Currently can block UI elements
  - **Estimated Effort:** Small
  - **Dependencies:** None
  - **Notes:** Temporary workaround exists (Settings toggle)

- [ ] **Feature Flag Management UI**
  - **Description:** Visual interface to manage feature flags
  - **Details:** Drag-and-drop ordering, toggle enable/disable
  - **Estimated Effort:** Medium
  - **Dependencies:** Feature flags table must be populated
  - **Notes:** Backend endpoints exist, frontend needs work

- [ ] **Bulk Item Actions in Home Inventory**
  - **Description:** Select multiple items and perform actions (delete, move, etc.)
  - **Details:** Checkbox selection, bulk action bar
  - **Estimated Effort:** Medium
  - **Dependencies:** None
  - **Notes:** Components partially exist

### Low Priority

- [ ] **Dark Mode Improvements**
  - **Description:** Better contrast and color consistency
  - **Details:** Some components don't respect dark mode properly
  - **Estimated Effort:** Small
  - **Dependencies:** None
  - **Notes:** Ongoing refinement

- [ ] **Export/Import Inventory Data**
  - **Description:** Allow users to export/import their inventory as JSON/CSV
  - **Details:** Backup and restore functionality
  - **Estimated Effort:** Medium
  - **Dependencies:** None
  - **Notes:** Similar to settings export/import

---

## ✅ Completed Features

- [x] **Admin Toolbar Toggle in Settings**
  - **Completed:** September 8, 2026
  - **Description:** Added toggle to show/hide admin toolbar
  - **Location:** Settings → App Preferences → Admin Toolbar

- [x] **Detailed Error Logging for Inventory Delete**
  - **Completed:** September 8, 2026
  - **Description:** Added console logging to diagnose delete failures
  - **Location:** PantryNew.js, PantryNewV2.js

- [x] **Database Command Fixes**
  - **Completed:** September 8, 2026
  - **Description:** Corrected database user (shopuser) and name (shopdb) in all scripts
  - **Location:** SERVER_COMMANDS.md, fix-features.sh, check-features-table.sh

---

## 💡 Feature Ideas (Backlog)

- Voice input for adding items
- Barcode scanner integration
- Shopping list sharing between users
- Recipe recommendations based on inventory
- Expiration date notifications (push/email)
- Store price comparison
- Meal planning with auto-generated shopping lists
- Pantry organization suggestions
- Waste tracking analytics
- Integration with grocery delivery services

---

## 📝 Notes

- Features should be fully implemented and tested before marking complete
- Update "Completed" date when moving to completed section
- Keep "Feature Ideas" section for brainstorming
- Prioritize based on user needs and impact
