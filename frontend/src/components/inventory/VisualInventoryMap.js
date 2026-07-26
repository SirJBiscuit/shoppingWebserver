import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Package } from 'lucide-react';
import StorageIndicator from './StorageIndicator';

/**
 * VisualInventoryMap - Visual representation of kitchen storage locations
 * Shows items organized by their physical location with visual indicators
 */
const VisualInventoryMap = ({ items, onEdit, onAdjustQuantity }) => {
  const [expandedLocations, setExpandedLocations] = useState(new Set(['pantry', 'fridge', 'freezer']));

  // Group items by location (default + custom)
  const groupItemsByLocation = () => {
    const defaultGroups = {
      pantry: [],
      fridge: [],
      freezer: []
    };
    
    const customGroups = {};
    
    items.forEach(item => {
      if (item.custom_location_id) {
        // Custom location
        const key = `custom_${item.custom_location_id}`;
        if (!customGroups[key]) {
          customGroups[key] = {
            id: item.custom_location_id,
            name: item.custom_location_name || 'Custom Location',
            icon: item.custom_location_icon || '📦',
            color: item.custom_location_color || 'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-800/30',
            borderColor: 'border-gray-300 dark:border-gray-700',
            textColor: 'text-gray-800 dark:text-gray-300',
            bgColor: 'bg-gray-50 dark:bg-gray-900/20',
            items: []
          };
        }
        customGroups[key].items.push(item);
      } else if (item.storage_location) {
        // Default location
        defaultGroups[item.storage_location]?.push(item);
      }
    });
    
    return { default: defaultGroups, custom: customGroups };
  };

  const { default: itemsByLocation, custom: customLocations } = groupItemsByLocation();

  const toggleLocation = (location) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(location)) {
        newSet.delete(location);
      } else {
        newSet.add(location);
      }
      return newSet;
    });
  };

  const locationConfig = {
    pantry: {
      name: 'Pantry',
      icon: '🥫',
      color: 'from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30',
      borderColor: 'border-amber-300 dark:border-amber-700',
      textColor: 'text-amber-800 dark:text-amber-300',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20'
    },
    fridge: {
      name: 'Fridge',
      icon: '🧊',
      color: 'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30',
      borderColor: 'border-blue-300 dark:border-blue-700',
      textColor: 'text-blue-800 dark:text-blue-300',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    freezer: {
      name: 'Freezer',
      icon: '❄️',
      color: 'from-cyan-100 to-cyan-200 dark:from-cyan-900/30 dark:to-cyan-800/30',
      borderColor: 'border-cyan-300 dark:border-cyan-700',
      textColor: 'text-cyan-800 dark:text-cyan-300',
      bgColor: 'bg-cyan-50 dark:bg-cyan-900/20'
    }
  };

  const getTotalValue = (locationItems) => {
    return locationItems.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
  };

  const getExpiringCount = (locationItems) => {
    return locationItems.filter(item => {
      if (!item.estimated_expiry_date) return false;
      const daysUntilExpiry = Math.ceil((new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
    }).length;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
      {Object.entries(locationConfig).map(([location, config]) => {
        const locationItems = itemsByLocation[location] || [];
        const isExpanded = expandedLocations.has(location);
        const totalValue = getTotalValue(locationItems);
        const expiringCount = getExpiringCount(locationItems);

        return (
          <div
            key={location}
            className={`rounded-2xl border-3 ${config.borderColor} overflow-hidden shadow-xl transition-all duration-300 ${
              isExpanded ? 'lg:col-span-1' : ''
            }`}
          >
            {/* Location Header */}
            <button
              onClick={() => toggleLocation(location)}
              className={`w-full p-4 md:p-6 bg-gradient-to-br ${config.color} ${config.textColor} transition-all hover:opacity-90`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-5xl">{config.icon}</span>
                  <div className="text-left">
                    <h3 className="text-xl md:text-2xl font-bold">{config.name}</h3>
                    <p className="text-sm md:text-base opacity-80">
                      {locationItems.length} items
                    </p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>

              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:text-base">
                <div className={`${config.bgColor} rounded-lg p-2 md:p-3`}>
                  <div className="font-semibold">Total Value</div>
                  <div className="text-lg md:text-xl font-bold">${totalValue.toFixed(2)}</div>
                </div>
                <div className={`${config.bgColor} rounded-lg p-2 md:p-3`}>
                  <div className="font-semibold">Expiring Soon</div>
                  <div className="text-lg md:text-xl font-bold">{expiringCount}</div>
                </div>
              </div>
            </button>

            {/* Items Grid */}
            {isExpanded && (
              <div className={`p-3 md:p-4 ${config.bgColor} max-h-[600px] overflow-y-auto`}>
                {locationItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No items in {config.name}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
                    {locationItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => onEdit && onEdit(item)}
                        className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-left border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-600"
                      >
                        {/* Item Icon/Image */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-3xl flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <span>{item.item_icon || '📦'}</span>
                            )}
                          </div>
                          
                          {/* Storage Indicator */}
                          <StorageIndicator
                            item={item}
                            onAdjustQuantity={onAdjustQuantity}
                            size="small"
                          />
                        </div>

                        {/* Item Name */}
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate mb-1">
                          {item.item_name}
                        </h4>

                        {/* Quantity */}
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {parseFloat(item.current_quantity)} {item.unit}
                        </p>

                        {/* Category Badge */}
                        {item.category && (
                          <div className="mt-2">
                            <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-[10px] font-medium truncate max-w-full">
                              {item.category}
                            </span>
                          </div>
                        )}

                        {/* Expiration Warning */}
                        {item.estimated_expiry_date && (() => {
                          const daysUntilExpiry = Math.ceil((new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                          if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
                            return (
                              <div className="mt-2 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                                ⚠️ {daysUntilExpiry}d left
                              </div>
                            );
                          }
                          if (daysUntilExpiry < 0) {
                            return (
                              <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                ❌ Expired
                              </div>
                            );
                          }
                        })()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Custom Locations */}
      {Object.entries(customLocations).map(([key, config]) => {
        const locationItems = config.items || [];
        const isExpanded = expandedLocations.has(key);
        const totalValue = getTotalValue(locationItems);
        const expiringCount = getExpiringCount(locationItems);

        return (
          <div
            key={key}
            className={`rounded-2xl border-3 ${config.borderColor} overflow-hidden shadow-xl transition-all duration-300`}
          >
            {/* Location Header */}
            <button
              onClick={() => toggleLocation(key)}
              className={`w-full p-4 md:p-6 bg-gradient-to-br ${config.color} ${config.textColor} transition-all hover:opacity-90`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-4xl md:text-5xl">{config.icon}</span>
                  <div className="text-left">
                    <h3 className="text-xl md:text-2xl font-bold">{config.name}</h3>
                    <p className="text-sm md:text-base opacity-80">
                      {locationItems.length} items
                    </p>
                  </div>
                </div>
                {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
              </div>

              {/* Quick Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:text-base">
                <div className={`${config.bgColor} rounded-lg p-2 md:p-3`}>
                  <div className="font-semibold">Total Value</div>
                  <div className="text-lg md:text-xl font-bold">${totalValue.toFixed(2)}</div>
                </div>
                <div className={`${config.bgColor} rounded-lg p-2 md:p-3`}>
                  <div className="font-semibold">Expiring Soon</div>
                  <div className="text-lg md:text-xl font-bold">{expiringCount}</div>
                </div>
              </div>
            </button>

            {/* Items Grid */}
            {isExpanded && (
              <div className={`p-3 md:p-4 ${config.bgColor} max-h-[600px] overflow-y-auto`}>
                {locationItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Package size={48} className="mx-auto mb-2 opacity-50" />
                    <p>No items in {config.name}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3 gap-2 md:gap-3">
                    {locationItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => onEdit && onEdit(item)}
                        className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 text-left border-2 border-transparent hover:border-blue-400 dark:hover:border-blue-600"
                      >
                        {/* Item Icon/Image */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="text-3xl flex-shrink-0">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.item_name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <span>{item.item_icon || '📦'}</span>
                            )}
                          </div>
                          
                          {/* Storage Indicator */}
                          <StorageIndicator
                            item={item}
                            onAdjustQuantity={onAdjustQuantity}
                            size="small"
                          />
                        </div>

                        {/* Item Name */}
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate mb-1">
                          {item.item_name}
                        </h4>

                        {/* Quantity */}
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {parseFloat(item.current_quantity)} {item.unit}
                        </p>

                        {/* Category Badge */}
                        {item.category && (
                          <div className="mt-2">
                            <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-[10px] font-medium truncate max-w-full">
                              {item.category}
                            </span>
                          </div>
                        )}

                        {/* Expiration Warning */}
                        {item.estimated_expiry_date && (() => {
                          const daysUntilExpiry = Math.ceil((new Date(item.estimated_expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                          if (daysUntilExpiry <= 7 && daysUntilExpiry >= 0) {
                            return (
                              <div className="mt-2 text-[10px] font-semibold text-orange-600 dark:text-orange-400">
                                ⚠️ {daysUntilExpiry}d left
                              </div>
                            );
                          }
                          if (daysUntilExpiry < 0) {
                            return (
                              <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400">
                                ❌ Expired
                              </div>
                            );
                          }
                        })()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default VisualInventoryMap;
