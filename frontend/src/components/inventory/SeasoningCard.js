import React from 'react';
import { Plus } from 'lucide-react';

/**
 * SeasoningCard - Card for displaying seasonings with fill level
 * Uses "shake test" approach: Full, Half, Low, Empty
 */
const SeasoningCard = ({ 
  item, 
  onUpdateFillLevel, 
  onRefill 
}) => {
  const {
    id,
    item_name,
    fill_level = 'full',
    custom_location_name,
    custom_location_icon,
    image_url,
    item_icon
  } = item;

  // Fill level configurations
  const fillLevels = {
    full: {
      label: 'Full',
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      borderColor: 'border-green-300 dark:border-green-700',
      percentage: 100,
      icon: '✓'
    },
    half: {
      label: 'Half',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      borderColor: 'border-yellow-300 dark:border-yellow-700',
      percentage: 50,
      icon: '~'
    },
    low: {
      label: 'Low',
      color: 'bg-orange-500',
      textColor: 'text-orange-700 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      borderColor: 'border-orange-300 dark:border-orange-700',
      percentage: 25,
      icon: '!'
    },
    empty: {
      label: 'Empty',
      color: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      borderColor: 'border-red-300 dark:border-red-700',
      percentage: 0,
      icon: '✗'
    }
  };

  const currentLevel = fillLevels[fill_level] || fillLevels.full;

  const handleFillLevelClick = () => {
    // Cycle through fill levels: full -> half -> low -> empty -> full
    const levels = ['full', 'half', 'low', 'empty'];
    const currentIndex = levels.indexOf(fill_level);
    const nextLevel = levels[(currentIndex + 1) % levels.length];
    onUpdateFillLevel(item, nextLevel);
  };

  return (
    <div className={`
      relative rounded-xl border-2 ${currentLevel.borderColor} ${currentLevel.bgColor}
      p-4 transition-all hover:shadow-lg
    `}>
      {/* Fill Level Indicator - Top Right */}
      <button
        onClick={handleFillLevelClick}
        className={`
          absolute top-2 right-2 w-8 h-8 rounded-full ${currentLevel.color}
          text-white font-bold flex items-center justify-center
          hover:scale-110 transition-transform shadow-md
        `}
        title={`Click to change (currently ${currentLevel.label})`}
      >
        {currentLevel.icon}
      </button>

      {/* Seasoning Icon/Image */}
      <div className="flex items-center gap-3 mb-3">
        <div className="text-4xl">
          {image_url && image_url.startsWith('http') ? (
            <img 
              src={image_url} 
              alt={item_name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <span>{item_icon || image_url || '🧂'}</span>
          )}
        </div>
        
        <div className="flex-1">
          {/* Seasoning Name */}
          <h4 className="font-bold text-gray-900 dark:text-white truncate">
            {item_name}
          </h4>
          
          {/* Fill Level Text */}
          <p className={`text-sm font-semibold ${currentLevel.textColor}`}>
            {currentLevel.label}
          </p>
        </div>
      </div>

      {/* Visual Fill Level Bar */}
      <div className="mb-3">
        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full ${currentLevel.color} transition-all duration-300`}
            style={{ width: `${currentLevel.percentage}%` }}
          />
        </div>
      </div>

      {/* Location Badge */}
      {custom_location_name && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3 flex items-center gap-1">
          <span>{custom_location_icon || '📦'}</span>
          <span>{custom_location_name}</span>
        </div>
      )}

      {/* Refill Button */}
      {(fill_level === 'low' || fill_level === 'empty') && (
        <button
          onClick={() => onRefill(item)}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm"
        >
          <Plus size={16} />
          <span>Add to Shopping List</span>
        </button>
      )}
    </div>
  );
};

export default SeasoningCard;
