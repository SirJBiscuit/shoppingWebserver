/**
 * useCache Hook
 * 
 * React hook for intelligent cache management
 */

import { useState, useEffect, useCallback } from 'react';
import cacheManager, { CACHE_KEYS } from '../utils/cacheManager';

export const useCache = (key, fetchFunction, options = {}) => {
  const {
    expiresInMinutes = 60,
    refreshOnMount = false,
    refreshInterval = null,
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load data from cache or fetch fresh
   */
  const loadData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    try {
      // Try cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = cacheManager.get(key);
        if (cached) {
          setData(cached);
          setLoading(false);
          return cached;
        }
      }

      // Fetch fresh data
      const freshData = await fetchFunction();
      
      // Cache it
      cacheManager.set(key, freshData, expiresInMinutes);
      
      setData(freshData);
      setLoading(false);
      return freshData;
    } catch (err) {
      console.error(`Error loading ${key}:`, err);
      setError(err);
      setLoading(false);
      return null;
    }
  }, [key, fetchFunction, expiresInMinutes]);

  /**
   * Refresh data (force fetch)
   */
  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  /**
   * Invalidate cache for this key
   */
  const invalidate = useCallback(() => {
    cacheManager.invalidate(key);
    setData(null);
  }, [key]);

  /**
   * Update cached data without fetching
   */
  const updateCache = useCallback((newData) => {
    cacheManager.set(key, newData, expiresInMinutes);
    setData(newData);
  }, [key, expiresInMinutes]);

  // Load on mount
  useEffect(() => {
    loadData(refreshOnMount);
  }, [loadData, refreshOnMount]);

  // Auto-refresh interval
  useEffect(() => {
    if (refreshInterval) {
      const interval = setInterval(() => {
        loadData(true);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, loadData]);

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = cacheManager.subscribe(key, ({ action, data: newData }) => {
      if (action === 'set' && newData) {
        setData(newData);
      } else if (action === 'remove' || action === 'clear') {
        setData(null);
      }
    });

    return unsubscribe;
  }, [key]);

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    updateCache,
  };
};

/**
 * Hook for shopping lists cache
 */
export const useShoppingListsCache = () => {
  return useCache(
    CACHE_KEYS.SHOPPING_LISTS,
    async () => {
      const response = await fetch('/api/shopping/lists', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch lists');
      return response.json();
    },
    { expiresInMinutes: 30 }
  );
};

/**
 * Hook for shopping items cache
 */
export const useShoppingItemsCache = (listId) => {
  return useCache(
    `${CACHE_KEYS.SHOPPING_ITEMS}_${listId}`,
    async () => {
      const response = await fetch(`/api/shopping/lists/${listId}/items`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    },
    { expiresInMinutes: 15 }
  );
};

/**
 * Hook for inventory cache
 */
export const useInventoryCache = () => {
  return useCache(
    CACHE_KEYS.INVENTORY,
    async () => {
      const response = await fetch('/api/inventory', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    },
    { expiresInMinutes: 30 }
  );
};

export default useCache;
