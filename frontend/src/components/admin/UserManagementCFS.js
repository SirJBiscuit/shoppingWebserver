import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, UserPlus, Shield, Star, User, Ban, Check,
  Mail, Calendar, MoreVertical, Edit, Trash2, Key, Activity
} from 'lucide-react';

/**
 * UserManagementCFS - Comprehensive user management interface
 * 
 * Features:
 * - User list with search/filter
 * - Role assignment (user/beta/admin)
 * - Enable/disable users
 * - View user activity
 * - Bulk actions
 * - User stats dashboard
 */

const UserManagementCFS = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  useEffect(() => {
    loadUsers();
  }, []);
  
  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load users');
      
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const updateUserRole = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) throw new Error('Failed to update role');
      
      loadUsers();
    } catch (error) {
      console.error('Error updating role:', error);
    }
  };
  
  const toggleUserStatus = async (userId, enabled) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      
      if (!response.ok) throw new Error('Failed to update status');
      
      loadUsers();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };
  
  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };
  
  const filteredUsers = users
    .filter(u => {
      const matchesSearch = 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.username?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && u.enabled) ||
        (statusFilter === 'disabled' && !u.enabled);
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  
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
  
  const stats = {
    total: users.length,
    users: users.filter(u => u.role === 'user').length,
    beta: users.filter(u => u.role === 'beta').length,
    admin: users.filter(u => u.role === 'admin').length,
    active: users.filter(u => u.enabled).length,
    disabled: users.filter(u => !u.enabled).length
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading users...</div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            User Management
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage users, roles, and permissions
          </p>
        </div>
        
        <button
          onClick={() => setShowUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
        </div>
        
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.users}</div>
          <div className="text-sm text-blue-600 dark:text-blue-400">Users</div>
        </div>
        
        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.beta}</div>
          <div className="text-sm text-purple-600 dark:text-purple-400">Beta Testers</div>
        </div>
        
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.admin}</div>
          <div className="text-sm text-red-600 dark:text-red-400">Admins</div>
        </div>
        
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</div>
          <div className="text-sm text-green-600 dark:text-green-400">Active</div>
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.disabled}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">Disabled</div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search users by email or username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="beta">Beta Testers</option>
          <option value="admin">Admins</option>
        </select>
        
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>
      
      {/* User Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => {
                const RoleIcon = getRoleIcon(user.role);
                const roleColor = getRoleColor(user.role);
                
                return (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-${roleColor}-100 dark:bg-${roleColor}-900/30 flex items-center justify-center`}>
                          <RoleIcon className={`w-5 h-5 text-${roleColor}-600 dark:text-${roleColor}-400`} />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {user.username || 'No username'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                        className={`px-3 py-1 text-sm rounded-full border-2 bg-${roleColor}-50 dark:bg-${roleColor}-900/20 border-${roleColor}-200 dark:border-${roleColor}-800 text-${roleColor}-700 dark:text-${roleColor}-400 font-medium`}
                      >
                        <option value="user">User</option>
                        <option value="beta">Beta</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    
                    <td className="px-6 py-4">
                      {user.enabled ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                          <Check className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm font-medium">
                          <Ban className="w-3 h-3" />
                          Disabled
                        </span>
                      )}
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Calendar className="w-3 h-3" />
                        {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleUserStatus(user.id, !user.enabled)}
                          className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors ${
                            user.enabled
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                          }`}
                        >
                          {user.enabled ? 'Disable' : 'Enable'}
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserModal(true);
                          }}
                          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Edit user"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => deleteUser(user.id)}
                          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredUsers.length === 0 && (
          <div className="p-12 text-center text-gray-500 dark:text-gray-400">
            No users found matching your filters
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 <strong>Tip:</strong> Use the search and filters to find specific users. Click role badges to change user permissions. Disabled users cannot log in.
        </p>
      </div>
    </div>
  );
};

export default UserManagementCFS;
