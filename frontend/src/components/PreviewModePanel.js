import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, User, Shield, Star, X } from 'lucide-react';

/**
 * PreviewModePanel - Preview app as different user roles
 * 
 * Features:
 * - Switch between user/beta/admin roles
 * - Floating panel with role selector
 * - Visual indicator when in preview mode
 * - Quick exit preview
 */

const ROLES = [
  { 
    id: 'user', 
    name: 'Regular User', 
    icon: User, 
    color: 'blue',
    description: 'Standard user experience'
  },
  { 
    id: 'beta', 
    name: 'Beta Tester', 
    icon: Star, 
    color: 'purple',
    description: 'Access to beta features'
  },
  { 
    id: 'admin', 
    name: 'Administrator', 
    icon: Shield, 
    color: 'red',
    description: 'Full admin access'
  }
];

const PreviewModePanel = ({ currentUser, onRoleChange }) => {
  const [previewRole, setPreviewRole] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  
  // Only show for admins
  if (currentUser?.role !== 'admin') {
    return null;
  }
  
  const enterPreviewMode = (role) => {
    setPreviewRole(role);
    onRoleChange(role.id);
    setIsOpen(false);
  };
  
  const exitPreviewMode = () => {
    setPreviewRole(null);
    onRoleChange(currentUser.role);
  };
  
  return (
    <>
      {/* Preview Mode Banner (when active) */}
      <AnimatePresence>
        {previewRole && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg"
          >
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5" />
                <div>
                  <div className="font-bold">Preview Mode Active</div>
                  <div className="text-sm opacity-90">
                    Viewing as: <strong>{previewRole.name}</strong>
                  </div>
                </div>
              </div>
              
              <button
                onClick={exitPreviewMode}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Exit Preview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 p-4 rounded-full shadow-2xl z-40 transition-colors ${
          previewRole
            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
        title="Preview as Different User"
      >
        {previewRole ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
      </motion.button>
      
      {/* Preview Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            
            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-28 right-6 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border-2 border-indigo-500 z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-lg">Preview Mode</h3>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm opacity-90">
                  Test the app as different user roles
                </p>
              </div>
              
              {/* Current Preview Status */}
              {previewRole && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-400 rounded-lg">
                      <Eye className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-yellow-800 dark:text-yellow-400">
                        Currently Previewing
                      </div>
                      <div className="text-lg font-bold text-yellow-900 dark:text-yellow-300">
                        {previewRole.name}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Role Selection */}
              <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
                {ROLES.map((role) => {
                  const RoleIcon = role.icon;
                  const isActive = previewRole?.id === role.id;
                  const isCurrent = role.id === currentUser.role;
                  
                  return (
                    <motion.button
                      key={role.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => enterPreviewMode(role)}
                      disabled={isActive}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${
                        isActive
                          ? `bg-${role.color}-100 dark:bg-${role.color}-900/30 border-2 border-${role.color}-500 cursor-default`
                          : isCurrent
                          ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`p-3 rounded-lg bg-${role.color}-100 dark:bg-${role.color}-900/30`}>
                        <RoleIcon className={`w-6 h-6 text-${role.color}-600 dark:text-${role.color}-400`} />
                      </div>
                      
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {role.name}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Your Role
                            </span>
                          )}
                          {isActive && (
                            <span className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {role.description}
                        </p>
                      </div>
                      
                      {!isActive && (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
              
              {/* Footer */}
              {previewRole && (
                <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={exitPreviewMode}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Exit Preview Mode
                  </button>
                </div>
              )}
              
              {/* Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 <strong>Tip:</strong> Preview mode lets you test features without logging out. Your actual role remains unchanged.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default PreviewModePanel;
