/**
 * CFS Smart State Management Hook
 * 
 * Intelligent state management with optimistic updates,
 * automatic cache invalidation, and error recovery.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import cacheManager from '../utils/cacheManager';

/**
 * Smart state hook with optimistic updates and cache sync
 * 
 * @param {string} key - Cache key for this state
 * @param {Function} fetchFn - Function to fetch fresh data
 * @param {Object} options - Configuration options
 */
export const useSmartState = (key, fetchFn, options = {}) => {
  const {
    cacheExpiry = 60, // minutes
    optimistic = true, // Enable optimistic updates
    autoSync = true, // Auto-sync with cache
    onError = null, // Error callback
  } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const pendingOperations = useRef(new Set());
  const abortController = useRef(null);

  /**
   * Load data from cache or fetch fresh
   */
  const load = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);

    // Cancel any pending requests
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();

    try {
      // Try cache first
      if (!forceRefresh && autoSync) {
        const cached = cacheManager.get(key);
        if (cached) {
          setData(cached);
          setLoading(false);
          return cached;
        }
      }

      // Fetch fresh data
      const freshData = await fetchFn({ signal: abortController.current.signal });
      
      // Update cache
      if (autoSync) {
        cacheManager.set(key, freshData, cacheExpiry);
      }
      
      setData(freshData);
      setLoading(false);
      return freshData;
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled, ignore
      }
      
      console.error(`Error loading ${key}:`, err);
      setError(err);
      setLoading(false);
      
      if (onError) {
        onError(err);
      }
      
      return null;
    }
  }, [key, fetchFn, cacheExpiry, autoSync, onError]);

  /**
   * Add item with optimistic update
   */
  const add = useCallback(async (item, addFn) => {
    const operationId = Date.now();
    pendingOperations.current.add(operationId);

    try {
      // Optimistic update
      if (optimistic) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            return [...prevData, { ...item, _optimistic: true, _opId: operationId }];
          }
          return prevData;
        });
      }

      // Backend call
      const result = await addFn(item);

      // Update with real data
      setData(prevData => {
        if (Array.isArray(prevData)) {
          // Remove optimistic item and add real one
          const filtered = prevData.filter(i => i._opId !== operationId);
          return [...filtered, result];
        }
        return prevData;
      });

      // Update cache
      if (autoSync) {
        const currentData = await load(true);
        cacheManager.set(key, currentData, cacheExpiry);
      }

      pendingOperations.current.delete(operationId);
      return result;
    } catch (err) {
      console.error('Error adding item:', err);
      
      // Rollback optimistic update
      if (optimistic) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            return prevData.filter(i => i._opId !== operationId);
          }
          return prevData;
        });
      }

      pendingOperations.current.delete(operationId);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    }
  }, [key, optimistic, autoSync, cacheExpiry, load, onError]);

  /**
   * Update item with optimistic update
   */
  const update = useCallback(async (itemId, updates, updateFn) => {
    const operationId = Date.now();
    pendingOperations.current.add(operationId);

    // Store original for rollback
    let originalItem = null;

    try {
      // Optimistic update
      if (optimistic) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            return prevData.map(item => {
              if (item.id === itemId) {
                originalItem = { ...item };
                return { ...item, ...updates, _optimistic: true, _opId: operationId };
              }
              return item;
            });
          }
          return prevData;
        });
      }

      // Backend call
      const result = await updateFn(itemId, updates);

      // Update with real data
      setData(prevData => {
        if (Array.isArray(prevData)) {
          return prevData.map(item => 
            item.id === itemId ? { ...result, _optimistic: false } : item
          );
        }
        return prevData;
      });

      // Update cache
      if (autoSync) {
        const currentData = await load(true);
        cacheManager.set(key, currentData, cacheExpiry);
      }

      pendingOperations.current.delete(operationId);
      return result;
    } catch (err) {
      console.error('Error updating item:', err);
      
      // Rollback optimistic update
      if (optimistic && originalItem) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            return prevData.map(item => 
              item.id === itemId ? originalItem : item
            );
          }
          return prevData;
        });
      }

      pendingOperations.current.delete(operationId);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    }
  }, [key, optimistic, autoSync, cacheExpiry, load, onError]);

  /**
   * Remove item with optimistic update
   */
  const remove = useCallback(async (itemId, removeFn) => {
    const operationId = Date.now();
    pendingOperations.current.add(operationId);

    // Store original for rollback
    let originalItem = null;

    try {
      // Optimistic update
      if (optimistic) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            originalItem = prevData.find(item => item.id === itemId);
            return prevData.filter(item => item.id !== itemId);
          }
          return prevData;
        });
      }

      // Backend call
      await removeFn(itemId);

      // Ensure item is removed (in case optimistic update was disabled)
      setData(prevData => {
        if (Array.isArray(prevData)) {
          return prevData.filter(item => item.id !== itemId);
        }
        return prevData;
      });

      // Update cache
      if (autoSync) {
        cacheManager.invalidate(key);
      }

      pendingOperations.current.delete(operationId);
    } catch (err) {
      console.error('Error removing item:', err);
      
      // Rollback optimistic update
      if (optimistic && originalItem) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            return [...prevData, originalItem];
          }
          return prevData;
        });
      }

      pendingOperations.current.delete(operationId);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    }
  }, [key, optimistic, autoSync, onError]);

  /**
   * Batch update multiple items
   */
  const batchUpdate = useCallback(async (updates, batchFn) => {
    const operationId = Date.now();
    pendingOperations.current.add(operationId);

    const originalData = data;

    try {
      // Optimistic update
      if (optimistic) {
        setData(prevData => {
          if (Array.isArray(prevData)) {
            return prevData.map(item => {
              const update = updates.find(u => u.id === item.id);
              return update ? { ...item, ...update.changes } : item;
            });
          }
          return prevData;
        });
      }

      // Backend call
      await batchFn(updates);

      // Reload fresh data
      await load(true);

      pendingOperations.current.delete(operationId);
    } catch (err) {
      console.error('Error batch updating:', err);
      
      // Rollback
      if (optimistic) {
        setData(originalData);
      }

      pendingOperations.current.delete(operationId);
      
      if (onError) {
        onError(err);
      }
      
      throw err;
    }
  }, [data, optimistic, load, onError]);

  /**
   * Invalidate cache and reload
   */
  const invalidate = useCallback(async () => {
    if (autoSync) {
      cacheManager.invalidate(key);
    }
    return load(true);
  }, [key, autoSync, load]);

  /**
   * Check if there are pending operations
   */
  const isPending = useCallback(() => {
    return pendingOperations.current.size > 0;
  }, []);

  // Load on mount
  useEffect(() => {
    load();
    
    // Cleanup
    return () => {
      if (abortController.current) {
        abortController.current.abort();
      }
    };
  }, [load]);

  // Subscribe to cache changes
  useEffect(() => {
    if (!autoSync) return;

    const unsubscribe = cacheManager.subscribe(key, ({ action }) => {
      if (action === 'invalidate' || action === 'clear') {
        load(true);
      }
    });

    return unsubscribe;
  }, [key, autoSync, load]);

  return {
    data,
    loading,
    error,
    isPending: isPending(),
    
    // Operations
    load,
    add,
    update,
    remove,
    batchUpdate,
    invalidate,
    
    // Manual state control
    setData,
  };
};

export default useSmartState;
