import React from 'react';
import { Grid, List, LayoutGrid, Package, Map } from 'lucide-react';

/**
 * ViewModeSelector - Toggle between different inventory display modes
 */
const ViewModeSelector = ({ viewMode, setViewMode, cardSize, setCardSize }) => {
  const modes = [
    { id: 'map', icon: Map, label: 'Visual Map', description: 'Location-based overview' },
    { id: 'grid', icon: Grid, label: 'Grid View', description: 'Cards in a grid' },
    { id: 'shelf', icon: Package, label: 'Shelf View', description: 'Realistic shelves' },
    { id: 'list', icon: List, label: 'List View', description: 'Compact list' },
    { id: 'category', icon: LayoutGrid, label: 'Category Boxes', description: 'Grouped by category' }
  ];

  const sizes = [
    { id: 'small', label: 'Small', width: '150px' },
    { id: 'medium', label: 'Medium', width: '250px' },
    { id: 'large', label: 'Large', width: '350px' }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 sm:p-4 mb-4 md:mb-6">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between">
        {/* View Mode Buttons */}
        <div className="w-full md:flex-1">
          <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            View Mode
          </label>
          <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
            {modes.map(mode => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={mode.description}
                >
                  <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="text-[10px] sm:text-xs md:text-sm leading-tight">{mode.label.replace(' View', '').replace(' Boxes', '')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Size Slider (only for grid/shelf/category views) */}
        {(viewMode === 'grid' || viewMode === 'shelf' || viewMode === 'category') && (
          <div className="w-full md:w-48 lg:w-64">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Size: <span className="text-blue-600 capitalize">{cardSize}</span>
            </label>
            <div className="flex items-center gap-2">
              {sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => setCardSize(size.id)}
                  className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                    cardSize === size.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewModeSelector;
