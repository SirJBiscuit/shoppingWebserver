import React, { useState } from 'react';
import { Edit2, Trash2, Star, AlertCircle, CheckCircle, Package, GripVertical } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

/**
 * DraggableGridView - Grid view with drag & drop reordering
 * Features:
 * - Drag and drop to reorder items
 * - Visual feedback during drag
 * - Saves order to backend
 * - All features from EnhancedGridView
 */
const DraggableGridView = ({ 
  items = [], 
  onEdit, 
  onDelete, 
  onToggleFavorite,
  onQuickAction,
  onReorder
}) => {
  const [orderedItems, setOrderedItems] = useState(items);

  // Update ordered items when items prop changes
  React.useEffect(() => {
    setOrderedItems(items);
  }, [items]);

  // Handle reorder
  const handleReorder = (newOrder) => {
    setOrderedItems(newOrder);
    if (onReorder) {
      // Extract just the IDs in the new order
      const itemIds = newOrder.map(item => item.id);
      onReorder(itemIds);
    }
  };

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

  if (orderedItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <Package className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No items found</p>
        <p className="text-sm">Add items to your inventory to get started</p>
      </div>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={orderedItems}
      onReorder={handleReorder}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
    >
      {orderedItems.map((item) => {
        const status = getStatusBadge(item);
        
        return (
          <Reorder.Item
            key={item.id}
            value={item}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 cursor-grab active:cursor-grabbing"
            whileDrag={{ scale: 1.05, zIndex: 1000 }}
          >
            {/* Drag Handle */}
            <div className="absolute top-2 left-2 z-10 opacity-50 hover:opacity-100 transition-opacity">
              <GripVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>

            {/* Header with Status */}
            <div className={`${status.bg} ${status.text} px-4 py-2 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{status.icon}</span>
                <span className="font-bold text-sm">{status.label}</span>
              </div>
              <button
                onClick={() => onToggleFavorite(item)}
                className="hover:scale-110 transition-transform"
              >
                <Star 
                  className={`w-5 h-5 ${item.is_favorite ? 'fill-yellow-300 text-yellow-300' : 'text-white/70'}`} 
                />
              </button>
            </div>

            {/* Item Image/Icon */}
            <div className="p-4 flex flex-col items-center">
              {item.image_url ? (
                <img 
                  src={item.image_url} 
                  alt={item.item_name}
                  className="w-24 h-24 object-cover rounded-lg mb-3"
                />
              ) : (
                <div className="w-24 h-24 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg mb-3">
                  <span className="text-5xl">{getCategoryIcon(item.item_category)}</span>
                </div>
              )}

              {/* Item Name */}
              <h3 className="font-bold text-lg text-gray-900 dark:text-white text-center mb-2 line-clamp-2">
                {item.item_name}
              </h3>

              {/* Category Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold">
                  {getCategoryIcon(item.item_category)} {item.item_category || 'food'}
                </span>
              </div>

              {/* Details */}
              <div className="w-full space-y-2 text-sm">
                {item.quantity && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {Math.floor(item.quantity)} {item.unit}
                    </span>
                  </div>
                )}
                
                {item.estimated_expiry_date && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Expires:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {new Date(item.estimated_expiry_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {item.price && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Price:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${parseFloat(item.price).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-4 pb-4 flex gap-2">
              <button
                onClick={() => onEdit(item)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Edit2 className="w-4 h-4" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDelete(item)}
                className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            </div>

            {/* Quick Actions */}
            {item.estimated_expiry_date && (
              <div className="px-4 pb-4 flex gap-2">
                <button
                  onClick={() => onQuickAction(item, 'still_good')}
                  className="flex-1 px-2 py-1.5 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  Still Good
                </button>
                <button
                  onClick={() => onQuickAction(item, 'went_bad')}
                  className="flex-1 px-2 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-xs font-medium flex items-center justify-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  Went Bad
                </button>
              </div>
            )}
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
};

export default DraggableGridView;
