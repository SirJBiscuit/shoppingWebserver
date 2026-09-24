# CloudMC Shop - Complete System Overview

**Last Updated:** September 24, 2026  
**Purpose:** Quick reference for system architecture and features

---

## 🏗️ Core Architecture

### Tech Stack
- **Frontend:** React 18, TailwindCSS, Framer Motion, Lucide Icons
- **Backend:** Node.js, Express, PostgreSQL, JWT Auth
- **Infrastructure:** Docker, Docker Compose, Nginx, Cloudflare Tunnel
- **Deployment:** shop.cloudmc.online (Production)

### Key Directories
```
shopWebserver/
├── frontend/src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Main page components
│   ├── hooks/           # Custom React hooks
│   ├── contexts/        # React contexts (Auth, Theme, Editor, etc.)
│   ├── utils/           # Utility functions
│   ├── api/             # API client functions
│   └── backburner/      # Disabled/WIP features
├── backend/
│   ├── src/routes/      # API endpoints
│   ├── migrations/      # Database migrations
│   └── middleware/      # Auth, validation, etc.
└── docs/                # Documentation
```

---

## 🎯 Major Systems

### 1. **CFS (Custom Feature Scripts)**
Universal widget configuration and rendering system.

**Purpose:** Provides foundation for visual editing and component management

**Key Files:**
- `utils/widgetConfig.js` - Configuration schema for 50+ widget types
- `components/WidgetRenderer.js` - Universal widget renderer
- `hooks/useWidget.js` - Widget management hooks

**Features:**
- 50+ widget types (CustomPanel, CustomKeypad, ItemList, etc.)
- Animation system (15+ presets via Framer Motion)
- Responsive auto-adaptation (mobile/tablet/desktop)
- Nested widgets, conditional rendering
- Export/import to JSON

---

### 2. **AVE (Admin Visual Editor)**
Complete visual editing system for customizing the app without code.

**Purpose:** Allows admins to customize Dashboard, Sidebar, and all widgets visually

**Status:** 95% complete (needs database tables)

**Core Components (23 total):**
- `aveManager.js` - Auto-save, undo/redo (50 history), version control
- `EditorContext.js` - Global editor state, keyboard shortcuts
- `EditorToolbar.js` - Undo/redo, save, grid toggle, performance mode
- `WidgetLibrary.js` - 50+ widgets, drag-drop, searchable
- `InlinePropertiesPanel.js` - Edit properties (Layout, Style, Content, Animation)
- `CommandPalette.js` - Quick widget insertion (Ctrl+K)
- `HistoryTimeline.js` - Visual history, snapshots
- `ContextMenu.js` - Right-click actions
- `AnimationPresets.js` - 20+ animations
- `BreakpointManager.js` - Responsive controls

**What AVE Can Edit:**
- Dashboard: Shopping list items, price entry, category filters, search bars, buttons
- Sidebar: Navigation links, user profile, settings menu, admin tools
- All Properties: Layout, style, content, animation, interaction, responsive

**Keyboard Shortcuts:**
- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save
- `Ctrl+K` - Command palette
- `Delete` - Delete widget
- `Ctrl+D` - Duplicate

**Database Tables (need creation):**
```sql
CREATE TABLE ave_layouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  layout JSONB NOT NULL,
  version VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ave_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  layout JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 3. **MDL (Machine Data Learning)**
Intelligent item tracking and prediction system.

**Purpose:** Learn from user behavior to predict prices, aisles, and shopping patterns

**Database Tables (11 total):**
- `mdl_item_names` - Permanent registry of all item names
- `mdl_user_item_history` - Every item addition with full context
- `mdl_user_patterns` - Aggregated user patterns and predictions
- `mdl_location_prices` - Location-aware price estimates
- `mdl_aisle_reports` - User-reported aisle locations
- `mdl_location_aisles` - Aggregated aisle predictions
- `mdl_category_aisles` - Category-to-aisle mappings
- `store_locations` - Physical stores database
- `user_locations` - User's location for accuracy
- `user_store_layouts` - Custom store layouts

**API Endpoints:**
- `POST /api/mdl/track-item` - Record item usage
- `GET /api/mdl/patterns/:itemName` - Get user patterns
- `GET /api/mdl/suggestions` - Get smart suggestions
- `GET /api/mdl/price/:itemName` - Get price estimate
- `POST /api/mdl/aisle/report` - Report aisle location
- `GET /api/mdl/aisle/:itemName/:storeId` - Get aisle prediction
- `POST /api/mdl/location` - Set user location
- `GET /api/mdl/location` - Get user location

**Features:**
- Smart price estimates (location-aware)
- Aisle predictions (store-specific)
- "Running low?" suggestions
- "You usually buy this now" alerts
- Auto-fill defaults from history
- Collaborative learning (cross-user)

**Integration Points:**
- Dashboard: Track item additions, show price predictions
- NextItemSuggestion: Show aisle predictions (amber badge)
- Aisle Reporting: "Found in Aisle" button (to be built)
- My Stores: Store management modal (to be built)

---

### 4. **Custom Components System**
Reusable, animated UI components with consistent design.

**Components:**
1. **CustomPanel** - Sliding panels (left/right/top/bottom)
2. **CustomKeypad** - Numeric input with animations
3. **CustomNotification** - Toast notifications (6 types, 7 positions)
4. **CustomPriceBadge** - Animated price displays
5. **CustomRadialMenu** - Circular action menu
6. **CustomSearchBar** - Animated search with suggestions
7. **CustomSwipeActions** - Swipe-to-reveal actions
8. **CustomContextMenu** - Right-click menus
9. **CustomDropdownList** - Animated dropdowns
10. **CustomConfirmModal** - Confirmation dialogs

**Design Principles:**
- Framer Motion animations
- Dark mode support
- Mobile-first responsive
- Consistent color scheme
- Accessibility (ARIA labels)

---

### 5. **Home Inventory System**
Comprehensive household item tracking (formerly "Kitchen Inventory").

**Purpose:** Track ALL household items, not just food

**Database:** Uses `inventory` table (NOT `pantry_inventory`)

**Categories:**
- Food (pantry, fridge, freezer)
- Bathroom (medicine, toiletries, first aid)
- Pet supplies (food, medication, toys)
- Cleaning supplies
- Tools & hardware
- Beauty products

**Component:** `PantryNewV2.js` (in backburner folder)  
**Route:** `/pantry-new-v2` (re-enabled)

**Features:**
- Grid/List/Map/Category views
- Location navigator with dropdown
- Filter panel (expiring, low stock, warnings)
- Expiration tracking with smart learning
- Multiple storage locations
- Visual inventory map
- Drag & drop organization
- Bulk actions

**Status:** Phase 1 & 2 Complete, needs full integration

---

### 6. **Beta Testing System**
Complete beta tester management system.

**Status:** 100% Complete & Production Ready

**Features:**
- Beta code generation
- Registration flow
- Feedback submission
- Admin dashboard
- Tester analytics
- Feature flags per tester

**Database Tables:**
- `beta_codes` - Generated beta codes
- `beta_testers` - Registered testers
- `beta_feedback` - Submitted feedback

**Routes:**
- `/admin/beta` - Admin dashboard
- `/register?beta=CODE` - Beta registration

---

### 7. **Feature Flags System**
Dynamic feature enabling/disabling per user.

**Database:** `feature_flags` table

**Flags:**
- `shopping_lists` - Shopping list functionality
- `pantry` - Pantry/inventory features
- `recipes` - Recipe book
- `meal_planner` - Meal planning
- `statistics` - Analytics dashboard
- `recipe_discovery` - Recipe search
- `activity_history` - Activity log
- `home_inventory` - Home inventory system

**Usage:**
```javascript
import { useFeatureFlags } from '../context/FeatureFlagContext';

const { hasFeature } = useFeatureFlags();
if (hasFeature('home_inventory')) {
  // Show feature
}
```

---

### 8. **Tier System**
User subscription tiers (Free, Premium, Pro).

**Database:** `user_tiers` table

**Tiers:**
- **Free:** Basic features, 3 lists, 50 items
- **Premium:** All features, unlimited lists/items
- **Pro:** Premium + priority support + beta access

---

## 📊 Database Schema

### Core Tables
- `users` - User accounts (email, password, role)
- `profiles` - User profiles (display name, preferences)
- `shopping_lists` - Shopping list metadata
- `shopping_list_items` - Items in lists
- `inventory` - Home inventory items
- `pantry_inventory` - Old pantry system (deprecated)
- `recipes` - Recipe database
- `shopping_list_recipes` - Recipes added to lists

### MDL Tables (11)
- See MDL section above

### AVE Tables (2 - need creation)
- See AVE section above

### Beta Tables (3)
- `beta_codes`, `beta_testers`, `beta_feedback`

### Admin Tables
- `feature_flags` - Feature toggles
- `user_tiers` - Subscription tiers
- `item_training` - Admin item training data

---

## 🔧 Configuration

### Environment Variables
**Backend (.env):**
```env
DATABASE_URL=postgresql://shopuser:password@postgres:5432/shopdb
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=production
PORT=3001
```

**Frontend:**
```env
REACT_APP_API_URL=http://localhost:3001
```

### Docker Compose
```yaml
services:
  frontend:
    ports: ["3006:80"]
  backend:
    ports: ["3001:3001"]
  postgres:
    ports: ["5432:5432"]
```

---

## 🚀 Deployment

### Production
- **URL:** https://shop.cloudmc.online
- **Server:** /opt/cloudmc-shop
- **Tunnel:** Cloudflare Tunnel → localhost:3006

### Commands
```bash
# SSH into server
ssh root@cup2cup

# Navigate to project
cd /opt/cloudmc-shop

# Pull latest
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Run migrations
docker exec shop_backend npm run migrate

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Database access
docker exec -it shop_postgres psql -U shopuser -d shopdb
```

---

## 🐛 Known Issues

### Critical
1. **Add Item Black Screen** - Missing database column or backend error
2. **Home Inventory Not Loading** - Pantry API/database issue

### AVE Tools (Partially Working)
3. Settings button - needs PropertiesPanel connection
4. Help button - needs HelpModal (created, needs integration)
5. Grid toggle - needs implementation
6. Resize handles - needs to be added
7. Dark mode dropdown - styling issues

### Features Needing Implementation
8. My Stores modal
9. Manage Stores functionality
10. Active List AVE integration
11. Floating Buttons AVE integration
12. Beta Tester Code generation fix
13. Move Beta features to Sidebar
14. Make Sidebar AVE-editable

---

## 📝 Development Workflow

### Adding New Features
1. Create feature branch
2. Implement frontend components
3. Create backend API routes
4. Add database migration if needed
5. Test locally
6. Commit and push
7. SSH to server, pull, rebuild
8. Run migrations
9. Test in production

### Database Migrations
```bash
# Create new migration
cd backend/migrations
touch 041_my_new_feature.sql

# Run migrations
docker exec shop_backend npm run migrate
```

### Frontend Development
```bash
cd frontend
npm start  # Runs on localhost:3000
```

### Backend Development
```bash
cd backend
npm run dev  # Runs on localhost:3001
```

---

## 🎨 Design System

### Colors
- **Primary:** Blue (#3b82f6)
- **Success:** Green (#10b981)
- **Warning:** Yellow/Amber (#f59e0b)
- **Error:** Red (#ef4444)
- **Purple:** (#8b5cf6)

### Animations
- **Duration:** 200-300ms (fast), 500ms (normal)
- **Easing:** Spring (stiffness: 300-400, damping: 20-30)
- **Library:** Framer Motion

### Responsive Breakpoints
- **Mobile:** < 640px
- **Tablet:** 640px - 1024px
- **Desktop:** > 1024px

---

## 📚 Documentation

### Main Docs
- `README.md` - Project overview
- `SYSTEM_OVERVIEW.md` - This file
- `ISSUES_AND_FIXES.md` - Known issues and fixes
- `RUN_THESE_FIXES.md` - Database fix commands

### Guides
- `docs/guides/beta-system/` - Beta testing system
- `docs/guides/aes-editor/` - AES/AVE editor system
- `docs/guides/admin-tools/` - Admin tools
- `docs/guides/custom-components/` - Custom components
- `docs/guides/system/` - Feature flags, tier system

### Reference
- `docs/reference/COMPLETE_FEATURE_SUMMARY.md` - All features
- `docs/reference/FILES-OVERVIEW.md` - File structure

---

## 🔐 Security

### Authentication
- JWT tokens (7-day expiry)
- bcrypt password hashing (10 rounds)
- Rate limiting (5000 req/15min)
- Helmet.js security headers
- CORS protection

### Authorization
- Role-based access (user, admin)
- Feature flags per user
- Tier-based restrictions

---

## 🎯 Roadmap

### Immediate (This Week)
- Fix black screen issues
- Complete AVE database tables
- Build My Stores modal
- Fix Beta Tester Code generation

### Short Term (This Month)
- Complete MDL integration
- Aisle reporting feature
- Make all components AVE-editable
- Move Beta features to Sidebar

### Long Term (Next Quarter)
- Receipt scanner
- Barcode scanning
- Meal planning integration
- Recipe suggestions based on inventory
- Mobile app (React Native)

---

## 🆘 Troubleshooting

### Black Screen
1. Check browser console (F12)
2. Check backend logs: `docker-compose logs backend`
3. Check database: `docker exec -it shop_postgres psql -U shopuser -d shopdb`
4. Verify ErrorBoundary is working

### Database Issues
```bash
# Check tables
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\dt"

# Check specific table
docker exec -i shop_postgres psql -U shopuser -d shopdb -c "\d shopping_list_items"

# Run migrations
docker exec shop_backend npm run migrate
```

### Docker Issues
```bash
# Restart all
docker-compose restart

# Rebuild all
docker-compose up -d --build

# Reset everything
docker-compose down -v
docker-compose up -d --build
docker exec shop_backend npm run migrate
```

---

**For more details, see individual system documentation in `docs/guides/`**
