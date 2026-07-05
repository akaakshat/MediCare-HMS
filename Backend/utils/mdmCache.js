// utils/mdmCache.js
// In-memory caching for Master Data Management

class MDMCache {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time-to-live for each cache entry
    this.defaultTTL = 1000 * 60 * 60; // 1 hour default
  }

  /**
   * Generate cache key
   * @param {String} type - Master data type
   * @param {Boolean} activeOnly - Only active records
   * @returns {String} Cache key
   */
  getCacheKey(type, activeOnly = true) {
    return `mdm:${type}:${activeOnly ? 'active' : 'all'}`;
  }

  /**
   * Get data from cache
   * @param {String} type - Master data type
   * @param {Boolean} activeOnly - Only active records
   * @returns {Array|null} Cached data or null if expired/not found
   */
  get(type, activeOnly = true) {
    const key = this.getCacheKey(type, activeOnly);
    
    // Check if TTL expired
    if (this.ttl.has(key) && Date.now() > this.ttl.get(key)) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }

    return this.cache.get(key) || null;
  }

  /**
   * Set data in cache
   * @param {String} type - Master data type
   * @param {Array} data - Data to cache
   * @param {Boolean} activeOnly - Only active records
   * @param {Number} ttl - Time-to-live in milliseconds (optional)
   */
  set(type, data, activeOnly = true, ttl = null) {
    const key = this.getCacheKey(type, activeOnly);
    this.cache.set(key, data);
    this.ttl.set(key, Date.now() + (ttl || this.defaultTTL));
  }

  /**
   * Invalidate cache for a specific type
   * @param {String} type - Master data type
   */
  invalidate(type) {
    const keyActive = this.getCacheKey(type, true);
    const keyAll = this.getCacheKey(type, false);
    
    this.cache.delete(keyActive);
    this.cache.delete(keyAll);
    this.ttl.delete(keyActive);
    this.ttl.delete(keyAll);
  }

  /**
   * Invalidate all cache
   */
  invalidateAll() {
    this.cache.clear();
    this.ttl.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.cache.size * 50 // Rough estimate
    };
  }

  /**
   * Set custom TTL
   * @param {Number} ttl - Time-to-live in milliseconds
   */
  setDefaultTTL(ttl) {
    this.defaultTTL = ttl;
  }
}

// Export singleton instance
module.exports = new MDMCache();
