import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { GripVertical, Eye, EyeOff, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * SidebarConfigurator - Admin interface for managing sidebar pages
 * 
 * Features:
 * - Drag-and-drop reordering
 * - Role-based visibility toggles
 * - Add/edit/delete pages
 * - System page protection
 */

const SidebarConfigurator = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    loadPages();
  }, []);
  
  const loadPages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/sidebar/pages', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to load pages');
      
      const data = await response.json();
      setPages(data);
      setError(null);
    } catch (err) {
      console.error('Error loading pages:', err);
      setError('Failed to load sidebar pages');
    } finally {
      setLoading(false);
    }
  };
  
  const toggleRole = async (pageId, role) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/sidebar/pages/${pageId}/toggle-role`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role })
      });
      
      if (!response.ok) throw new Error('Failed to toggle role');
      
      const updatedPage = await response.json();
      
      setPages(pages.map(p => p.id === pageId ? updatedPage : p));
    } catch (err) {
      console.error('Error toggling role:', err);
      setError('Failed to update page visibility');
    }
  };
  
  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const items = Array.from(pages);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    
    // Update local state immediately
    setPages(items);
    
    // Save to backend
    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('/api/sidebar/pages/reorder', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pages: items.map((p, i) => ({ id: p.id, order: i }))
        })
      });
      
      if (!response.ok) throw new Error('Failed to reorder');
      
      setError(null);
    } catch (err) {
      console.error('Error reordering:', err);
      setError('Failed to save page order');
      // Reload to get correct order
      loadPages();
    } finally {
      setSaving(false);
    }
  };
  
  const deletePage = async (pageId) => {
    if (!confirm('Are you sure you want to delete this page?')) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/sidebar/pages/${pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete');
      }
      
      setPages(pages.filter(p => p.id !== pageId));
      setError(null);
    } catch (err) {
      console.error('Error deleting page:', err);
      setError(err.message);
    }
  };
  
  const getRoleIcon = (page, role) => {
    const isEnabled = page[`enabled_for_${role}`];
    return isEnabled ? Eye : EyeOff;
  };
  
  const getRoleColor = (page, role) => {
    const isEnabled = page[`enabled_for_${role}`];
    return isEnabled ? 'green' : 'gray';
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-gray-500">Loading sidebar configuration...</div>
      </div>
    );
  }
  
  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Sidebar Configuration
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage sidebar pages and role-based visibility
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Page
        </button>
      </div>
      
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </motion.div>
      )}
      
      {/* Saving Indicator */}
      {saving && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-700 dark:text-blue-300 text-sm">
          <Save className="w-4 h-4 inline mr-2" />
          Saving changes...
        </div>
      )}
      
      {/* Pages List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="pages">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {pages.map((page, index) => (
                  <Draggable
                    key={page.id}
                    draggableId={String(page.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 ${
                          snapshot.isDragging ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800'
                        }`}
                      >
                        {/* Drag Handle */}
                        <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing">
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </div>
                        
                        {/* Page Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-gray-900 dark:text-white">
                              {page.page_name}
                            </div>
                            {page.is_system_page && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                                System
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {page.page_path}
                          </div>
                        </div>
                        
                        {/* Role Toggles */}
                        <div className="flex gap-2">
                          {['user', 'beta', 'admin'].map((role) => {
                            const Icon = getRoleIcon(page, role);
                            const color = getRoleColor(page, role);
                            const isEnabled = page[`enabled_for_${role}`];
                            
                            return (
                              <button
                                key={role}
                                onClick={() => toggleRole(page.id, role)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                  isEnabled
                                    ? `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400 hover:bg-${color}-200 dark:hover:bg-${color}-900/50`
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                                title={`${isEnabled ? 'Visible' : 'Hidden'} for ${role}s`}
                              >
                                <Icon className="w-4 h-4" />
                                <span className="capitalize">{role}</span>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Delete Button */}
                        {!page.is_system_page && (
                          <button
                            onClick={() => deletePage(page.id)}
                            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete page"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
      
      {/* Info */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-sm text-blue-700 dark:text-blue-300">
          💡 <strong>Tip:</strong> Drag pages to reorder them. Toggle role visibility with the eye icons. System pages cannot be deleted but can be hidden.
        </p>
      </div>
    </div>
  );
};

export default SidebarConfigurator;
