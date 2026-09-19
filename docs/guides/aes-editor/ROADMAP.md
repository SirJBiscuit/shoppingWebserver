# AES Next Features Roadmap

**User Preview, Modular Sidebar, Login CFS, User Management**

---

## 🎯 **Overview**

After completing Phases 1-5 of the AES Visual Editor, we're now adding:

1. **Preview as Different Users** - Test UI as different roles
2. **Custom Modular Sidebar** - Role-based page visibility
3. **Login Screen CFS** - Customizable login page
4. **Admin User Management CFS** - User management interface

---

## 📋 **Feature 1: Preview as Different Users**

### **Purpose**
Allow admins to preview the app as different user roles without logging out.

### **Features**
- ✅ Switch between roles (user/beta tester/admin)
- ✅ See UI changes based on role
- ✅ Test role-based features
- ✅ Floating preview mode indicator
- ✅ Quick role switcher
- ✅ Exit preview mode

### **Implementation**

**Component:** `PreviewModePanel.js`

```javascript
import React, { useState } from 'react';
import { Eye, User, Shield, Star } from 'lucide-react';

const ROLES = [
  { id: 'user', name: 'Regular User', icon: User, color: 'blue' },
  { id: 'beta', name: 'Beta Tester', icon: Star, color: 'purple' },
  { id: 'admin', name: 'Administrator', icon: Shield, color: 'red' }
];

const PreviewModePanel = ({ currentUser, onRoleChange }) => {
  const [previewRole, setPreviewRole] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const enterPreviewMode = (role) => {
    setPreviewRole(role);
    onRoleChange(role);
  };
  
  const exitPreviewMode = () => {
    setPreviewRole(null);
    onRoleChange(currentUser.role);
  };
  
  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 p-3 bg-indigo-600 text-white rounded-full shadow-lg z-50"
      >
        <Eye className="w-5 h-5" />
      </button>
      
      {/* Preview Panel */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-indigo-500 z-50">
          <div className="p-4">
            <h3 className="font-bold text-lg mb-3">Preview as User</h3>
            
            {previewRole && (
              <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-400">
                  🔍 Previewing as: <strong>{previewRole.name}</strong>
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => enterPreviewMode(role)}
                  disabled={previewRole?.id === role.id}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    previewRole?.id === role.id
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <role.icon className={`w-5 h-5 text-${role.color}-500`} />
                  <span className="font-medium">{role.name}</span>
                </button>
              ))}
            </div>
            
            {previewRole && (
              <button
                onClick={exitPreviewMode}
                className="w-full mt-3 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
              >
                Exit Preview Mode
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default PreviewModePanel;
```

### **Integration**
```javascript
// In App.js or Dashboard.js
import PreviewModePanel from './components/PreviewModePanel';

const [effectiveRole, setEffectiveRole] = useState(user.role);

<PreviewModePanel
  currentUser={user}
  onRoleChange={(role) => setEffectiveRole(role)}
/>

// Use effectiveRole instead of user.role for conditional rendering
{effectiveRole === 'admin' && <AdminFeature />}
```

---

## 📋 **Feature 2: Custom Modular Sidebar**

### **Purpose**
Allow admins to configure which pages are visible to different user roles.

### **Features**
- ✅ Role-based page visibility
- ✅ Admin controls for sidebar
- ✅ Beta tester access levels
- ✅ User-specific pages
- ✅ Drag-and-drop page ordering
- ✅ Enable/disable pages per role

### **Database Schema**

```sql
-- Sidebar configuration table
CREATE TABLE sidebar_pages (
  id SERIAL PRIMARY KEY,
  page_name VARCHAR(100) NOT NULL,
  page_path VARCHAR(255) NOT NULL,
  icon_name VARCHAR(50),
  display_order INTEGER DEFAULT 0,
  enabled_for_user BOOLEAN DEFAULT true,
  enabled_for_beta BOOLEAN DEFAULT true,
  enabled_for_admin BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default pages
INSERT INTO sidebar_pages (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin) VALUES
('Dashboard', '/dashboard', 'Home', 1, true, true, true),
('Shopping Lists', '/lists', 'ShoppingCart', 2, true, true, true),
('Recipes', '/recipes', 'Book', 3, true, true, true),
('Budget', '/budget', 'DollarSign', 4, true, true, true),
('Analytics', '/analytics', 'BarChart', 5, false, true, true),
('Admin Panel', '/admin', 'Shield', 6, false, false, true),
('Beta Features', '/beta', 'Star', 7, false, true, true);
```

### **Component:** `SidebarConfigurator.js`

```javascript
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, Eye, EyeOff } from 'lucide-react';

const SidebarConfigurator = () => {
  const [pages, setPages] = useState([]);
  
  useEffect(() => {
    loadPages();
  }, []);
  
  const loadPages = async () => {
    const response = await fetch('/api/sidebar/pages');
    const data = await response.json();
    setPages(data);
  };
  
  const toggleRole = async (pageId, role) => {
    await fetch(`/api/sidebar/pages/${pageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [`enabled_for_${role}`]: !pages.find(p => p.id === pageId)[`enabled_for_${role}`] })
    });
    loadPages();
  };
  
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(pages);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    setPages(items);
    
    // Update order in backend
    await fetch('/api/sidebar/pages/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pages: items.map((p, i) => ({ id: p.id, order: i })) })
    });
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Sidebar Configuration</h2>
      
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="pages">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {pages.map((page, index) => (
                <Draggable key={page.id} draggableId={String(page.id)} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border"
                    >
                      <div {...provided.dragHandleProps}>
                        <GripVertical className="w-5 h-5 text-gray-400" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium">{page.page_name}</div>
                        <div className="text-sm text-gray-500">{page.page_path}</div>
                      </div>
                      
                      <div className="flex gap-2">
                        {['user', 'beta', 'admin'].map((role) => (
                          <button
                            key={role}
                            onClick={() => toggleRole(page.id, role)}
                            className={`px-3 py-1 rounded text-sm ${
                              page[`enabled_for_${role}`]
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {page[`enabled_for_${role}`] ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default SidebarConfigurator;
```

---

## 📋 **Feature 3: Login Screen CFS**

### **Purpose**
Allow admins to customize the login screen using the CFS system.

### **Features**
- ✅ Customizable logo
- ✅ Custom background image/color
- ✅ Custom welcome text
- ✅ Branding colors
- ✅ Social login buttons
- ✅ Footer text
- ✅ Live preview

### **Component:** `LoginScreenEditor.js`

```javascript
import React, { useState } from 'react';
import { useEditor } from '../../contexts/EditorContext';
import WidgetRenderer from '../cfs/WidgetRenderer';

const DEFAULT_LOGIN_CONFIG = {
  logo: '/logo.png',
  backgroundType: 'gradient',
  backgroundValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  welcomeTitle: 'Welcome Back',
  welcomeSubtitle: 'Sign in to continue to your account',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  showSocialLogin: true,
  footerText: '© 2024 Your Company. All rights reserved.'
};

const LoginScreenEditor = () => {
  const { aesManager } = useEditor();
  const [config, setConfig] = useState(DEFAULT_LOGIN_CONFIG);
  
  const updateConfig = (key, value) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    aesManager.saveLoginConfig(newConfig);
  };
  
  return (
    <div className="grid grid-cols-2 gap-6 h-screen">
      {/* Editor Panel */}
      <div className="p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <h2 className="text-2xl font-bold mb-6">Login Screen Editor</h2>
        
        <div className="space-y-6">
          {/* Logo */}
          <div>
            <label className="block text-sm font-medium mb-2">Logo URL</label>
            <input
              type="text"
              value={config.logo}
              onChange={(e) => updateConfig('logo', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          {/* Background */}
          <div>
            <label className="block text-sm font-medium mb-2">Background Type</label>
            <select
              value={config.backgroundType}
              onChange={(e) => updateConfig('backgroundType', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="gradient">Gradient</option>
              <option value="image">Image</option>
              <option value="color">Solid Color</option>
            </select>
          </div>
          
          {config.backgroundType === 'gradient' && (
            <div>
              <label className="block text-sm font-medium mb-2">Gradient CSS</label>
              <input
                type="text"
                value={config.backgroundValue}
                onChange={(e) => updateConfig('backgroundValue', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          )}
          
          {/* Welcome Text */}
          <div>
            <label className="block text-sm font-medium mb-2">Welcome Title</label>
            <input
              type="text"
              value={config.welcomeTitle}
              onChange={(e) => updateConfig('welcomeTitle', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Welcome Subtitle</label>
            <input
              type="text"
              value={config.welcomeSubtitle}
              onChange={(e) => updateConfig('welcomeSubtitle', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          
          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Primary Color</label>
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => updateConfig('primaryColor', e.target.value)}
                className="w-full h-10 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Secondary Color</label>
              <input
                type="color"
                value={config.secondaryColor}
                onChange={(e) => updateConfig('secondaryColor', e.target.value)}
                className="w-full h-10 rounded-lg"
              />
            </div>
          </div>
          
          {/* Social Login */}
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.showSocialLogin}
                onChange={(e) => updateConfig('showSocialLogin', e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Show Social Login Buttons</span>
            </label>
          </div>
          
          {/* Footer */}
          <div>
            <label className="block text-sm font-medium mb-2">Footer Text</label>
            <input
              type="text"
              value={config.footerText}
              onChange={(e) => updateConfig('footerText', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
      </div>
      
      {/* Preview Panel */}
      <div
        className="flex items-center justify-center"
        style={{ background: config.backgroundValue }}
      >
        <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-2xl">
          <img src={config.logo} alt="Logo" className="h-12 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold text-center mb-2" style={{ color: config.primaryColor }}>
            {config.welcomeTitle}
          </h1>
          <p className="text-center text-gray-600 mb-8">{config.welcomeSubtitle}</p>
          
          <form className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 border rounded-lg"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 border rounded-lg"
            />
            <button
              type="submit"
              className="w-full py-3 text-white rounded-lg font-medium"
              style={{ background: config.primaryColor }}
            >
              Sign In
            </button>
          </form>
          
          {config.showSocialLogin && (
            <div className="mt-6 space-y-2">
              <button className="w-full py-3 border rounded-lg flex items-center justify-center gap-2">
                <span>Continue with Google</span>
              </button>
              <button className="w-full py-3 border rounded-lg flex items-center justify-center gap-2">
                <span>Continue with GitHub</span>
              </button>
            </div>
          )}
          
          <p className="text-center text-xs text-gray-500 mt-8">{config.footerText}</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreenEditor;
```

---

## 📋 **Feature 4: Admin User Management CFS**

### **Purpose**
Provide a visual interface for managing users, roles, and permissions.

### **Features**
- ✅ User list with search/filter
- ✅ Role assignment (user/beta/admin)
- ✅ Enable/disable users
- ✅ View user activity
- ✅ Bulk actions
- ✅ User details panel

### **Component:** `UserManagementCFS.js`

```javascript
import React, { useState, useEffect } from 'react';
import { Search, Filter, UserPlus, Shield, Star, User, Ban, Check } from 'lucide-react';

const UserManagementCFS = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  const loadUsers = async () => {
    const response = await fetch('/api/admin/users');
    const data = await response.json();
    setUsers(data);
  };
  
  const updateUserRole = async (userId, newRole) => {
    await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    });
    loadUsers();
  };
  
  const toggleUserStatus = async (userId, enabled) => {
    await fetch(`/api/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled })
    });
    loadUsers();
  };
  
  const filteredUsers = users
    .filter(u => u.email.toLowerCase().includes(searchTerm.toLowerCase()) || u.username?.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter(u => roleFilter === 'all' || u.role === roleFilter);
  
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return Shield;
      case 'beta': return Star;
      default: return User;
    }
  };
  
  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'red';
      case 'beta': return 'purple';
      default: return 'blue';
    }
  };
  
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">User Management</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg">
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="beta">Beta Testers</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      
      {/* User Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredUsers.map((user) => {
              const RoleIcon = getRoleIcon(user.role);
              const roleColor = getRoleColor(user.role);
              
              return (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium">{user.username || user.email}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 bg-${roleColor}-100 text-${roleColor}-700 rounded-full text-sm`}>
                      <RoleIcon className="w-4 h-4" />
                      {user.role}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.enabled ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <Check className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <Ban className="w-4 h-4" />
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className="px-2 py-1 text-sm border rounded"
                      >
                        <option value="user">User</option>
                        <option value="beta">Beta</option>
                        <option value="admin">Admin</option>
                      </select>
                      
                      <button
                        onClick={() => toggleUserStatus(user.id, !user.enabled)}
                        className={`px-3 py-1 text-sm rounded ${
                          user.enabled
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.enabled ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mt-6">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{users.filter(u => u.role === 'user').length}</div>
          <div className="text-sm text-gray-600">Users</div>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{users.filter(u => u.role === 'beta').length}</div>
          <div className="text-sm text-gray-600">Beta Testers</div>
        </div>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{users.filter(u => u.role === 'admin').length}</div>
          <div className="text-sm text-gray-600">Admins</div>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{users.filter(u => u.enabled).length}</div>
          <div className="text-sm text-gray-600">Active</div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementCFS;
```

---

## 🚀 **Implementation Order**

### **Phase 1: Preview Mode**
1. Create `PreviewModePanel.js`
2. Add to Dashboard
3. Test role switching
4. Verify UI changes

### **Phase 2: Modular Sidebar**
1. Create database migration
2. Build `SidebarConfigurator.js`
3. Update Sidebar component to read from DB
4. Add drag-and-drop ordering
5. Test role-based visibility

### **Phase 3: Login Screen CFS**
1. Create `LoginScreenEditor.js`
2. Add to admin panel
3. Implement live preview
4. Save/load configurations
5. Apply to actual login page

### **Phase 4: User Management**
1. Create `UserManagementCFS.js`
2. Add backend API endpoints
3. Implement search/filter
4. Add bulk actions
5. Test role changes

---

## 📊 **Summary**

**New Components:** 4
**New Database Tables:** 1
**Total Lines:** ~1,200 lines

**Benefits:**
- ✅ Test UI as different roles
- ✅ Flexible sidebar configuration
- ✅ Branded login experience
- ✅ Powerful user management
- ✅ Role-based access control
- ✅ Admin-friendly interfaces

**Next:** Integration and testing! 🎨
