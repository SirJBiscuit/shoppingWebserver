import React from 'react';
import { Edit2, Trash2, Star, Package } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * CategoryView - Organize items by category with collapsible sections
 * Features:
 * - Group items by category
 * - Collapsible category sections
 * - Category icons and counts
 * - Color-coded expiration status
 * - Compact card display
 */
const CategoryView = ({ 
  items = [], 
  onEdit, 
  onDelete, 
  onToggleFavorite 
}) => {
  
  const [expandedCategories, setExpandedCategories] = React.useState(new Set(['food']));

  // Category definitions
  const categories = {
    food: { icon: '🍎', label: 'Food', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
    household: { icon: '🏠', label: 'Household', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
    pet: { icon: '🐾', label: 'Pet Supplies', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
    medical: { icon: '💊', label: 'Medical', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
    cleaning: { icon: '🧹', label: 'Cleaning', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
    tools: { icon: '🔧', label: 'Tools', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
    beauty: { icon: '💄', label: 'Beauty', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' },
    other: { icon: '📦', label: 'Other', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' }
  };

  // Group items by category
  const groupedItems = React.useMemo(() => {
    const grouped = {};
    items.forEach(item => {
      const category = item.item_category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  }, [items]);

  // Toggle category expansion
  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
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

  // Get status indicator
  const getStatusIndicator = (item) => {
    const color = getExpirationColor(item);
    const indicators = {
      black: '⚫',
      red: '🔴',
      orange: '🟠',
      yellow: '🟡',
      green: '🟢',
      gray: '⚪'
    };
    return indicators[color] || '⚪';
  };

  return (
    <div className="space-y-4">
      {Object.entries(groupedItems).map(([categoryKey, categoryItems]) => {
        const category = categories[categoryKey] || categories.other;
        const isExpanded = expandedCategories.has(categoryKey);
        
        return (
          <motion.div
            key={categoryKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(categoryKey)}
              className={`w-full px-6 py-4 flex items-center justify-between ${category.color} hover:opacity-80 transition-opacity`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">{category.icon}</span>
                <div className="text-left">
                  <h3 className="text-lg font-bold">{category.label}</h3>
                  <p className="text-sm opacity-75">{categoryItems.length} items</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {/* Expiration Summary */}
                <div className="flex gap-1">
                  {['red', 'orange', 'yellow', 'green'].map(color => {
                    const count = categoryItems.filter(item => getExpirationColor(item) === color).length;
                    if (count === 0) return null;
                    return (
                      <span key={color} className="px-2 py-1 bg-white/50 dark:bg-black/20 rounded-full text-xs font-bold">
                        {color === 'red' ? '🔴' : color === 'orange' ? '🟠' : color === 'yellow' ? '🟡' : '🟢'} {count}
                      </span>
                    );
                  })}
                </div>
                <span className={`text-2xl transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </div>
            </button>

            {/* Category Items */}
            {isExpanded && (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {categoryItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 hover:shadow-md transition-shadow border-2 border-transparent hover:border-primary-500"
                  >
                    {/* Item Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{getStatusIndicator(item)}</span>
                        <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {item.item_name}
                        </h4>
                      </div>
                      <button
                        onClick={() => onToggleFavorite(item)}
                        className="hover:scale-110 transition-transform flex-shrink-0"
                      >
                        <Star 
                          className={`w-4 h-4 ${item.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} 
                        />
                      </button>
                    </div>

                    {/* Item Details */}
                    <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400 mb-3">
                      {item.quantity && (
                        <div className="flex justify-between">
                          <span>Quantity:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {Math.floor(item.quantity)} {item.unit}
                          </span>
                        </div>
                      )}
                      {item.estimated_expiry_date && (
                        <div className="flex justify-between">
                          <span>Expires:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            {new Date(item.estimated_expiry_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {item.price && (
                        <div className="flex justify-between">
                          <span>Price:</span>
                          <span className="font-semibold text-gray-900 dark:text-white">
                            ${parseFloat(item.price).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Item Actions */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => onEdit(item)}
                        className="flex-1 px-2 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className="flex-1 px-2 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        );
      })}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
          <Package className="w-16 h-16 mb-4 opacity-50" />
          <p className="text-lg font-medium">No items found</p>
          <p className="text-sm">Add items to your inventory to get started</p>
        </div>
      )}
    </div>
  );
};

export default CategoryView;
