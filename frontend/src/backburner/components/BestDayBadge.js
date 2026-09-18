import React, { useState, useEffect } from 'react';
import { Calendar, TrendingDown, AlertCircle } from 'lucide-react';

const BestDayBadge = ({ itemName, storeName = null, currentPrice = null, compact = false }) => {
  const [bestDay, setBestDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBestDay();
  }, [itemName, storeName]);

  const fetchBestDay = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const storeParam = storeName ? `?store_name=${encodeURIComponent(storeName)}` : '';
      const response = await fetch(
        `/api/price-trends/item/${encodeURIComponent(itemName)}/trends${storeParam}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch trends');

      const data = await response.json();
      
      if (data.recommendations && data.recommendations.best_day_to_buy) {
        setBestDay(data.recommendations.best_day_to_buy);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching best day:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (loading) {
    return compact ? null : (
      <div className="animate-pulse bg-gray-100 rounded-lg px-3 py-2 w-48 h-10"></div>
    );
  }

  if (error || !bestDay) {
    return null;
  }

  const savings = currentPrice && bestDay.avg_price 
    ? currentPrice - bestDay.avg_price 
    : bestDay.potential_savings || 0;

  const confidence = bestDay.confidence || 'low';
  const sampleCount = bestDay.sample_count || 0;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
        <Calendar className="w-3 h-3" />
        <span>Best: {bestDay.day}</span>
        {savings > 0 && (
          <span className="text-green-800 font-bold">
            -${savings.toFixed(2)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 ${
      confidence === 'high' 
        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' 
        : 'bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${
          confidence === 'high' ? 'bg-green-100' : 'bg-yellow-100'
        }`}>
          <Calendar className={`w-5 h-5 ${
            confidence === 'high' ? 'text-green-600' : 'text-yellow-600'
          }`} />
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold text-sm ${
              confidence === 'high' ? 'text-green-800' : 'text-yellow-800'
            }`}>
              Best Day to Buy
            </h4>
            {confidence === 'low' && (
              <AlertCircle className="w-4 h-4 text-yellow-600" title="Limited data available" />
            )}
          </div>
          
          <p className="text-lg font-bold text-gray-900 mb-1">
            {bestDay.day}
          </p>
          
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">
              Avg: <span className="font-semibold text-gray-900">${bestDay.avg_price.toFixed(2)}</span>
            </span>
            
            {savings > 0 && (
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <TrendingDown className="w-4 h-4" />
                Save ${savings.toFixed(2)}
              </div>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            Based on {sampleCount} price {sampleCount === 1 ? 'entry' : 'entries'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BestDayBadge;
