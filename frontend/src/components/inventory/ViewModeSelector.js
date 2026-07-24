import React from 'react';
import { Grid, List, LayoutGrid, Package } from 'lucide-react';

/**
 * ViewModeSelector - Toggle between different inventory display modes
 */
const ViewModeSelector = ({ viewMode, setViewMode, cardSize, setCardSize }) => {
  const modes = [
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
        {/* View Mode Buttons */}
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            View Mode
          </label>
          <div className="flex flex-wrap gap-2">
            {modes.map(mode => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.id;
              
              return (
                <button
                  key={mode.id}
                  onClick={() => setViewMode(mode.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                  title={mode.description}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Size Slider (only for grid/shelf views) */}
        {(viewMode === 'grid' || viewMode === 'shelf') && (
          <div className="w-full lg:w-64">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Card Size: <span className="text-blue-600">{cardSize}</span>
            </label>
            <div className="flex items-center gap-3">
              {sizes.map(size => (
                <button
                  key={size.id}
                  onClick={() => setCardSize(size.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
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
