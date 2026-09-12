import React, { useState, useEffect } from 'react';
import { Lightbulb, Calendar, DollarSign, TrendingDown, Store, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ShoppingRecommendations = ({ onItemClick }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, []);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/price-trends/recommendations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch recommendations');

      const data = await response.json();
      setRecommendations(data.recommendations || []);
      setSummary(data.summary);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-blue-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-blue-100 rounded"></div>
            <div className="h-16 bg-blue-100 rounded"></div>
            <div className="h-16 bg-blue-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Lightbulb className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800">Smart Shopping Tips</h3>
        </div>
        <p className="text-gray-600 text-sm">
          {error ? error : 'Shop more to get personalized recommendations!'}
        </p>
      </div>
    );
  }

  const topRecommendations = recommendations.slice(0, 5);
  const totalSavings = summary?.total_potential_savings || 0;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-blue-100/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Lightbulb className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">Smart Shopping Tips</h3>
              <p className="text-sm text-gray-600">
                Save up to ${totalSavings.toFixed(2)}/week
              </p>
            </div>
          </div>
          <motion.div
            animate={{ rotate: expanded ? 90 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-3">
              {topRecommendations.map((rec, index) => (
                <motion.div
                  key={rec.item_name}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onItemClick && onItemClick(rec.item_name)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {rec.item_name}
                      </h4>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <span>Shop on <span className="font-semibold text-blue-600">{rec.best_day}</span></span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1 text-gray-500">
                          <DollarSign className="w-3 h-3" />
                          <span>Current: ${rec.current_avg_price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center gap-1 text-green-600 font-semibold">
                          <TrendingDown className="w-3 h-3" />
                          <span>Best: ${rec.best_day_price.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold mb-1">
                        Save ${rec.potential_savings.toFixed(2)}
                      </div>
                      <div className={`text-xs ${
                        rec.confidence === 'high' 
                          ? 'text-green-600' 
                          : rec.confidence === 'medium'
                          ? 'text-yellow-600'
                          : 'text-gray-500'
                      }`}>
                        {rec.confidence === 'high' ? '✓ High confidence' : 
                         rec.confidence === 'medium' ? '~ Medium confidence' : 
                         '? Low confidence'}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {recommendations.length > 5 && (
                <button 
                  className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  onClick={() => {/* Navigate to full recommendations page */}}
                >
                  View all {recommendations.length} recommendations →
                </button>
              )}

              {summary && (
                <div className="bg-blue-100 rounded-lg p-4 mt-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-blue-700">
                        {summary.items_analyzed}
                      </p>
                      <p className="text-xs text-gray-600">Items Analyzed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-700">
                        {summary.items_with_savings}
                      </p>
                      <p className="text-xs text-gray-600">With Savings</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-700">
                        ${summary.avg_savings_per_item.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-600">Avg/Item</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShoppingRecommendations;
