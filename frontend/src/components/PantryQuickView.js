import React, { useState } from 'react';
import { Package, ShoppingCart, AlertTriangle, Eye, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { detectIcon } from '../utils/categoryDetector';
import ExpirationBadge from './ExpirationBadge';

const PantryQuickView = ({ pantryItems, onAddToList, onViewPantry }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter items
  const filteredItems = pantryItems.filter(item =>
    item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Categorize items
  const expiringItems = filteredItems.filter(item => {
    if (!item.expiry_date) return false;
    const daysUntilExpiry = Math.ceil(
      (new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  });

  const lowStockItems = filteredItems.filter(item => {
    const quantity = parseFloat(item.quantity) || 0;
    return quantity > 0 && quantity <= 2;
  });

  const handleOutOfStock = (item) => {
    onAddToList({
      itemName: item.item_name,
      quantity: 1,
      unit: item.unit || '',
      category: item.category || '',
    });
  };

  if (pantryItems.length === 0) {
    return (
      <div className="text-center py-8">
        <Package className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 dark:text-gray-400 mb-2">Your pantry is empty</p>
        <p className="text-sm text-gray-500 dark:text-gray-500">
          Complete a shopping trip to add items to your pantry
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with View Full Pantry */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Package className="w-5 h-5 mr-2 text-green-600" />
          Kitchen Inventory
        </h3>
        <button
          onClick={onViewPantry}
          className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center"
        >
          <Eye className="w-4 h-4 mr-1" />
          View Full Inventory
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search pantry items..."
        className="input-field text-sm"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {pantryItems.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Total Items</div>
        </div>
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
            {expiringItems.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Expiring Soon</div>
        </div>
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {lowStockItems.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">Low Stock</div>
        </div>
      </div>

      {/* Alerts */}
      {expiringItems.length > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                Items Expiring Soon
              </p>
              <div className="mt-2 space-y-1">
                {expiringItems.slice(0, 3).map(item => {
                  const daysUntilExpiry = Math.ceil(
                    (new Date(item.expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div key={item.id} className="text-xs text-yellow-700 dark:text-yellow-400">
                      • {item.item_name} ({daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''})
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Items */}
      {lowStockItems.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Low Stock - Add to List?
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
            {lowStockItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1 min-w-0 flex items-center">
                  <span className="text-xl mr-2">{item.item_icon || detectIcon(item.item_name)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.item_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.quantity} {item.unit} left
                    </p>
                    {item.expiry_date && (
                      <div className="mt-1">
                        <ExpirationBadge expiryDate={item.expiry_date} compact={true} />
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleOutOfStock(item)}
                  className="ml-2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
                  title="Add to shopping list"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Items */}
      {filteredItems.length > 0 && lowStockItems.length === 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Recent Items
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredItems.slice(0, 10).map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {item.item_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.quantity} {item.unit}
                    {item.expiry_date && (
                      <span className="ml-2">
                        • Expires {new Date(item.expiry_date).toLocaleDateString()}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleOutOfStock(item)}
                  className="ml-2 p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title="Out of stock - add to list"
                >
                  <ShoppingCart className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PantryQuickView;
