import React, { useState } from 'react';
import { X, ShoppingCart, Store, Tag } from 'lucide-react';
import { getAvailableStores } from '../data/storeLayouts';

const NewListModal = ({ isOpen, onClose, onCreateList, existingLists = [] }) => {
  const [listName, setListName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [listType, setListType] = useState('general'); // general, weekly, store-specific
  const [notes, setNotes] = useState('');
  
  const availableStores = getAvailableStores();

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!listName.trim()) {
      return;
    }

    onCreateList({
      name: listName.trim(),
      store_name: storeName.trim() || null,
      list_type: listType,
      notes: notes.trim() || null
    });

    // Reset form
    setListName('');
    setStoreName('');
    setListType('general');
    setNotes('');
    onClose();
  };

  const suggestedNames = [
    `Shopping List ${existingLists.length + 1}`,
    'Weekly Groceries',
    'Quick Trip',
    'Meal Prep',
    'Party Shopping'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Create New List
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* List Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Name *
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              className="input-field"
              placeholder="e.g., Weekly Groceries"
              autoFocus
              required
            />
            
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {suggestedNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setListName(name)}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* List Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              List Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setListType('general')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  listType === 'general'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <ShoppingCart className="w-5 h-5 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">General</span>
              </button>
              
              <button
                type="button"
                onClick={() => setListType('weekly')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  listType === 'weekly'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Tag className="w-5 h-5 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Weekly</span>
              </button>
              
              <button
                type="button"
                onClick={() => setListType('store')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  listType === 'store'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Store className="w-5 h-5 mx-auto mb-1 text-gray-700 dark:text-gray-300" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Store</span>
              </button>
            </div>
          </div>

          {/* Store Name (only for store-specific lists) */}
          {listType === 'store' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Store
              </label>
              <select
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="input-field"
              >
                <option value="">Choose a store...</option>
                {availableStores.map((store) => (
                  <option key={store.id} value={store.name}>
                    {store.name} {store.priceMultiplier !== 1.0 && `(${store.priceMultiplier < 1 ? 'Lower' : 'Higher'} prices)`}
                  </option>
                ))}
                <option value="custom">Custom Store</option>
              </select>
              
              {storeName === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom store name"
                  className="input-field mt-2"
                  onChange={(e) => setStoreName(e.target.value)}
                />
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field"
              rows="2"
              placeholder="Add any notes about this list..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!listName.trim()}
              className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewListModal;
