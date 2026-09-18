import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

const TrendingItems = ({ onItemClick, maxItems = 10 }) => {
  const [trendingItems, setTrendingItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'up', 'down'

  useEffect(() => {
    fetchTrendingItems();
  }, []);

  const fetchTrendingItems = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/price-trends/dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch trending items');

      const data = await response.json();
      setTrendingItems(data.trending_items || []);
      setSummary(data.summary);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching trending items:', err);
      setLoading(false);
    }
  };

  const filteredItems = trendingItems.filter(item => {
    if (filter === 'up') return item.trend === 'up';
    if (filter === 'down') return item.trend === 'down';
    return true;
  }).slice(0, maxItems);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (trendingItems.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-6 h-6 text-gray-400" />
          <h3 className="text-lg font-bold text-gray-800">Trending Prices</h3>
        </div>
        <p className="text-gray-500 text-sm">
          No trending items available yet. Keep tracking prices!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-purple-600" />
            <h3 className="text-lg font-bold text-gray-800">Trending Prices</h3>
          </div>
          
          {summary && (
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-red-500" />
                <span className="text-red-600 font-semibold">{summary.price_increases}</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingDown className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-semibold">{summary.price_decreases}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('up')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'up'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-1" />
            Increasing
          </button>
          <button
            onClick={() => setFilter('down')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              filter === 'down'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <TrendingDown className="w-4 h-4 inline mr-1" />
            Decreasing
          </button>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.item_name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => onItemClick && onItemClick(item.item_name)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {item.item_name}
                </h4>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <span>
                    Was: <span className="font-medium">${item.previous_price.toFixed(2)}</span>
                  </span>
                  <span>→</span>
                  <span>
                    Now: <span className="font-medium">${item.current_price.toFixed(2)}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1 px-3 py-1 rounded-lg font-semibold ${
                  item.trend === 'up'
                    ? 'bg-red-50 text-red-600'
                    : item.trend === 'down'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-gray-50 text-gray-600'
                }`}>
                  {item.trend === 'up' ? (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>+{Math.abs(item.change_percent).toFixed(1)}%</span>
                    </>
                  ) : item.trend === 'down' ? (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      <span>-{Math.abs(item.change_percent).toFixed(1)}%</span>
                    </>
                  ) : (
                    <span>~{Math.abs(item.change_percent).toFixed(1)}%</span>
                  )}
                </div>

                <div className={`text-right ${
                  item.change > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  <div className="text-lg font-bold">
                    {item.change > 0 ? '+' : ''}${Math.abs(item.change).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.trend === 'up' ? 'more expensive' : 'cheaper'}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <p>No {filter === 'up' ? 'increasing' : 'decreasing'} prices found</p>
        </div>
      )}
    </div>
  );
};

export default TrendingItems;
