import React from 'react';
import { Minus, Plus } from 'lucide-react';

/**
 * StorageIndicator - Visual representation of item quantity
 * Shows liquid levels, grain amounts, or slice counts based on item type
 */
const StorageIndicator = ({ item, onAdjustQuantity, size = 'medium' }) => {
  const { current_quantity, unit, category, item_name } = item;
  
  // Determine storage type based on unit and category
  const getStorageType = () => {
    const name = item_name?.toLowerCase() || '';
    const cat = category?.toLowerCase() || '';
    const itemUnit = unit?.toLowerCase() || '';
    
    // Liquid items
    if (itemUnit.includes('ml') || itemUnit.includes('l') || itemUnit.includes('oz') || 
        itemUnit.includes('cup') || itemUnit.includes('gallon') ||
        name.includes('milk') || name.includes('juice') || name.includes('water') ||
        name.includes('soda') || name.includes('oil') || name.includes('sauce')) {
      return 'liquid';
    }
    
    // Bread/slices
    if (name.includes('bread') || name.includes('slice') || itemUnit.includes('slice')) {
      return 'slices';
    }
    
    // Grains/dry goods
    if (cat.includes('grain') || cat.includes('pasta') || cat.includes('rice') ||
        cat.includes('cereal') || name.includes('flour') || name.includes('sugar')) {
      return 'grains';
    }
    
    // Default to numeric
    return 'numeric';
  };

  const storageType = getStorageType();
  const quantity = parseFloat(current_quantity) || 0;
  const maxQuantity = 10; // For visual representation
  const percentage = Math.min((quantity / maxQuantity) * 100, 100);
  
  // Size variants
  const sizeClasses = {
    small: { container: 'w-8 h-16', icon: 'text-xs' },
    medium: { container: 'w-10 h-20', icon: 'text-sm' },
    large: { container: 'w-12 h-24', icon: 'text-base' }
  };
  
  const currentSize = sizeClasses[size] || sizeClasses.medium;

  // Get color based on quantity level
  const getColor = () => {
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 30) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleAdjust = (amount) => {
    const newQuantity = Math.max(0, quantity + amount);
    if (onAdjustQuantity) {
      onAdjustQuantity(item, newQuantity);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Visual Indicator */}
      <div className={`relative ${currentSize.container} bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600`}>
        {storageType === 'liquid' && (
          <>
            {/* Liquid Level */}
            <div 
              className={`absolute bottom-0 left-0 right-0 ${getColor()} transition-all duration-300`}
              style={{ height: `${percentage}%` }}
            >
              {/* Wave effect */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-white opacity-30 animate-pulse"></div>
            </div>
            {/* Measurement lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-px bg-gray-400 dark:bg-gray-500 opacity-50"></div>
              ))}
            </div>
          </>
        )}

        {storageType === 'grains' && (
          <>
            {/* Grain particles */}
            <div 
              className={`absolute bottom-0 left-0 right-0 ${getColor()} transition-all duration-300`}
              style={{ height: `${percentage}%` }}
            >
              {/* Grain texture */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                  backgroundSize: '4px 4px'
                }}
              ></div>
            </div>
          </>
        )}

        {storageType === 'slices' && (
          <div className="absolute inset-0 flex flex-col-reverse p-1 gap-0.5">
            {[...Array(Math.ceil(quantity))].map((_, i) => (
              <div 
                key={i}
                className={`h-2 ${getColor()} rounded-sm border border-white dark:border-gray-800`}
                style={{ opacity: i < quantity ? 1 : 0.3 }}
              ></div>
            ))}
          </div>
        )}

        {storageType === 'numeric' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold ${currentSize.icon} text-gray-700 dark:text-gray-300`}>
              {Math.round(quantity)}
            </span>
          </div>
        )}
      </div>

      {/* Quantity Display */}
      <div className="text-[10px] sm:text-xs font-semibold text-gray-600 dark:text-gray-400 text-center">
        {quantity} {unit}
      </div>

      {/* Quick Adjust Buttons */}
      {onAdjustQuantity && (
        <div className="flex gap-1">
          <button
            onClick={() => handleAdjust(-1)}
            className="p-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            title="Remove 1"
          >
            <Minus size={12} />
          </button>
          <button
            onClick={() => handleAdjust(1)}
            className="p-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
            title="Add 1"
          >
            <Plus size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default StorageIndicator;
