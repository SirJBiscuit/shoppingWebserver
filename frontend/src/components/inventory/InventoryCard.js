import React, { useState } from 'react';
import { 
  MoreVertical, Edit2, Trash2, ShoppingCart, CheckCircle, 
  XCircle, Package, DollarSign, Calendar, MapPin, Image as ImageIcon
} from 'lucide-react';
import ExpirationBadge from './ExpirationBadge';

/**
 * InventoryCard - Beautiful card for displaying inventory items
 * Tablet-optimized with large touch targets
 */
const InventoryCard = ({ 
  item, 
  onEdit, 
  onDelete, 
  onAddToList, 
  onStillGood, 
  onWentBad,
  onMarkOpened 
}) => {
  const [showActions, setShowActions] = useState(false);

  const {
    id,
    item_name,
    current_quantity,
    unit,
    category,
    storage_location,
    custom_location_name,
    custom_location_icon,
    bought_date,
    opened_date,
    is_opened,
    estimated_expiry_date,
    price,
    store,
    notes,
    image_url,
    expirationStatus
  } = item;

  // Format date
  const formatDate = (date) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Get location display
  const getLocationDisplay = () => {
    if (custom_location_name) {
      return {
        name: custom_location_name,
        icon: custom_location_icon || '📦'
      };
    }
    
    const defaultLocations = {
      pantry: { name: 'Pantry', icon: '🥫' },
      fridge: { name: 'Fridge', icon: '🧊' },
      freezer: { name: 'Freezer', icon: '❄️' }
    };
    
    return defaultLocations[storage_location] || { name: storage_location, icon: '📦' };
  };

  const location = getLocationDisplay();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border-2 border-gray-100 dark:border-gray-700">
      {/* Image or Icon */}
      <div className="relative h-40 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
        {image_url ? (
          <img 
            src={image_url} 
            alt={item_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-6xl">
            {category === 'Dairy & Eggs' && '🥛'}
            {category === 'Meat & Seafood' && '🥩'}
            {category === 'Produce' && '🥬'}
            {category === 'Bakery & Bread' && '🍞'}
            {category === 'Frozen Foods' && '❄️'}
            {!category && '📦'}
          </div>
        )}
        
        {/* Expiration Badge - Top Right */}
        {expirationStatus && (
          <div className="absolute top-3 right-3">
            <ExpirationBadge expirationStatus={expirationStatus} size="md" />
          </div>
        )}

        {/* Opened Badge - Top Left */}
        {is_opened && (
          <div className="absolute top-3 left-3 bg-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
            Opened
          </div>
        )}

        {/* Actions Menu - Top Right Corner */}
        <button
          onClick={() => setShowActions(!showActions)}
          className="absolute top-3 left-3 bg-white dark:bg-gray-800 p-2 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <MoreVertical size={20} />
        </button>

        {/* Actions Dropdown */}
        {showActions && (
          <div className="absolute top-14 left-3 bg-white dark:bg-gray-800 rounded-lg shadow-2xl py-2 z-10 min-w-[200px] border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { onEdit(item); setShowActions(false); }}
              className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-left"
            >
              <Edit2 size={18} />
              <span>Edit Item</span>
            </button>
            <button
              onClick={() => { onAddToList(item); setShowActions(false); }}
              className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-left"
            >
              <ShoppingCart size={18} />
              <span>Add to Shopping List</span>
            </button>
            {!is_opened && (
              <button
                onClick={() => { onMarkOpened(item); setShowActions(false); }}
                className="w-full px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 text-left"
              >
                <Package size={18} />
                <span>Mark as Opened</span>
              </button>
            )}
            <button
              onClick={() => { onStillGood(item); setShowActions(false); }}
              className="w-full px-4 py-3 hover:bg-green-50 dark:hover:bg-green-900 flex items-center gap-3 text-left text-green-600 dark:text-green-400"
            >
              <CheckCircle size={18} />
              <span>Still Good</span>
            </button>
            <button
              onClick={() => { onWentBad(item); setShowActions(false); }}
              className="w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900 flex items-center gap-3 text-left text-red-600 dark:text-red-400"
            >
              <XCircle size={18} />
              <span>Went Bad</span>
            </button>
            <hr className="my-2 border-gray-200 dark:border-gray-700" />
            <button
              onClick={() => { onDelete(item); setShowActions(false); }}
              className="w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900 flex items-center gap-3 text-left text-red-600 dark:text-red-400"
            >
              <Trash2 size={18} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Item Name */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 truncate">
          {item_name}
        </h3>

        {/* Quantity */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
          <Package size={18} />
          <span className="text-lg font-semibold">
            {current_quantity} {unit}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-3">
          <span className="text-xl">{location.icon}</span>
          <span>{location.name}</span>
        </div>

        {/* Category */}
        {category && (
          <div className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm mb-3">
            {category}
          </div>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          {/* Bought Date */}
          {bought_date && (
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>Bought {formatDate(bought_date)}</span>
            </div>
          )}

          {/* Price */}
          {price && (
            <div className="flex items-center gap-2">
              <DollarSign size={16} />
              <span>${parseFloat(price).toFixed(2)}</span>
            </div>
          )}

          {/* Store */}
          {store && (
            <div className="flex items-center gap-2 col-span-2">
              <MapPin size={16} />
              <span className="truncate">{store}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {notes && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400 italic line-clamp-2">
              {notes}
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions Footer */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => onStillGood(item)}
          className="flex-1 py-3 bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-700 dark:text-green-200 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle size={18} />
          <span>Still Good</span>
        </button>
        <button
          onClick={() => onWentBad(item)}
          className="flex-1 py-3 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-200 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <XCircle size={18} />
          <span>Went Bad</span>
        </button>
      </div>
    </div>
  );
};

export default InventoryCard;
