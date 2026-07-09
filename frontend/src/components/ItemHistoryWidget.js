import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Package, Clock } from 'lucide-react';
import { itemsAPI } from '../services/api';

const ItemHistoryWidget = ({ itemName }) => {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, [itemName]);

  const loadHistory = async () => {
    try {
      const response = await itemsAPI.getPreference(itemName);
      setHistory(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading item history:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg p-4 h-32"></div>
    );
  }

  if (!history || !history.purchase_count) {
    return null;
  }

  const daysSinceLastPurchase = history.last_purchased 
    ? Math.floor((new Date() - new Date(history.last_purchased)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
          <Clock className="w-4 h-4 mr-2" />
          Purchase History
        </h3>
        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
          {history.purchase_count}× bought
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Average Price */}
        {history.average_price && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
              <DollarSign className="w-3 h-3 mr-1" />
              Avg Price
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              ${parseFloat(history.average_price).toFixed(2)}
            </div>
          </div>
        )}

        {/* Last Purchased */}
        {daysSinceLastPurchase !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Calendar className="w-3 h-3 mr-1" />
              Last Bought
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {daysSinceLastPurchase === 0 ? 'Today' : 
               daysSinceLastPurchase === 1 ? 'Yesterday' :
               `${daysSinceLastPurchase}d ago`}
            </div>
          </div>
        )}

        {/* Preferred Quantity */}
        {history.preferred_quantity && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
              <Package className="w-3 h-3 mr-1" />
              Usual Qty
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {history.preferred_quantity} {history.preferred_unit || ''}
            </div>
          </div>
        )}

        {/* Purchase Frequency */}
        {history.purchase_count > 1 && daysSinceLastPurchase !== null && (
          <div className="bg-white dark:bg-gray-800 rounded-lg p-3">
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mb-1">
              <TrendingUp className="w-3 h-3 mr-1" />
              Frequency
            </div>
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {history.purchase_count > 10 ? 'Very Often' :
               history.purchase_count > 5 ? 'Often' :
               history.purchase_count > 2 ? 'Sometimes' : 'Rarely'}
            </div>
          </div>
        )}
      </div>

      {/* Price Trend Indicator */}
      {history.min_price && history.max_price && history.min_price !== history.max_price && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Price Range:</span>
            <div className="flex items-center space-x-2">
              <span className="text-green-600 dark:text-green-400 font-medium">
                ${parseFloat(history.min_price).toFixed(2)}
              </span>
              <span className="text-gray-400">→</span>
              <span className="text-red-600 dark:text-red-400 font-medium">
                ${parseFloat(history.max_price).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemHistoryWidget;
