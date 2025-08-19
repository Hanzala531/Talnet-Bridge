/**
 * REDIS CACHE MIDDLEWARES
 * 
 * This module provides caching middleware for performance optimization.
 * Implements graceful degradation when Redis is not available.
 * 
 * Features:
 * - Generic cache middleware with configurable TTL
 * - User-specific cache middleware
 * - Cache invalidation helpers
 * - Graceful fallback when Redis is unavailable
 * - Performance monitoring
 */

import redisClient from "../config/redis.config.js";

/**
 * Generic cache middleware with graceful fallback
 * 
 * @param {string} keyPrefix - Prefix for cache keys
 * @param {number} expirySeconds - TTL in seconds (default: 60)
 * @param {boolean} userSpecific - Whether to include user ID in cache key
 * @returns {Function} Express middleware function
 */
export const cacheMiddleware = (keyPrefix, expirySeconds = 60, userSpecific = false) => {
  return async (req, res, next) => {
    // Skip caching if Redis is not available
    if (!redisClient.isConnected()) {
      return next();
    }

    try {
      const userPart = userSpecific && req.user ? `:${req.user._id}` : '';
      const key = `${keyPrefix}${userPart}:${JSON.stringify(req.params)}:${JSON.stringify(req.query)}`;

      const cachedData = await redisClient.get(key);
      if (cachedData) {
        console.log(`💾 Cache hit: ${keyPrefix}`);
        return res.json(JSON.parse(cachedData));
      }

      // Store original json method
      const originalJson = res.json.bind(res);
      
      // Override json method to cache successful responses
      res.json = (body) => {
        if ((res.statusCode === 200 || res.statusCode === 201) && redisClient.isConnected()) {
          redisClient.setEx(key, expirySeconds, JSON.stringify(body))
            .then(() => console.log(`💾 Cached: ${keyPrefix}`))
            .catch(() => {}); // Silent failure
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      // Continue without caching on any error
      next();
    }
  };
};

/**
 * Cache invalidation middleware
 * Invalidates cache keys matching a pattern after successful operations
 * 
 * @param {string} pattern - Redis key pattern to invalidate
 * @returns {Function} Express middleware function
 */
export const invalidateCacheMiddleware = (pattern) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    
    res.json = async (body) => {
      // Only invalidate on successful operations and if Redis is available
      if (res.statusCode >= 200 && res.statusCode < 300 && redisClient.isConnected()) {
        try {
          const userPart = req.user ? req.user._id : '';
          const fullPattern = pattern.replace('{{userId}}', userPart);
          const keys = await redisClient.keys(fullPattern);
          
          if (keys.length > 0) {
            await redisClient.del(keys);
            console.log(`🗑️ Cache invalidated: ${keys.length} keys`);
          }
        } catch (err) {
          // Silent failure - don't break the response
        }
      }
      
      return originalJson(body);
    };
    
    next();
  };
};

/**
 * Predefined cache middleware for different data types
 */

// Cache for courses with 5 minute TTL
export const coursesCache = cacheMiddleware('courses', 300);

// Cache for jobs with 3 minute TTL  
export const jobsCache = cacheMiddleware('jobs', 180);

// Cache for user notifications with 2 minute TTL
export const notificationsCache = cacheMiddleware('notifications', 120, true);

// Cache for user profile data with 10 minute TTL
export const profileCache = cacheMiddleware('profile', 600, true);

// Cache for general API responses with 1 minute TTL
export const generalCache = cacheMiddleware('general', 60);

/**
 * Cache invalidation patterns
 */

// Invalidate user-specific caches
export const invalidateUserCache = invalidateCacheMiddleware('*:{{userId}}:*');

// Invalidate course-related caches
export const invalidateCourseCache = invalidateCacheMiddleware('courses:*');

// Invalidate job-related caches
export const invalidateJobCache = invalidateCacheMiddleware('jobs:*');

/**
 * Health check middleware for cache status
 */
export const cacheHealthCheck = async (req, res, next) => {
  req.cacheStatus = {
    enabled: redisClient.isEnabled(),
    connected: redisClient.isConnected(),
    ping: await redisClient.ping()
  };
  next();
};
