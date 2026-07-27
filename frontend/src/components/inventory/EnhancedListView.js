import React from 'react';
import { Edit2, Trash2, Star, AlertCircle, CheckCircle, Package } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * EnhancedListView - Compact list display for inventory items
 * Features:
 * - Table-like layout
 * - Color-coded status indicators
 * - Inline actions
 * - Sortable columns
 * - Compact design for viewing many items
 */
const EnhancedListView = ({ 
  items = [], 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onQuickAction 
}) => {
  
  // Get expiration status color
  const getExpirationColor = (item) => {
    if (!item.estimated_expiry_date) return 'gray';
    
    const daysUntilExpiry = Math.floor(
      (new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    
    if (daysUntilExpiry < 0) return 'black';
    if (daysUntilExpiry <= 3) return 'red';
    if (daysUntilExpiry <= 7) return 'orange';
    if (daysUntilExpiry <= 14) return 'yellow';
    return 'green';
  };

  // Get status badge
  const getStatusBadge = (item) => {
    const color = getExpirationColor(item);
    
    const badges = {
      black: { bg: 'bg-black', text: 'text-white', label: 'Expired', icon: '⚫' },
      red: { bg: 'bg-red-500', text: 'text-white', label: 'Urgent', icon: '🔴' },
      orange: { bg: 'bg-orange-500', text: 'text-white', label: 'Use Soon', icon: '🟠' },
      yellow: { bg: 'bg-yellow-500', text: 'text-gray-900', label: 'Warning', icon: '🟡' },
      green: { bg: 'bg-green-500', text: 'text-white', label: 'Fresh', icon: '🟢' },
      gray: { bg: 'bg-gray-400', text: 'text-white', label: 'Unknown', icon: '⚪' },
    };
    
    return badges[color] || badges.gray;
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      food: '🍎',
      household: '🏠',
      pet: '🐾',
      medical: '💊',
      cleaning: '🧹',
      tools: '🔧',
      beauty: '💄',
      other: '📦'
    };
    return icons[category] || '📦';
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = (item) => {
    if (!item.estimated_expiry_date) return null;
    const days = Math.floor(
      (new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24)
    );
    return days;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b-2 border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-3">Item Name</div>
          <div className="col-span-1 text-center">Category</div>
          <div className="col-span-1 text-center">Quantity</div>
          <div className="col-span-2 text-center">Expires</div>
          <div className="col-span-1 text-center">Price</div>
          <div className="col-span-3 text-center">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.map((item, index) => {
          const status = getStatusBadge(item);
          const daysUntilExpiry = getDaysUntilExpiry(item);
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors items-center"
            >
              {/* Status */}
              <div className="col-span-1 flex justify-center">
                <div className={`${status.bg} ${status.text} px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1`}>
                  <span>{status.icon}</span>
                </div>
              </div>

              {/* Item Name */}
              <div className="col-span-3 flex items-center gap-2">
                <button
                  onClick={() => onToggleFavorite(item)}
                  className="hover:scale-110 transition-transform"
                >
                  <Star 
                    className={`w-4 h-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} 
                  />
                </button>
                <span className="font-medium text-gray-900 dark:text-white truncate">
                  {item.item_name}
                </span>
              </div>

              {/* Category */}
              <div className="col-span-1 text-center">
                <span className="text-2xl" title={item.item_category || 'food'}>
                  {getCategoryIcon(item.item_category)}
                </span>
              </div>

              {/* Quantity */}
              <div className="col-span-1 text-center">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {item.quantity ? Math.floor(item.quantity) : '-'}
                </span>
                {item.unit && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {item.unit}
                  </span>
                )}
              </div>

              {/* Expires */}
              <div className="col-span-2 text-center">
                <div className="text-sm text-gray-900 dark:text-white">
                  {formatDate(item.estimated_expiry_date)}
                </div>
                {daysUntilExpiry !== null && (
                  <div className={`text-xs ${
                    daysUntilExpiry < 0 ? 'text-black dark:text-red-400' :
                    daysUntilExpiry <= 3 ? 'text-red-600 dark:text-red-400' :
                    daysUntilExpiry <= 7 ? 'text-orange-600 dark:text-orange-400' :
                    daysUntilExpiry <= 14 ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-green-600 dark:text-green-400'
                  }`}>
                    {daysUntilExpiry < 0 ? 'Expired' : `${daysUntilExpiry}d left`}
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="col-span-1 text-center">
                {item.price ? (
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${parseFloat(item.price).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-3 flex items-center justify-center gap-1">
                {item.estimated_expiry_date && (
                  <>
                    <button
                      onClick={() => onQuickAction(item, 'still_good')}
                      className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      title="Still Good"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onQuickAction(item, 'went_bad')}
                      className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                      title="Went Bad"
                    >
                      <AlertCircle className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={() => onEdit(item)}
                  className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  title="Edit"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(item)}
                  className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <Package className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No items found</p>
          <p className="text-sm">Add items to your inventory to get started</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedListView;
