# 🚀 Listzy.app Deployment Workflow

## 📋 **Standard Deployment Process**

### **Step 1: Local Git Commit**
```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: your feature description"

# Push to remote repository
git push origin main
```

### **Step 2: Server Update**
```bash
# SSH to server (if not already connected)
ssh your-server

# Navigate to project directory
cd /opt/cloudmc-shop

# Run update script
./update-server.sh
```

---

## 🔧 **What update-server.sh Does**

The script automatically:
1. Pulls latest changes from git
2. Installs any new npm dependencies
3. Builds the frontend (if needed)
4. Restarts backend service
5. Restarts frontend service

---

## ⚠️ **Important Notes**

- **Always commit and push locally FIRST** before running update script
- Services run with **npm** (not pm2)
- Site URL: **https://listzy.app**
- Server path: **/opt/cloudmc-shop**
- Update script: **./update-server.sh**

---

## 📝 **Git Commit Message Conventions**

Use conventional commit format:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat: Add recipe-inventory comparison feature"
git commit -m "fix: Resolve blank page issue with FeatureFlagProvider"
git commit -m "docs: Update deployment workflow documentation"
```

---

## 🔍 **Verification Steps**

After deployment, verify:

1. **Check site loads:** Visit https://listzy.app
2. **Check console:** Open browser DevTools, look for errors
3. **Test new features:** Verify your changes work
4. **Check backend logs:** SSH to server and check logs if needed

---

## 🆘 **Troubleshooting**

### **If site is blank after update:**
```bash
# On server
cd /opt/cloudmc-shop

# Check if services are running
ps aux | grep node

# Check frontend logs
# (location depends on how npm start is run)

# Check backend logs
# (location depends on how npm start is run)

# Restart services manually if needed
# Stop current processes (Ctrl+C or kill)
# Then restart
cd backend && npm start &
cd frontend && npm start &
```

### **If git push fails:**
```bash
# Pull latest changes first
git pull origin main

# Resolve any conflicts
# Then push again
git push origin main
```

### **If update-server.sh fails:**
```bash
# Check script permissions
ls -la update-server.sh

# Make executable if needed
chmod +x update-server.sh

# Run with bash explicitly
bash update-server.sh
```

---

## 📊 **Quick Reference**

| Action | Command |
|--------|---------|
| Add all changes | `git add .` |
| Commit | `git commit -m "message"` |
| Push | `git push origin main` |
| SSH to server | `ssh your-server` |
| Navigate to project | `cd /opt/cloudmc-shop` |
| Update server | `./update-server.sh` |
| Check running processes | `ps aux \| grep node` |

---

## 🎯 **Current Deployment (Recipe Book System)**

**To deploy the Recipe Book System:**

```bash
# 1. Commit all changes
git add .
git commit -m "feat: Complete Recipe Book System with Kitchen Inventory Integration

- Added database migration (028_recipe_enhancements.sql)
- Created recipe-inventory comparison service
- Added 7 new API endpoints
- Created 5 new React components
- Built RecipesNew page with filtering
- Fixed FeatureFlagProvider integration
- Disabled mobile bottom navigation"

# 2. Push to remote
git push origin main

# 3. SSH to server and update
ssh your-server
cd /opt/cloudmc-shop
./update-server.sh

# 4. Run database migration (if not automated)
cd backend
psql -U postgres -d shopdb -f migrations/028_recipe_enhancements.sql
```

---

## ✅ **Deployment Checklist**

Before deploying:
- [ ] All changes committed locally
- [ ] Code tested locally
- [ ] No console errors
- [ ] Git push successful
- [ ] SSH access to server available

After deploying:
- [ ] Site loads without errors
- [ ] New features work as expected
- [ ] No broken functionality
- [ ] Database migration ran (if applicable)
- [ ] Backend logs show no errors

---

**Remember: Local commit → Push → Server update!** 🚀
