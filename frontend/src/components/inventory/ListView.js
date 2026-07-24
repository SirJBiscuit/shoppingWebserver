import React from 'react';
import { Edit2, Trash2, Calendar, DollarSign, MapPin } from 'lucide-react';
import ExpirationBadge from './ExpirationBadge';

/**
 * ListView - Compact list view for inventory items
 */
const ListView = ({ items, onEdit, onDelete, onQuickAction }) => {
  const formatQuantity = (quantity) => {
    const num = parseFloat(quantity);
    return Number.isInteger(num) ? num.toString() : num.toFixed(1);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      {/* Table Header */}
      <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-12 gap-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          <div className="col-span-3">Item</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-1 text-center">Qty</div>
          <div className="col-span-2">Expiration</div>
          <div className="col-span-1 text-center">Price</div>
          <div className="col-span-2">Store</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {items.map(item => (
          <div
            key={item.id}
            className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Item Name & Icon */}
              <div className="col-span-3 flex items-center gap-3">
                <div className="text-3xl flex-shrink-0">
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.item_name}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                  ) : (
                    <span>{item.item_icon || '📦'}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                    {item.item_name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                    {item.storage_location === 'pantry' && '🥫 Pantry'}
                    {item.storage_location === 'fridge' && '🧊 Fridge'}
                    {item.storage_location === 'freezer' && '❄️ Freezer'}
                  </p>
                </div>
              </div>

              {/* Category */}
              <div className="col-span-2">
                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                  {item.category || 'Uncategorized'}
                </span>
              </div>

              {/* Quantity */}
              <div className="col-span-1 text-center">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatQuantity(item.current_quantity)}
                </span>
                {item.unit && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                    {item.unit}
                  </span>
                )}
              </div>

              {/* Expiration */}
              <div className="col-span-2">
                {item.expirationStatus ? (
                  <ExpirationBadge expirationStatus={item.expirationStatus} size="sm" />
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    No expiration
                  </span>
                )}
              </div>

              {/* Price */}
              <div className="col-span-1 text-center">
                {item.price ? (
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    ${parseFloat(item.price).toFixed(2)}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>

              {/* Store */}
              <div className="col-span-2">
                {item.store ? (
                  <span className="text-sm text-gray-600 dark:text-gray-400 truncate block">
                    {item.store}
                  </span>
                ) : (
                  <span className="text-sm text-gray-400">-</span>
                )}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end gap-2">
                <button
                  onClick={() => onEdit(item)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            No items to display
          </p>
        </div>
      )}
    </div>
  );
};

export default ListView;
