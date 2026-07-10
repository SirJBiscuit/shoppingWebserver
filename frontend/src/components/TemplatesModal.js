import React, { useState } from 'react';
import { X, Plus, Search, Package } from 'lucide-react';
import { getTemplateCategories, getTemplateItems, searchTemplates } from '../data/commonItemTemplates';

const TemplatesModal = ({ isOpen, onClose, onAddItems }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);

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
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center">
              <Package className="w-6 h-6 mr-2" />
              Common Items Templates
            </h2>
            <p className="text-primary-100 text-sm mt-1">
              Quick-add frequently purchased items to your shopping list
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-primary-500 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
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
