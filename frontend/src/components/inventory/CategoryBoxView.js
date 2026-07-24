import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import InventoryCard from './InventoryCard';

/**
 * CategoryBoxView - Display items grouped by category in collapsible boxes
 */
const CategoryBoxView = ({ items, onEdit, onDelete, onQuickAction, cardSize }) => {
  const [expandedCategories, setExpandedCategories] = useState(new Set());

  // Group items by category
  const categorizedItems = groupByCategory(items);

  // Category colors
  const categoryColors = {
    'Dairy & Eggs': { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300', text: 'text-yellow-800 dark:text-yellow-300' },
    'Meat & Seafood': { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-300', text: 'text-red-800 dark:text-red-300' },
    'Produce': { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-300', text: 'text-green-800 dark:text-green-300' },
    'Bakery & Bread': { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300', text: 'text-orange-800 dark:text-orange-300' },
    'Canned & Jarred': { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-300', text: 'text-gray-800 dark:text-gray-300' },
    'Grains & Pasta': { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-300', text: 'text-amber-800 dark:text-amber-300' },
    'Spices & Seasonings': { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-300', text: 'text-rose-800 dark:text-rose-300' },
    'Snacks & Sweets': { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-300', text: 'text-pink-800 dark:text-pink-300' },
    'Beverages': { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-300', text: 'text-blue-800 dark:text-blue-300' },
    'Condiments & Sauces': { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-300', text: 'text-purple-800 dark:text-purple-300' },
    'Frozen Foods': { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-300', text: 'text-cyan-800 dark:text-cyan-300' },
    'Leftovers': { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-300', text: 'text-indigo-800 dark:text-indigo-300' },
    'Other': { bg: 'bg-slate-50 dark:bg-slate-900/20', border: 'border-slate-300', text: 'text-slate-800 dark:text-slate-300' }
  };

  const toggleCategory = (category) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(Object.keys(categorizedItems)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Expand/Collapse All */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={expandAll}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
        >
          Collapse All
        </button>
      </div>

      {/* Category Boxes */}
      {Object.keys(categorizedItems).sort().map(category => {
        const isExpanded = expandedCategories.has(category);
        const categoryItems = categorizedItems[category];
        const colors = categoryColors[category] || categoryColors['Other'];

        return (
          <div
            key={category}
            className={`rounded-xl border-2 ${colors.border} ${colors.bg} overflow-hidden transition-all`}
          >
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                {isExpanded ? <ChevronDown size={20} className="sm:w-6 sm:h-6 flex-shrink-0" /> : <ChevronRight size={20} className="sm:w-6 sm:h-6 flex-shrink-0" />}
                <h3 className={`text-base sm:text-lg md:text-xl font-bold ${colors.text} truncate`}>
                  {category}
                </h3>
                <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold ${colors.text} bg-white dark:bg-gray-800 flex-shrink-0`}>
                  {categoryItems.length}
                </span>
              </div>
              
              {/* Category Stats */}
              <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm pl-7 sm:pl-0">
                <span className={colors.text}>
                  ${categoryItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0).toFixed(2)}
                </span>
              </div>
            </button>

            {/* Category Items */}
            {isExpanded && (
              <div className="px-3 sm:px-4 md:px-6 pb-4 sm:pb-6">
                <div className={`
                  grid gap-2 sm:gap-3 md:gap-4
                  ${cardSize === 'small' ? 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6' : ''}
                  ${cardSize === 'medium' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : ''}
                  ${cardSize === 'large' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : ''}
                `}>
                  {categoryItems.map(item => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onQuickAction={onQuickAction}
                      size={cardSize}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Empty State */}
      {Object.keys(categorizedItems).length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No items to display. Add some items to get started!
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Group items by category
 */
const groupByCategory = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    const category = item.category || 'Other';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(item);
  });

  return grouped;
};

export default CategoryBoxView;
