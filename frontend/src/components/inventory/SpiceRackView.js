import React from 'react';
import SeasoningCard from './SeasoningCard';

/**
 * SpiceRackView - Dedicated view for seasonings with fill level management
 * Shows all items marked as is_seasoning
 */
const SpiceRackView = ({ 
  items, 
  onUpdateFillLevel, 
  onRefill 
}) => {
  // Filter for seasonings only
  const seasonings = items.filter(item => item.is_seasoning);

  if (seasonings.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🧂</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Seasonings Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add seasonings to your inventory to track their fill levels
        </p>
      </div>
    );
  }

  // Group by fill level for better organization
  const groupedSeasonings = {
    empty: seasonings.filter(s => s.fill_level === 'empty'),
    low: seasonings.filter(s => s.fill_level === 'low'),
    half: seasonings.filter(s => s.fill_level === 'half'),
    full: seasonings.filter(s => s.fill_level === 'full' || !s.fill_level)
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4">
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {groupedSeasonings.empty.length}
          </div>
          <div className="text-sm text-red-700 dark:text-red-300 font-semibold">Empty</div>
        </div>
        
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-4">
          <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
            {groupedSeasonings.low.length}
          </div>
          <div className="text-sm text-orange-700 dark:text-orange-300 font-semibold">Low</div>
        </div>
        
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4">
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {groupedSeasonings.half.length}
          </div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300 font-semibold">Half</div>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-600 dark:text-green-400">
            {groupedSeasonings.full.length}
          </div>
          <div className="text-sm text-green-700 dark:text-green-300 font-semibold">Full</div>
        </div>
      </div>

      {/* Need to Refill Section */}
      {(groupedSeasonings.empty.length > 0 || groupedSeasonings.low.length > 0) && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-xl p-6">
          <h3 className="text-xl font-bold text-orange-900 dark:text-orange-100 mb-4 flex items-center gap-2">
            <span>⚠️</span>
            <span>Need to Refill ({groupedSeasonings.empty.length + groupedSeasonings.low.length})</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...groupedSeasonings.empty, ...groupedSeasonings.low].map(item => (
              <SeasoningCard
                key={item.id}
                item={item}
                onUpdateFillLevel={onUpdateFillLevel}
                onRefill={onRefill}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Seasonings Grid */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          All Seasonings ({seasonings.length})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {seasonings.map(item => (
            <SeasoningCard
              key={item.id}
              item={item}
              onUpdateFillLevel={onUpdateFillLevel}
              onRefill={onRefill}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpiceRackView;
