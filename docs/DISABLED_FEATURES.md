# Disabled Features & Routes

This document tracks all features and routes that have been temporarily disabled during the migration to new systems (AES, CFS, Beta System).

**Last Updated:** September 19, 2026

---

## 🚫 Disabled Routes

### Backburner Routes (Legacy Code)
These routes use old components from the `backburner` folder and will be rebuilt with new systems.

| Route | Component | Status | Reason | Rebuild With |
|-------|-----------|--------|--------|--------------|
| `/recipes` (old) | `RecipesNew` | ❌ Disabled | Backburner component | CFS + AES |
| `/pantry-new` | `PantryNewV2` | ❌ Disabled | Backburner component | CFS + AES |
| `/pantry-old` | `PantryNew` | ❌ Disabled | Backburner component | CFS + AES |
| `/customize` | `CustomizationHub` | ❌ Disabled | Replaced by AES System | AES Editor |

**Current Active:**
- `/recipes` → Using current `Recipes` component (not backburner)
- `/pantry` → Using `PantryEnhanced` (current version)

---

### Feature Routes (To Be Rebuilt)
These features will be completely rebuilt using the new architecture.

| Route | Feature | Status | Reason | Rebuild With |
|-------|---------|--------|--------|--------------|
| `/meal-plan` | Meal Prep/Calendar | ❌ Disabled | Will rebuild with new systems | CFS + AES |
| `/stats` | Statistics Dashboard | ❌ Disabled | Will rebuild with new systems | CFS + AES |
| `/discover` | Recipe Discovery | ❌ Disabled | Will rebuild with new systems | CFS + AES |
| `/history` | Activity/History | ❌ Disabled | Will rebuild with new systems | CFS + AES |

---

### Premium/Subscription Routes (Not Ready)
These routes are disabled because the features aren't fully implemented yet.

| Route | Feature | Status | Reason | Next Steps |
|-------|---------|--------|--------|------------|
| `/subscription` | Subscription Management | ❌ Disabled | Not fully implemented | Complete Stripe integration |
| `/premium` | Premium Features | ❌ Disabled | Not fully implemented | Define premium tier features |

---

## 🔧 Disabled Components

### Admin Components

| Component | Location | Status | Reason | Replacement |
|-----------|----------|--------|--------|-------------|
| `LiveEditorOverlay` | `backburner/components/` | ❌ Disabled | Replaced by AES | AES Visual Editor |
| `DashboardEditor` | `backburner/components/` | ❌ Disabled | Replaced by AES | AES Visual Editor |
| `UserManagement` | `backburner/components/` | ❌ Disabled | Old version | UserManagementCFS (new) |

**Note:** AdminToolbar no longer shows "Dashboard Editor" button - replaced by AES toggle.

---

## ✅ Active Routes (Production Ready)

### Core Routes
- `/` - Dashboard ✅
- `/login` - Login ✅
- `/register` - Register ✅
- `/recipes` - Recipes (current version) ✅
- `/pantry` - Pantry Enhanced ✅
- `/staging` - Staging Area ✅
- `/settings` - Settings ✅

### Admin Routes
- `/admin` - Admin Dashboard ✅
- `/admin/customize` - Admin Customization ✅
- `/admin/training` - Admin Training ✅
- `/admin/beta` - Beta Dashboard ✅
- `/admin/icons` - Icon Upload ✅
- `/icons` - Icon Gallery ✅

---

## 📋 Rebuild Priority

### Phase 1: High Priority (Next Sprint)
1. **Statistics Dashboard** (`/stats`)
   - User analytics
   - Shopping trends
   - Budget tracking
   - Build with CFS components

2. **Activity/History** (`/history`)
   - Shopping history
   - Item history
   - Changes log
   - Build with CFS components

### Phase 2: Medium Priority
3. **Recipe Discovery** (`/discover`)
   - Recipe search
   - Trending recipes
   - Recommendations
   - Build with CFS + Recipe API

4. **Meal Planning** (`/meal-plan`)
   - Meal calendar
   - Meal prep
   - Shopping list integration
   - Build with CFS + Calendar component

### Phase 3: Low Priority
5. **Premium Features** (`/premium`, `/subscription`)
   - Subscription management
   - Premium tier features
   - Payment integration
   - Requires Stripe setup completion

---

## 🗂️ File Locations

### Disabled Components (Backburner)
```
frontend/src/backburner/
├── components/
│   ├── CustomizationHub.js
│   ├── DashboardEditor.js
│   ├── LiveEditorOverlay.js
│   └── UserManagement.js
└── pages/
    ├── RecipesNew.js
    ├── PantryNew.js
    └── PantryNewV2.js
```

### Active Components (Current)
```
frontend/src/
├── components/
│   ├── admin/ (CFS components)
│   ├── beta/ (Beta system)
│   └── editor/ (AES components)
└── pages/
    ├── Dashboard.js ✅
    ├── Recipes.js ✅
    ├── PantryEnhanced.js ✅
    └── Admin.js ✅
```

---

## 📝 Notes

### Why Disable?
1. **Clean Build** - Remove dependencies on backburner components
2. **New Architecture** - Rebuild with AES and CFS systems
3. **Better UX** - Modern, consistent user experience
4. **Maintainability** - Easier to maintain and extend

### Migration Strategy
1. Disable old routes ✅
2. Build new CFS components
3. Integrate with AES editor
4. Test thoroughly
5. Re-enable with new implementation
6. Remove backburner code

### Testing Checklist
Before re-enabling any route:
- [ ] Component built with CFS
- [ ] Integrated with AES editor
- [ ] Mobile responsive
- [ ] Dark mode support
- [ ] Loading states
- [ ] Error handling
- [ ] User testing complete

---

## 🔄 Change Log

### September 19, 2026
- ❌ Disabled `/meal-plan` (Meal Prep/Calendar)
- ❌ Disabled `/stats` (Statistics)
- ❌ Disabled `/discover` (Recipe Discovery)
- ❌ Disabled `/history` (Activity)
- ❌ Disabled `/recipes` (RecipesNew from backburner)
- ❌ Disabled `/pantry-new` (PantryNewV2 from backburner)
- ❌ Disabled `/pantry-old` (PantryNew from backburner)
- ❌ Disabled `/customize` (CustomizationHub from backburner)
- ❌ Disabled `/subscription` (Not ready)
- ❌ Disabled `/premium` (Not ready)
- ❌ Disabled `LiveEditorOverlay` component (Replaced by AES)
- ✅ Using current `Recipes` component for `/recipes`
- ✅ Using `PantryEnhanced` for `/pantry`

---

**Status Summary:**
- **Disabled Routes:** 10
- **Active Routes:** 13
- **Backburner Components:** 7
- **Ready for Rebuild:** 4 features (Phase 1-2)
