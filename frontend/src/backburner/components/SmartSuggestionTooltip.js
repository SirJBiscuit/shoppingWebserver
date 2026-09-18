import React, { useState } from 'react';
import { AlertCircle, CheckCircle, X, Plus, TrendingUp, Clock, Package } from 'lucide-react';

const SmartSuggestionTooltip = ({ 
  type, 
  item, 
  inventoryData, 
  onAction, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    if (onDismiss) onDismiss();
  };

  const renderContent = () => {
    switch (type) {
      case 'already-have':
        return (
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                You already have this in {inventoryData.location}
              </p>
              <div className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                <span className="font-semibold">{inventoryData.quantity} {inventoryData.unit}</span>
                {inventoryData.expiresIn && (
                  <span className="ml-2">• Expires in {inventoryData.expiresIn} days</span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onAction('remove')}
                  className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                >
                  Remove from list
                </button>
                <button
                  onClick={() => onAction('keep')}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Keep anyway
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
            >
              <X size={16} />
            </button>
          </div>
        );

      case 'smart-reorder':
        return (
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                💡 Smart Suggestion
              </p>
              <div className="mt-1 text-xs text-blue-700 dark:text-blue-300">
                Based on your usage, you buy <span className="font-semibold">{item.name}</span> every{' '}
                <span className="font-semibold">{inventoryData.avgDays} days</span>
              </div>
              <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                Suggested: <span className="font-semibold">{inventoryData.suggestedAmount} {inventoryData.unit}</span>
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onAction('add-suggested', inventoryData.suggestedAmount)}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Add {inventoryData.suggestedAmount}
                </button>
                <button
                  onClick={() => onAction('customize')}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Custom amount
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              <X size={16} />
            </button>
          </div>
        );

      case 'low-stock':
        return (
          <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <Package className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                📉 Running low on {item.name}
              </p>
              <div className="mt-1 text-xs text-orange-700 dark:text-orange-300">
                Only <span className="font-semibold">{inventoryData.currentAmount} {inventoryData.unit}</span> left
                {inventoryData.avgUsage && (
                  <span className="ml-2">• You use ~{inventoryData.avgUsage}/week</span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onAction('add', 1)}
                  className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  Add 1
                </button>
                <button
                  onClick={() => onAction('add', 2)}
                  className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
                >
                  Add 2
                </button>
                <button
                  onClick={() => onAction('customize')}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Custom
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-800 dark:hover:text-orange-200"
            >
              <X size={16} />
            </button>
          </div>
        );

      case 'expiring-soon':
        return (
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <Clock className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-900 dark:text-red-100">
                🔔 {item.name} is expiring soon
              </p>
              <div className="mt-1 text-xs text-red-700 dark:text-red-300">
                Expires in <span className="font-semibold">{inventoryData.daysUntilExpiry} days</span>
                {inventoryData.location && (
                  <span className="ml-2">• In {inventoryData.location}</span>
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => onAction('add-to-list')}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors flex items-center gap-1"
                >
                  <Plus size={12} />
                  Add to shopping list
                </button>
                <button
                  onClick={() => onAction('use-now')}
                  className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  I'll use it
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
            >
              <X size={16} />
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="my-2 animate-in slide-in-from-top-2 duration-300">
      {renderContent()}
    </div>
  );
};

export default SmartSuggestionTooltip;
