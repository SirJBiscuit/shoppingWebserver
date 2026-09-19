# Preview Mode Integration Guide

**Test your app as different user roles without logging out**

---

## 🎯 **Overview**

Preview Mode allows admins to test the app as different user roles (user/beta/admin) without logging out. This is essential for:

- Testing role-based features
- Verifying UI changes for different users
- QA and debugging
- Demonstrating features to stakeholders

---

## 📦 **Components Created**

1. **PreviewModePanel.js** - Floating UI panel
2. **PreviewModeContext.js** - Global state management

---

## 🔧 **Step 1: Add Context Provider**

Wrap your app with the `PreviewModeProvider`:

```javascript
// In App.js or your root component
import { PreviewModeProvider } from './contexts/PreviewModeContext';

function App() {
  const [user, setUser] = useState(null);
  
  return (
    <PreviewModeProvider user={user}>
      {/* Your app components */}
      <Router>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          {/* ... other routes */}
        </Routes>
      </Router>
    </PreviewModeProvider>
  );
}
```

---

## 🔧 **Step 2: Add Preview Panel**

Add the `PreviewModePanel` to your main layout:

```javascript
// In Dashboard.js or main layout component
import PreviewModePanel from '../components/PreviewModePanel';
import { usePreviewMode } from '../contexts/PreviewModeContext';

function Dashboard() {
  const { effectiveRole, enterPreviewMode } = usePreviewMode();
  
  return (
    <div>
      {/* Your dashboard content */}
      
      {/* Preview Mode Panel (only visible to admins) */}
      <PreviewModePanel
        currentUser={user}
        onRoleChange={(role) => {
          console.log('Previewing as:', role);
        }}
      />
    </div>
  );
}
```

---

## 🔧 **Step 3: Use Role Checks**

Replace direct role checks with preview-aware checks:

### **Before (without preview mode):**

```javascript
function AdminPanel() {
  const { user } = useAuth();
  
  // Direct role check
  if (user.role !== 'admin') {
    return <div>Access Denied</div>;
  }
  
  return <div>Admin Content</div>;
}
```

### **After (with preview mode):**

```javascript
function AdminPanel() {
  const { isAdmin } = usePreviewMode();
  
  // Preview-aware role check
  if (!isAdmin()) {
    return <div>Access Denied</div>;
  }
  
  return <div>Admin Content</div>;
}
```

---

## 🔧 **Step 4: Conditional Rendering**

Use the `canAccess` helper for feature flags:

```javascript
import { usePreviewMode } from '../contexts/PreviewModeContext';

function Sidebar() {
  const { canAccess, effectiveRole } = usePreviewMode();
  
  return (
    <nav>
      {/* Always visible */}
      <NavItem to="/dashboard">Dashboard</NavItem>
      
      {/* Beta and Admin only */}
      {canAccess('beta') && (
        <NavItem to="/beta-features">Beta Features</NavItem>
      )}
      
      {/* Admin only */}
      {canAccess('admin') && (
        <NavItem to="/admin">Admin Panel</NavItem>
      )}
      
      {/* Show current role */}
      <div className="text-xs text-gray-500 mt-4">
        Role: {effectiveRole}
      </div>
    </nav>
  );
}
```

---

## 🔧 **Step 5: API Requests**

**Important:** Preview mode only affects the UI. Backend requests still use the actual user role.

```javascript
import { usePreviewMode } from '../contexts/PreviewModeContext';

function DataComponent() {
  const { effectiveRole, actualRole, isPreviewActive } = usePreviewMode();
  
  const fetchData = async () => {
    // Always use actualRole for API requests
    const response = await fetch('/api/data', {
      headers: {
        'Authorization': `Bearer ${token}`,
        // Backend uses actual role for permissions
      }
    });
    
    const data = await response.json();
    
    // Filter data based on effective role for UI display
    if (effectiveRole === 'user') {
      return data.filter(item => !item.adminOnly);
    }
    
    return data;
  };
  
  return (
    <div>
      {isPreviewActive && (
        <div className="bg-yellow-100 p-2 text-sm">
          ⚠️ Preview Mode: UI shows {effectiveRole} view, but API uses {actualRole} permissions
        </div>
      )}
      {/* Your component */}
    </div>
  );
}
```

---

## 📊 **Context API Reference**

### **State**

```javascript
const {
  // Current preview role (null if not previewing)
  previewRole,
  
  // Whether preview mode is active
  isPreviewActive,
  
  // Effective role (preview role or actual role)
  effectiveRole,
  
  // User's actual role (never changes)
  actualRole,
  
  // Whether user can use preview mode (admin only)
  canUsePreview
} = usePreviewMode();
```

### **Actions**

```javascript
const {
  // Enter preview mode as specific role
  enterPreviewMode,  // (role: string) => void
  
  // Exit preview mode
  exitPreviewMode    // () => void
} = usePreviewMode();
```

### **Helpers**

```javascript
const {
  // Check if effective role is 'user'
  isUser,      // () => boolean
  
  // Check if effective role is 'beta' or 'admin'
  isBeta,      // () => boolean
  
  // Check if effective role is 'admin'
  isAdmin,     // () => boolean
  
  // Check if can access feature requiring specific role
  canAccess    // (requiredRole: string) => boolean
} = usePreviewMode();
```

---

## 🎨 **UI Features**

### **Preview Mode Banner**

When preview mode is active, a banner appears at the top:

- **Yellow/Orange gradient** background
- Shows current preview role
- **"Exit Preview"** button
- Slides in/out with animation

### **Floating Button**

- **Bottom-right corner** of screen
- **Eye icon** (changes to EyeOff when previewing)
- **Indigo** when inactive, **Yellow/Orange** when active
- Hover animation

### **Role Selection Panel**

- **Slides up** from floating button
- Shows all 3 roles with icons:
  - 👤 **User** (Blue)
  - ⭐ **Beta Tester** (Purple)
  - 🛡️ **Admin** (Red)
- Highlights current role
- Shows active preview role
- Quick exit button

---

## 🔒 **Security Notes**

1. **UI Only**: Preview mode only affects what the user sees, not backend permissions
2. **Admin Only**: Only users with `role === 'admin'` can use preview mode
3. **Session Storage**: Preview state persists across page refreshes but not browser sessions
4. **API Requests**: Always use `actualRole` for backend requests, never `effectiveRole`

---

## ✅ **Testing Checklist**

- [ ] Preview mode button only visible to admins
- [ ] Can switch between all 3 roles
- [ ] Banner appears when preview active
- [ ] UI updates based on preview role
- [ ] Can exit preview mode
- [ ] Preview state persists on page refresh
- [ ] API requests use actual role
- [ ] Non-admins cannot access preview mode

---

## 📝 **Example: Complete Integration**

```javascript
// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { PreviewModeProvider } from './contexts/PreviewModeContext';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import BetaFeatures from './pages/BetaFeatures';

function App() {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Load user from auth
    const loadUser = async () => {
      const userData = await fetchCurrentUser();
      setUser(userData);
    };
    loadUser();
  }, []);
  
  if (!user) return <div>Loading...</div>;
  
  return (
    <PreviewModeProvider user={user}>
      <Router>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/beta" element={<BetaFeatures />} />
        </Routes>
      </Router>
    </PreviewModeProvider>
  );
}

export default App;
```

```javascript
// Dashboard.js
import React from 'react';
import PreviewModePanel from '../components/PreviewModePanel';
import { usePreviewMode } from '../contexts/PreviewModeContext';
import Sidebar from '../components/Sidebar';

function Dashboard() {
  const { effectiveRole, isPreviewActive } = usePreviewMode();
  
  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <main className="flex-1 p-6">
        {isPreviewActive && (
          <div className="mb-4 p-3 bg-yellow-100 rounded-lg">
            🔍 Preview Mode Active - Viewing as: <strong>{effectiveRole}</strong>
          </div>
        )}
        
        <h1>Dashboard</h1>
        {/* Your dashboard content */}
      </main>
      
      {/* Preview Mode Panel (admin only) */}
      <PreviewModePanel
        currentUser={user}
        onRoleChange={(role) => {
          console.log('Now previewing as:', role);
        }}
      />
    </div>
  );
}

export default Dashboard;
```

```javascript
// Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { usePreviewMode } from '../contexts/PreviewModeContext';
import { Home, Shield, Star } from 'lucide-react';

function Sidebar() {
  const { canAccess, effectiveRole } = usePreviewMode();
  
  return (
    <aside className="w-64 bg-gray-800 text-white p-4">
      <nav className="space-y-2">
        <Link to="/dashboard" className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded">
          <Home className="w-5 h-5" />
          Dashboard
        </Link>
        
        {canAccess('beta') && (
          <Link to="/beta" className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded">
            <Star className="w-5 h-5" />
            Beta Features
          </Link>
        )}
        
        {canAccess('admin') && (
          <Link to="/admin" className="flex items-center gap-2 p-2 hover:bg-gray-700 rounded">
            <Shield className="w-5 h-5" />
            Admin Panel
          </Link>
        )}
      </nav>
      
      <div className="mt-8 pt-4 border-t border-gray-700">
        <div className="text-xs text-gray-400">Current Role</div>
        <div className="text-sm font-medium capitalize">{effectiveRole}</div>
      </div>
    </aside>
  );
}

export default Sidebar;
```

---

## 🚀 **Ready to Use!**

Preview Mode is now fully integrated! Admins can:

1. ✅ Click the floating eye button
2. ✅ Select a role to preview
3. ✅ See UI changes instantly
4. ✅ Test role-based features
5. ✅ Exit preview mode anytime

**Next:** Implement Custom Modular Sidebar! 🎨
