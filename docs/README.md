# Documentation Organization

This folder contains all project documentation organized by purpose.

## 📁 Folder Structure

### `/guides` - Component & Feature Guides
**Active documentation for using components and features**

- `ADMIN_TRAINING_GUIDE.md` - Admin training system guide
- `CUSTOM_NOTIFICATION_GUIDE.md` - CustomNotification component usage
- `CUSTOM_PRICE_BADGE_GUIDE.md` - CustomPriceBadge component usage
- `CUSTOM_COMPONENTS_INTEGRATION.md` - Integration examples for all custom components

**Purpose:** Reference guides for developers and admins

---

### `/implementation` - Active Implementation Tracking
**Current progress and deployment status**

- `INTEGRATION_PROGRESS.md` - **MAIN TRACKER** - Current integration progress
- `DEPLOYMENT_SUCCESS.md` - Latest deployment status and verification
- `MDL_IMPLEMENTATION.md` - MDL system implementation plan

**Purpose:** Track ongoing work and deployment status

---

### `/archive` - Historical & Planning Documents
**Old roadmaps and completed planning docs**

- `ADMIN_TRAINING_SYSTEM.md` - Original admin training planning
- `PRICE_LEARNING_SYSTEM.md` - Original price learning planning
- `IMPLEMENTATION_ROADMAP.md` - Original implementation roadmap
- `HOME_INVENTORY_ROADMAP.md` - Original inventory planning
- `FEATURES_TO_ADD.md` - Original feature wishlist

**Purpose:** Historical reference, not actively maintained

---

## 🎯 Quick Reference

### For Developers
**Start here:**
1. `implementation/INTEGRATION_PROGRESS.md` - See what's done and what's next
2. `guides/CUSTOM_COMPONENTS_INTEGRATION.md` - Learn how to use custom components
3. `guides/CUSTOM_NOTIFICATION_GUIDE.md` - Notification system examples

### For Admins
**Start here:**
1. `guides/ADMIN_TRAINING_GUIDE.md` - Admin features and training
2. `implementation/DEPLOYMENT_SUCCESS.md` - Latest deployment info

### For Planning
**Start here:**
1. `implementation/INTEGRATION_PROGRESS.md` - Current status
2. `implementation/MDL_IMPLEMENTATION.md` - MDL system plan

---

## 📝 File Naming Convention

- **UPPERCASE_WITH_UNDERSCORES.md** - Documentation files
- **Descriptive names** - Clear purpose from filename
- **No dates in filenames** - Use git history for dates

---

## 🔄 Maintenance

### Active Files (Update Regularly)
- ✅ `implementation/INTEGRATION_PROGRESS.md`
- ✅ `implementation/DEPLOYMENT_SUCCESS.md`

### Reference Files (Update When Changed)
- 📚 All files in `/guides`
- 📚 `implementation/MDL_IMPLEMENTATION.md`

### Archive Files (Read-Only)
- 📦 All files in `/archive`

---

## 🗂️ Root Directory

Keep root clean! Only these files should be in project root:
- `README.md` - Project overview
- `package.json` - Dependencies
- `docker-compose.yml` - Docker config
- `.gitignore` - Git ignore rules
- `.env.example` - Environment template

**All documentation goes in `/docs`!**
