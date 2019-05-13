/**
 * phyx.js needs to cache several kinds of data to avoid reparsing them over and
 * over again, such as scientific names. This CacheManager provides that facility,
 * and allows users of this library to clear the cache as needed.
 *
 * We might want to replace this with a cache that limits the amount of memory,
 * such as https://www.npmjs.com/package/safe-memory-cache.
 */

class CacheManager {
  /** Construct a new cache manager. */
  constructor() {
    this.clear();
  }

  /** Clear all current caches. */
  clear() {
    this.caches = {};
  }

  /** Return true if we have a value for this particular cache key. */
  has(cacheName, cacheKey) {
    return hasOwnProperty(this.caches, cacheName)
      && hasOwnProperty(this.caches[cacheName], cacheKey);
  }

  /** Look up the value of a key in a particular cache. */
  get(cacheName, cacheKey) {
    if (!hasOwnProperty(this.caches, cacheName)) this.caches[cacheName] = {};
    if (!hasOwnProperty(this.caches[cacheName], cacheKey)) return undefined;
    return this.caches[cacheName][cacheKey];
  }

  /** Set the value of a key in a particular cache. */
  put(cacheName, cacheKey, value) {
    if (!hasOwnProperty(this.caches, cacheName)) this.caches[cacheName] = {};
    if (!hasOwnProperty(this.caches[cacheName], cacheKey)) this.caches[cacheName][cacheKey] = {};
    this.caches[cacheName][cacheKey] = value;
  }
}

/*
 * Unless you meddle with require.cache, this should always return the same instance
 * of the cache manager. See the following link for a discussion of this approach:
 * https://derickbailey.com/2016/03/09/creating-a-true-singleton-in-node-js-with-es6-symbols/
 */
module.exports = {
  PhyxCacheManager: new CacheManager(),
};
