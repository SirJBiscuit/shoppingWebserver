import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Flag, Save, RefreshCw, Plus, Trash2, Edit2, Check, X,
  Users, Star, Shield, Zap, Eye, EyeOff, Search, Filter
} from 'lucide-react';

const AdminFeatureFlagsManager = () => {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [editingFlag, setEditingFlag] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadFeatureFlags();
  }, []);

  const loadFeatureFlags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/feature-flags', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFlags(data);
      }
    } catch (error) {
      console.error('Error loading feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagId, enabled) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/feature-flags/${flagId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled })
      });
      
      if (response.ok) {
        setFlags(flags.map(f => f.id === flagId ? { ...f, enabled } : f));
      }
    } catch (error) {
      console.error('Error toggling flag:', error);
    }
  };

  const updateFlagRoles = async (flagId, roles) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/feature-flags/${flagId}/roles`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ roles })
      });
      
      if (response.ok) {
        setFlags(flags.map(f => f.id === flagId ? { ...f, roles } : f));
      }
    } catch (error) {
      console.error('Error updating flag roles:', error);
    }
  };

  const deleteFlag = async (flagId) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/feature-flags/${flagId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setFlags(flags.filter(f => f.id !== flagId));
      }
    } catch (error) {
      console.error('Error deleting flag:', error);
    }
  };

  const filteredFlags = flags.filter(flag => {
    const matchesSearch = flag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         flag.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || flag.roles.includes(filterRole);
    return matchesSearch && matchesRole;
  });

  const roleIcons = {
    user: { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900' },
    beta: { icon: Star, color: 'text-purple-600', bg: 'bg-purple-100 dark:bg-purple-900' },
    admin: { icon: Shield, color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900' }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading feature flags...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Feature Flags Manager
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Control feature availability by role
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          Add Feature Flag
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feature flags..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="beta">Beta</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={loadFeatureFlags}
          className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
          title="Refresh"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Total Flags</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{flags.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Enabled</p>
          <p className="text-2xl font-bold text-green-600">{flags.filter(f => f.enabled).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Disabled</p>
          <p className="text-2xl font-bold text-red-600">{flags.filter(f => !f.enabled).length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">Beta Only</p>
          <p className="text-2xl font-bold text-purple-600">
            {flags.filter(f => f.roles.includes('beta') && !f.roles.includes('user')).length}
          </p>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="space-y-3">
        {filteredFlags.length > 0 ? (
          filteredFlags.map((flag, index) => (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-gray-200 dark:border-gray-700"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Flag className={`w-5 h-5 ${flag.enabled ? 'text-green-600' : 'text-gray-400'}`} />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {flag.name}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      flag.enabled
                        ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {flag.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  
                  {flag.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {flag.description}
                    </p>
                  )}

                  {/* Role Badges */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Available to:</span>
                    {['user', 'beta', 'admin'].map((role) => {
                      const isActive = flag.roles.includes(role);
                      const roleConfig = roleIcons[role];
                      const Icon = roleConfig.icon;
                      
                      return (
                        <button
                          key={role}
                          onClick={() => {
                            const newRoles = isActive
                              ? flag.roles.filter(r => r !== role)
                              : [...flag.roles, role];
                            updateFlagRoles(flag.id, newRoles);
                          }}
                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? `${roleConfig.bg} ${roleConfig.color}`
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Icon className="w-3 h-3" />
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </button>
                      );
                    })}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>Key: <code className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">{flag.key}</code></span>
                    {flag.created_at && (
                      <span>Created: {new Date(flag.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flag.enabled}
                      onChange={(e) => toggleFlag(flag.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                  
                  <button
                    onClick={() => setEditingFlag(flag)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  
                  {!flag.system && (
                    <button
                      onClick={() => deleteFlag(flag.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-12">
            <Flag className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No feature flags found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || editingFlag) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {editingFlag ? 'Edit Feature Flag' : 'Add Feature Flag'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Flag Name
                </label>
                <input
                  type="text"
                  placeholder="My Awesome Feature"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Flag Key
                </label>
                <input
                  type="text"
                  placeholder="my_awesome_feature"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe what this feature does..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available to Roles
                </label>
                <div className="flex gap-2">
                  {['user', 'beta', 'admin'].map((role) => (
                    <button
                      key={role}
                      className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable immediately
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingFlag(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all"
              >
                {editingFlag ? 'Update' : 'Create'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminFeatureFlagsManager;
