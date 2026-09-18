import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, MapPin } from 'lucide-react';
import { motion } from 'framer-motion';

const PriceHistory = ({ itemName }) => {
  const [priceHistory, setPriceHistory] = useState([]);
  const [stores, setStores] = useState([]);

  useEffect(() => {
    loadPriceHistory();
  }, [itemName]);

  const loadPriceHistory = () => {
    // Load from localStorage
    const saved = localStorage.getItem(`priceHistory_${itemName}`);
    if (saved) {
      const history = JSON.parse(saved);
      setPriceHistory(history);
      
      // Extract unique stores
      const uniqueStores = [...new Set(history.map(h => h.store))];
      setStores(uniqueStores);
    }
  };

  const addPriceEntry = (price, store) => {
    const entry = {
      price: parseFloat(price),
      store,
      date: new Date().toISOString(),
    };

    const updated = [...priceHistory, entry];
    setPriceHistory(updated);
    localStorage.setItem(`priceHistory_${itemName}`, JSON.stringify(updated));
  };

  const getAveragePrice = () => {
    if (priceHistory.length === 0) return 0;
    const sum = priceHistory.reduce((acc, h) => acc + h.price, 0);
    return sum / priceHistory.length;
  };

  const getLowestPrice = () => {
    if (priceHistory.length === 0) return null;
    return priceHistory.reduce((min, h) => h.price < min.price ? h : min);
  };

  const getHighestPrice = () => {
    if (priceHistory.length === 0) return null;
    return priceHistory.reduce((max, h) => h.price > max.price ? h : max);
  };

  const getPriceByStore = (store) => {
    const storeEntries = priceHistory.filter(h => h.store === store);
    if (storeEntries.length === 0) return null;
    
    const sum = storeEntries.reduce((acc, h) => acc + h.price, 0);
    return sum / storeEntries.length;
  };

  const getPriceTrend = () => {
    if (priceHistory.length < 2) return 'stable';
    
    const recent = priceHistory.slice(-5);
    const firstPrice = recent[0].price;
    const lastPrice = recent[recent.length - 1].price;
    
    if (lastPrice > firstPrice * 1.1) return 'up';
    if (lastPrice < firstPrice * 0.9) return 'down';
    return 'stable';
  };

  const lowest = getLowestPrice();
  const highest = getHighestPrice();
  const average = getAveragePrice();
  const trend = getPriceTrend();

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      {priceHistory.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                Lowest
              </span>
              <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">
              ${lowest?.price.toFixed(2)}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400">
              {lowest?.store}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Average
              </span>
              <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">
              ${average.toFixed(2)}
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              {priceHistory.length} entries
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                Highest
              </span>
              <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">
              ${highest?.price.toFixed(2)}
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              {highest?.store}
            </p>
          </motion.div>
        </div>
      )}

      {/* Price Trend */}
      {priceHistory.length > 1 && (
        <div className={`p-3 rounded-lg ${
          trend === 'up' ? 'bg-red-50 dark:bg-red-900/20' :
          trend === 'down' ? 'bg-green-50 dark:bg-green-900/20' :
          'bg-gray-50 dark:bg-gray-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Price Trend
            </span>
            <div className={`flex items-center ${
              trend === 'up' ? 'text-red-600 dark:text-red-400' :
              trend === 'down' ? 'text-green-600 dark:text-green-400' :
              'text-gray-600 dark:text-gray-400'
            }`}>
              {trend === 'up' && <TrendingUp className="w-4 h-4 mr-1" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 mr-1" />}
              <span className="text-sm font-medium">
                {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Store Comparison */}
      {stores.length > 1 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Average by Store
          </h4>
          {stores.map(store => {
            const storeAvg = getPriceByStore(store);
            const isLowest = storeAvg === Math.min(...stores.map(s => getPriceByStore(s)));
            
            return (
              <div
                key={store}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  isLowest 
                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                    : 'bg-gray-50 dark:bg-gray-800'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-900 dark:text-white">{store}</span>
                  {isLowest && (
                    <span className="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
                      Best Price
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  ${storeAvg.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent History */}
      {priceHistory.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Recent Prices
          </h4>
          <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
            {priceHistory.slice(-10).reverse().map((entry, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm"
              >
                <div>
                  <span className="text-gray-900 dark:text-white font-medium">
                    ${entry.price.toFixed(2)}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 ml-2">
                    at {entry.store}
                  </span>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {new Date(entry.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {priceHistory.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p className="text-sm">No price history yet</p>
          <p className="text-xs mt-1">Prices will be tracked automatically</p>
        </div>
      )}
    </div>
  );
};

export default PriceHistory;
