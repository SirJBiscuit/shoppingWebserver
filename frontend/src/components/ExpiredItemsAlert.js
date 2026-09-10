import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, CheckCircle } from 'lucide-react';

const ExpiredItemsAlert = ({ expiredItems, onDismiss, onDelete, onStillGood }) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !expiredItems || expiredItems.length === 0) {
    return null;
  }

  const handleDismissAll = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  const handleDeleteItem = async (item) => {
    await onDelete(item);
    // If no more items, auto-dismiss
    if (expiredItems.length === 1) {
      setDismissed(true);
    }
  };

  const handleStillGood = async (item) => {
    await onStillGood(item);
    // If no more items, auto-dismiss
    if (expiredItems.length === 1) {
      setDismissed(true);
    }
  };

  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <h3 className="font-semibold text-red-900 dark:text-red-100">
            {expiredItems.length} Expired Item{expiredItems.length !== 1 ? 's' : ''}
          </h3>
        </div>
        <button
          onClick={handleDismissAll}
          className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {expiredItems.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-3 shadow-sm"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-2xl flex-shrink-0">{item.item_icon || '📦'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {item.item_name}
                </p>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Expired {new Date(item.estimated_expiry_date).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              <button
                onClick={() => handleStillGood(item)}
                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                title="Still Good"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDeleteItem(item)}
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
        <p className="text-sm text-red-700 dark:text-red-300">
          Review these items and mark them as "Still Good" or delete them from your inventory.
        </p>
      </div>
    </div>
  );
};

export default ExpiredItemsAlert;
