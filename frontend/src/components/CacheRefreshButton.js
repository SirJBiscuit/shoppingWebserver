/**
 * CacheRefreshButton Component (CFS)
 * 
 * Provides manual cache refresh control for users
 * Uses modern CFS components for consistency
 */

import React, { useState } from 'react';
import { RefreshCw, Trash2, Info } from 'lucide-react';
import cacheManager from '../utils/cacheManager';
import { useNotification } from '../hooks/useNotification';
import CustomPanel from './CustomPanel';
import CustomNotification from './CustomNotification';

const CacheRefreshButton = ({ variant = 'icon', showStats = false }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const { notification, hideNotification, success, info } = useNotification();
  const [stats, setStats] = useState(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Clear expired cache
      cacheManager.clearExpired();
      
      // Reload the page to fetch fresh data
      success('Cache refreshed! Reloading...', { duration: 2000 });
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error refreshing cache:', error);
    }
  };

  const handleClearAll = () => {
    info(
      'Clear all cache?',
      'This will remove all cached data and reload the page.',
      [
        {
          label: 'Clear & Reload',
          onClick: () => {
            cacheManager.clearAll();
            window.location.reload();
          },
          color: 'bg-red-500'
        },
        {
          label: 'Cancel',
          variant: 'outline'
        }
      ]
    );
  };

  const handleShowStats = () => {
    const cacheStats = cacheManager.getStats();
    setStats(cacheStats);
    setShowStatsModal(true);
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Refresh cache"
        >
          <RefreshCw 
            className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
        </button>

        {showStats && (
          <button
            onClick={handleShowStats}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Cache statistics"
          >
            <Info className="w-5 h-5" />
          </button>
        )}

        {/* CFS CustomPanel for Cache Statistics */}
        <CustomPanel
          isOpen={showStatsModal && stats !== null}
          onClose={() => setShowStatsModal(false)}
          title="Cache Statistics"
          size="medium"
        >
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Total Entries:</span>
                <span className="font-semibold text-lg">{stats?.totalEntries || 0}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Total Size:</span>
                <span className="font-semibold text-lg">{stats?.totalSize || '0 KB'}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Expired Entries:</span>
                <span className="font-semibold text-lg text-yellow-600 dark:text-yellow-400">
                  {stats?.expiredEntries || 0}
                </span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className="text-gray-600 dark:text-gray-400">Version:</span>
                <span className="font-semibold text-lg">{stats?.version || '1.0.0'}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  cacheManager.clearExpired();
                  success('Expired cache cleared');
                  handleShowStats();
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Clear Expired
              </button>
              
              <button
                onClick={() => {
                  setShowStatsModal(false);
                  handleClearAll();
                }}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </button>
            </div>
          </div>
        </CustomPanel>

        {/* CFS CustomNotification */}
        <CustomNotification {...notification} onClose={hideNotification} />
      </>
    );
  }

  // Full button variant
  return (
    <div className="flex gap-2">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-2"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh Cache
      </button>

      <button
        onClick={handleClearAll}
        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
      >
        <Trash2 className="w-4 h-4" />
        Clear Cache
      </button>
    </div>
  );
};

export default CacheRefreshButton;
