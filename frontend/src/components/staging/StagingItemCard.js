import React from 'react';
import { CheckCircle, Trash2, AlertCircle } from 'lucide-react';

/**
 * StagingItemCard - Card for items in staging area
 */
const StagingItemCard = ({ item, isSelected, onSelect, onPutAway, onRemove }) => {
  const hasSuggestions = item.pending_suggestions > 0;

  return (
    <div
      onClick={onSelect}
      className={`relative bg-gray-50 dark:bg-gray-700 rounded-xl p-4 cursor-pointer transition-all ${
        isSelected 
          ? 'ring-4 ring-blue-500 shadow-lg' 
          : 'hover:shadow-md hover:bg-gray-100 dark:hover:bg-gray-600'
      }`}
    >
      {/* Suggestion Badge */}
      {hasSuggestions && (
        <div className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
          {item.pending_suggestions}
        </div>
      )}

      {/* Item Info */}
      <div className="flex items-start gap-3">
        <div className="text-3xl">{item.icon || '📦'}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {item.item_name}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {item.quantity} {item.unit}
          </p>
          {item.category && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {item.category}
            </p>
          )}
          {item.store && (
            <p className="text-xs text-gray-500 dark:text-gray-500">
              From: {item.store}
            </p>
          )}
        </div>
      </div>

      {/* Warning if has suggestions */}
      {hasSuggestions && (
        <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400">
          <AlertCircle size={14} />
          <span>{item.pending_suggestions} suggestion{item.pending_suggestions !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPutAway();
          }}
          className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
        >
          <CheckCircle size={14} />
          Put Away
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default StagingItemCard;
