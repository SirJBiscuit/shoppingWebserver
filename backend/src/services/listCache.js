// In-memory cache for shopping lists with TTL and LRU eviction
// Prevents database hammering for frequently accessed lists

class ListCache {
  constructor(maxSize = 1000, ttlMs = 5 * 60 * 1000) { // 5 minute TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.hits = 0;
    this.misses = 0;
  }

  // Generate cache key
  _key(userId, listId) {
    return `${userId}:${listId}`;
  }

  // Get from cache
  get(userId, listId) {
    const key = this._key(userId, listId);
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hits++;
    return entry.data;
  }

  // Set in cache
  set(userId, listId, data) {
    const key = this._key(userId, listId);

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Invalidate specific list
  invalidate(userId, listId) {
    const key = this._key(userId, listId);
    this.cache.delete(key);
  }

  // Invalidate all lists for a user
  invalidateUser(userId) {
    const prefix = `${userId}:`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  // Clear entire cache
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  // Get cache statistics
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// Singleton instance
const listCache = new ListCache();

module.exports = listCache;
