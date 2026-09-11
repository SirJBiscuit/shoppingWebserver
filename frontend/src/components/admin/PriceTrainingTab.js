import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import PriceReviewCard from './PriceReviewCard';
import { useToast } from '../../hooks/useToast';

const PriceTrainingTab = ({ onStatsUpdate }) => {
  const [view, setView] = useState('pending'); // pending, outliers, recent
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    loadPrices();
  }, [view]);

  const loadPrices = async () => {
    try {
      setLoading(true);
      let endpoint = '';
      
      switch (view) {
        case 'pending':
          endpoint = '/api/admin/training/prices/pending';
          break;
        case 'outliers':
          endpoint = '/api/admin/training/prices/outliers';
          break;
        case 'recent':
          endpoint = '/api/admin/training/prices/recent';
          break;
        default:
          endpoint = '/api/admin/training/prices/pending';
      }
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrices(data.prices || data.outliers || data);
      } else {
        error('Failed to load prices');
      }
    } catch (err) {
      console.error('Error loading prices:', err);
      error('Failed to load prices');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (priceId) => {
    try {
      const response = await fetch(`/api/admin/training/prices/${priceId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        success('Price approved successfully');
        loadPrices();
        if (onStatsUpdate) onStatsUpdate();
      } else {
        error('Failed to approve price');
      }
    } catch (err) {
      console.error('Error approving price:', err);
      error('Failed to approve price');
    }
  };

  const handleReject = async (priceId, reason) => {
    try {
      const response = await fetch(`/api/admin/training/prices/${priceId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      
      if (response.ok) {
        success('Price rejected');
        loadPrices();
        if (onStatsUpdate) onStatsUpdate();
      } else {
        error('Failed to reject price');
      }
    } catch (err) {
      console.error('Error rejecting price:', err);
      error('Failed to reject price');
    }
  };

  const handleEdit = async (priceId, updates) => {
    try {
      const response = await fetch(`/api/admin/training/prices/${priceId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (response.ok) {
        success('Price updated successfully');
        loadPrices();
        if (onStatsUpdate) onStatsUpdate();
      } else {
        error('Failed to update price');
      }
    } catch (err) {
      console.error('Error updating price:', err);
      error('Failed to update price');
    }
  };

  const runOutlierDetection = async () => {
    try {
      setProcessing(true);
      const response = await fetch('/api/admin/training/prices/detect-outliers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        success(`Outlier detection complete. Found ${data.outliersFound} outliers.`);
        loadPrices();
        if (onStatsUpdate) onStatsUpdate();
      } else {
        error('Failed to run outlier detection');
      }
    } catch (err) {
      console.error('Error running outlier detection:', err);
      error('Failed to run outlier detection');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* View Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setView('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'pending'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Pending
          </button>
          
          <button
            onClick={() => setView('outliers')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'outliers'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <AlertTriangle className="w-4 h-4 inline mr-2" />
            Outliers
          </button>
          
          <button
            onClick={() => setView('recent')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === 'recent'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <CheckCircle className="w-4 h-4 inline mr-2" />
            Recent
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={runOutlierDetection}
            disabled={processing}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
                Detecting...
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Run Outlier Detection
              </>
            )}
          </button>
          
          <button
            onClick={loadPrices}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 inline mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Price List */}
      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading prices...</p>
        </div>
      ) : prices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            All Clear!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {view === 'pending' && 'No prices pending review'}
            {view === 'outliers' && 'No outliers detected'}
            {view === 'recent' && 'No recent submissions'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {prices.map((price) => (
            <PriceReviewCard
              key={price.id}
              price={price}
              onApprove={handleApprove}
              onReject={handleReject}
              onEdit={handleEdit}
              showActions={view !== 'recent'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default PriceTrainingTab;
