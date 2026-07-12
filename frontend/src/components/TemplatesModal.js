import React, { useState, useEffect } from 'react';
import { X, Plus, Search, Package, BookmarkCheck, Trash2 } from 'lucide-react';
import { getTemplateCategories, getTemplateItems, searchTemplates } from '../data/commonItemTemplates';
import { shoppingAPI } from '../services/api';

const TemplatesModal = ({ isOpen, onClose, onAddItems }) => {
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' or 'common'
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateItems, setTemplateItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSavedTemplates();
    }
  }, [isOpen]);

  const loadSavedTemplates = async () => {
    try {
      setLoading(true);
      const response = await shoppingAPI.getTemplates();
      setSavedTemplates(response.data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateItems = async (templateId) => {
    try {
      const response = await shoppingAPI.getTemplateItems(templateId);
      setTemplateItems(response.data || []);
    } catch (error) {
      console.error('Error loading template items:', error);
    }
  };

  const deleteTemplate = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await shoppingAPI.deleteTemplate(templateId);
      await loadSavedTemplates();
      if (selectedTemplate === templateId) {
        setSelectedTemplate(null);
        setTemplateItems([]);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const useTemplate = async (templateId) => {
    try {
      const response = await shoppingAPI.getTemplateItems(templateId);
      const items = response.data || [];
      
      // Convert template items to the format expected by onAddItems
      const formattedItems = items.map(item => ({
        name: item.item_name,
        quantity: item.quantity || 1,
        unit: item.unit || '',
        category: item.category || '',
        icon: item.item_icon || ''
      }));
      
      onAddItems(formattedItems);
      onClose();
    } catch (error) {
      console.error('Error using template:', error);
      alert('Failed to load template items');
    }
  };

  if (!isOpen) return null;

  const categories = getTemplateCategories();
  const displayItems = searchQuery
    ? searchTemplates(searchQuery)
    : selectedCategory
    ? getTemplateItems(selectedCategory)
    : [];

  const toggleItem = (item) => {
    const itemKey = `${item.name}-${item.unit}`;
    const isSelected = selectedItems.some(i => `${i.name}-${i.unit}` === itemKey);

    if (isSelected) {
      setSelectedItems(selectedItems.filter(i => `${i.name}-${i.unit}` !== itemKey));
    } else {
      setSelectedItems([...selectedItems, item]);
    }
  };

  const handleAddToList = () => {
    if (selectedItems.length > 0) {
      onAddItems(selectedItems);
      setSelectedItems([]);
      setSearchQuery('');
      setSelectedCategory(null);
      onClose();
    }
  };

  const handleSelectAll = () => {
    if (displayItems.length === selectedItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems([...displayItems]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Package className="w-6 h-6 mr-2" />
                Shopping List Templates
              </h2>
              <p className="text-primary-100 text-sm mt-1">
                Use saved templates or add common items
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-primary-500 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setActiveTab('saved');
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'saved'
                  ? 'bg-white text-primary-700'
                  : 'bg-primary-500 text-white hover:bg-primary-400'
              }`}
            >
              <BookmarkCheck className="w-4 h-4 inline mr-2" />
              My Saved Templates ({savedTemplates.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('common');
                setSearchQuery('');
                setSelectedTemplate(null);
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'common'
                  ? 'bg-white text-primary-700'
                  : 'bg-primary-500 text-white hover:bg-primary-400'
              }`}
            >
              <Package className="w-4 h-4 inline mr-2" />
              Common Items
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value) setSelectedCategory(null);
              }}
              placeholder="Search for items..."
              className="input-field pl-10"
            />
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Saved Templates Tab */}
          {activeTab === 'saved' && (
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 dark:text-gray-400 mt-4">Loading templates...</p>
                </div>
              ) : savedTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <BookmarkCheck className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">No saved templates yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Save your shopping lists as templates for quick reuse
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-primary-500 transition-all"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                            {template.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {template.item_count} items
                          </p>
                        </div>
                        <button
                          onClick={() => deleteTemplate(template.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => useTemplate(template.id)}
                        className="w-full btn-primary flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Use Template
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Common Items Tab */}
          {activeTab === 'common' && (
            <>
              {/* Categories Sidebar */}
              {!searchQuery && (
                <div className="w-64 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                  <div className="p-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`w-full text-left px-4 py-3 rounded-lg mb-1 transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="font-medium">{category}</div>
                        <div className="text-xs opacity-75 mt-1">
                          {getTemplateItems(category).length} items
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {displayItems.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery
                    ? 'No items found matching your search'
                    : 'Select a category to view items'}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {searchQuery ? 'Search Results' : selectedCategory}
                  </h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    {displayItems.length === selectedItems.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {displayItems.map((item, index) => {
                    const itemKey = `${item.name}-${item.unit}`;
                    const isSelected = selectedItems.some(i => `${i.name}-${i.unit}` === itemKey);

                    return (
                      <button
                        key={index}
                        onClick={() => toggleItem(item)}
                        className={`p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl">{item.icon}</span>
                          {isSelected && (
                            <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {item.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {item.quantity} {item.unit}
                        </div>
                        {searchQuery && item.templateCategory && (
                          <div className="text-xs text-primary-600 dark:text-primary-400 mt-1">
                            {item.templateCategory}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToList}
                disabled={selectedItems.length === 0}
                className="btn-primary flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add {selectedItems.length > 0 && `(${selectedItems.length})`} to List
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
