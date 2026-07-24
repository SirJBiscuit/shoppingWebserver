import React from 'react';
import InventoryCard from './InventoryCard';

/**
 * ShelfView - Display items on realistic shelves
 */
const ShelfView = ({ items, location, onEdit, onDelete, onQuickAction, cardSize }) => {
  // Group items by sub-category or create default shelves
  const shelves = groupItemsByShelf(items, location);
  
  const shelfStyles = {
    pantry: {
      color: '#8B4513',
      background: 'linear-gradient(180deg, #D2691E 0%, #8B4513 100%)',
      texture: 'wood'
    },
    fridge: {
      color: '#E8F4F8',
      background: 'linear-gradient(180deg, #FFFFFF 0%, #E8F4F8 100%)',
      texture: 'metal'
    },
    freezer: {
      color: '#D1E7F0',
      background: 'linear-gradient(180deg, #E8F4F8 0%, #D1E7F0 100%)',
      texture: 'frost'
    }
  };

  const currentStyle = shelfStyles[location] || shelfStyles.pantry;

  return (
    <div className="space-y-8">
      {Object.keys(shelves).map((shelfName, shelfIndex) => (
        <div key={shelfName} className="relative">
          {/* Shelf Label */}
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">
              {shelfName}
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({shelves[shelfName].length} items)
            </span>
          </div>

          {/* Shelf Container */}
          <div className="relative">
            {/* Items on Shelf */}
            <div className={`
              grid gap-4 pb-6 px-4 pt-4
              ${cardSize === 'small' ? 'grid-cols-2 sm:grid-cols-4 lg:grid-cols-6' : ''}
              ${cardSize === 'medium' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : ''}
              ${cardSize === 'large' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : ''}
            `}>
              {shelves[shelfName].map(item => (
                <div
                  key={item.id}
                  className="transform hover:-translate-y-2 transition-transform duration-200"
                  style={{
                    filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))'
                  }}
                >
                  <InventoryCard
                    item={item}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onQuickAction={onQuickAction}
                    size={cardSize}
                  />
                </div>
              ))}
            </div>

            {/* Shelf Board */}
            <div 
              className="h-3 rounded-sm shadow-lg relative overflow-hidden"
              style={{
                background: currentStyle.background,
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)'
              }}
            >
              {/* Wood grain or texture effect */}
              {currentStyle.texture === 'wood' && (
                <div className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)'
                  }}
                />
              )}
              
              {/* Metal shine effect */}
              {currentStyle.texture === 'metal' && (
                <div className="absolute inset-0 opacity-30"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)'
                  }}
                />
              )}
              
              {/* Frost effect */}
              {currentStyle.texture === 'frost' && (
                <div className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.8) 0%, transparent 50%)'
                  }}
                />
              )}
            </div>

            {/* Shelf Support Brackets */}
            <div className="absolute bottom-0 left-0 w-8 h-12 bg-gray-400 dark:bg-gray-600 rounded-b-lg"
              style={{
                boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
              }}
            />
            <div className="absolute bottom-0 right-0 w-8 h-12 bg-gray-400 dark:bg-gray-600 rounded-b-lg"
              style={{
                boxShadow: '-2px 2px 4px rgba(0, 0, 0, 0.3)'
              }}
            />
          </div>
        </div>
      ))}

      {/* Empty State */}
      {Object.keys(shelves).length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No items on the shelves yet. Add some items to get started!
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Group items by shelf/sub-category
 */
const groupItemsByShelf = (items, location) => {
  const shelves = {};
  
  // Default shelf names based on location
  const defaultShelves = {
    pantry: ['Top Shelf', 'Eye Level', 'Bottom Shelf'],
    fridge: ['Top Shelf', 'Middle Shelf', 'Bottom Shelf', 'Door', 'Crisper'],
    freezer: ['Top Drawer', 'Middle Drawer', 'Bottom Drawer']
  };

  const shelfNames = defaultShelves[location] || ['Shelf 1', 'Shelf 2', 'Shelf 3'];

  // Initialize shelves
  shelfNames.forEach(name => {
    shelves[name] = [];
  });

  // Distribute items across shelves
  // If items have sub_location, use that; otherwise distribute evenly
  items.forEach((item, index) => {
    const subLocation = item.sub_location || shelfNames[index % shelfNames.length];
    if (!shelves[subLocation]) {
      shelves[subLocation] = [];
    }
    shelves[subLocation].push(item);
  });

  // Remove empty shelves
  Object.keys(shelves).forEach(shelf => {
    if (shelves[shelf].length === 0) {
      delete shelves[shelf];
    }
  });

  return shelves;
};

export default ShelfView;
