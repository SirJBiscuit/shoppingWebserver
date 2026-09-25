/**
 * CFS Cache Management System
 * 
 * Handles intelligent cache invalidation and refresh
 * to prevent ghost data and stale state issues.
 */

const CACHE_VERSION = '1.0.0';
const CACHE_KEYS = {
  SHOPPING_LISTS: 'shopping_lists',
  SHOPPING_ITEMS: 'shopping_items',
  INVENTORY: 'inventory',
  USER_PREFERENCES: 'user_preferences',
  STORE_DATA: 'store_data',
  MDL_DATA: 'mdl_data',
};

class CacheManager {
  constructor() {
    this.version = CACHE_VERSION;
    this.listeners = new Map();
  }

  /**
   * Get cache key with version
   */
  getCacheKey(key) {
    return `cache_v${this.version}_${key}`;
  }

  /**
   * Set item in cache with timestamp
   */
  set(key, data, expiresInMinutes = 60) {
    const cacheData = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + (expiresInMinutes * 60 * 1000),
      version: this.version,
    };
    
    try {
      localStorage.setItem(this.getCacheKey(key), JSON.stringify(cacheData));
      this.notifyListeners(key, 'set', data);
    } catch (error) {
      console.error('Cache set error:', error);
      // If quota exceeded, clear old cache
      this.clearExpired();
    }
  }

  /**
   * Get item from cache (returns null if expired)
   */
  get(key) {
    try {
      const cached = localStorage.getItem(this.getCacheKey(key));
      if (!cached) return null;

      const cacheData = JSON.parse(cached);
      
      // Check version
      if (cacheData.version !== this.version) {
        this.remove(key);
        return null;
      }

      // Check expiration
      if (Date.now() > cacheData.expires) {
        this.remove(key);
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Remove item from cache
   */
  remove(key) {
    localStorage.removeItem(this.getCacheKey(key));
    this.notifyListeners(key, 'remove', null);
  }

  /**
   * Clear all cache for a specific category
   */
  clearCategory(category) {
    const prefix = this.getCacheKey(category);
    const keys = Object.keys(localStorage);
    
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
    
    this.notifyListeners(category, 'clear', null);
  }

  /**
   * Clear all expired cache entries
   */
  clearExpired() {
    const keys = Object.keys(localStorage);
    const now = Date.now();
    
    keys.forEach(key => {
      if (key.startsWith('cache_v')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          if (data.expires && now > data.expires) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  }

  /**
   * Clear all cache (nuclear option)
   */
  clearAll() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_v')) {
        localStorage.removeItem(key);
      }
    });
    
    this.notifyListeners('*', 'clear_all', null);
  }

  /**
   * Invalidate cache when data changes on server
   */
  invalidate(key) {
    this.remove(key);
    console.log(`Cache invalidated: ${key}`);
  }

  /**
   * Invalidate multiple keys
   */
  invalidateMultiple(keys) {
    keys.forEach(key => this.invalidate(key));
  }

  /**
   * Subscribe to cache changes
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback);
      }
    };
  }

  /**
   * Notify listeners of cache changes
   */
  notifyListeners(key, action, data) {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => callback({ key, action, data }));
    }

    // Notify wildcard listeners
    const wildcardListeners = this.listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => callback({ key, action, data }));
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith('cache_v'));
    
    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    cacheKeys.forEach(key => {
      const value = localStorage.getItem(key);
      totalSize += value.length;

      try {
        const data = JSON.parse(value);
        if (data.expires && now > data.expires) {
          expiredCount++;
        }
      } catch (error) {
        // Invalid entry
      }
    });

    return {
      totalEntries: cacheKeys.length,
      totalSize: (totalSize / 1024).toFixed(2) + ' KB',
      expiredEntries: expiredCount,
      version: this.version,
    };
  }

  /**
   * Bump cache version (invalidates all cache)
   */
  bumpVersion() {
    const oldVersion = this.version;
    const newVersion = (parseFloat(oldVersion) + 0.1).toFixed(1);
    
    // Clear old version cache
    this.clearAll();
    
    // Update version
    this.version = newVersion;
    localStorage.setItem('cache_version', newVersion);
    
    console.log(`Cache version bumped: ${oldVersion} → ${newVersion}`);
  }
}

// Singleton instance
const cacheManager = new CacheManager();

// Auto-clear expired cache on load
cacheManager.clearExpired();

// Check for version mismatch
const storedVersion = localStorage.getItem('cache_version');
if (storedVersion && storedVersion !== CACHE_VERSION) {
  console.log('Cache version mismatch, clearing old cache');
  cacheManager.clearAll();
  localStorage.setItem('cache_version', CACHE_VERSION);
}

export default cacheManager;
export { CACHE_KEYS };
