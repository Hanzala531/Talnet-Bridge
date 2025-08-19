import Redis from "ioredis";

// Redis configuration with fallback
const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 0,
  retryOnFailover: false,
  maxRetriesPerRequest: 0, // Disable retries completely
  lazyConnect: true,
  connectTimeout: 2000, // Reduced timeout
  autoResubscribe: false,
  autoResendUnfulfilledCommands: false,
  enableOfflineQueue: false,
  // Disable automatic reconnection completely
  enableAutoPipelining: false,
  reconnectOnError: null, // Disable auto-reconnect
  showFriendlyErrorStack: false
};

// Create Redis client
let redisClient = null;
let isConnected = false;
let isRedisEnabled = process.env.REDIS_ENABLED !== 'false'; // Can be disabled via env
let hasTriedConnection = false;

try {
  if (isRedisEnabled && !hasTriedConnection) {
    redisClient = new Redis(redisConfig);
    hasTriedConnection = true;
    
    // Set up event handlers with throttling to prevent spam
    let lastErrorTime = 0;
    const ERROR_THROTTLE_MS = 60000; // Only log errors every 60 seconds

    redisClient.on("error", (err) => {
      const now = Date.now();
      if (now - lastErrorTime > ERROR_THROTTLE_MS) {
        console.warn("Redis not available - running without cache");
        lastErrorTime = now;
      }
      isConnected = false;
      isRedisEnabled = false; // Disable permanently after error
      if (redisClient) {
        redisClient.disconnect();
        redisClient = null;
      }
    });

    redisClient.on("connect", () => {
      console.log("✅ Redis connected successfully");
      isConnected = true;
    });

    redisClient.on("ready", () => {
      console.log("✅ Redis client ready to use");
      isConnected = true;
    });

    redisClient.on("close", () => {
      isConnected = false;
      isRedisEnabled = false;
      if (redisClient) {
        redisClient.disconnect();
        redisClient = null;
      }
    });

    // Try to connect with timeout - only once
    const connectWithTimeout = async () => {
      try {
        await Promise.race([
          redisClient.connect(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 2000))
        ]);
        isConnected = true;
      } catch (error) {
        console.warn("Redis not available - continuing without cache");
        isConnected = false;
        isRedisEnabled = false;
        if (redisClient) {
          redisClient.disconnect();
          redisClient = null;
        }
      }
    };

    // Attempt connection without blocking startup - only once
    connectWithTimeout().catch(() => {
      console.log("🔄 Application starting without Redis cache");
    });
  } else {
    console.log("📝 Redis disabled - running without cache");
  }
} catch (error) {
  console.warn("Redis initialization failed - continuing without cache:", error.message);
  isRedisEnabled = false;
}

// Safe Redis operations with automatic fallback
const safeRedisOperation = async (operation, fallbackValue = null) => {
  if (!isRedisEnabled || !isConnected || !redisClient) {
    return fallbackValue;
  }
  
  try {
    return await operation();
  } catch (error) {
    // Don't log every failed operation to avoid spam
    return fallbackValue;
  }
};

// Enhanced Redis client with safe operations and fallbacks
const enhancedRedisClient = {
  get: async (key) => safeRedisOperation(() => redisClient.get(key)),
  set: async (key, value) => safeRedisOperation(() => redisClient.set(key, value)),
  setEx: async (key, ttl, value) => safeRedisOperation(() => redisClient.setex(key, ttl, value)),
  del: async (keys) => safeRedisOperation(() => redisClient.del(keys)),
  keys: async (pattern) => safeRedisOperation(() => redisClient.keys(pattern), []),
  exists: async (key) => safeRedisOperation(() => redisClient.exists(key), 0),
  expire: async (key, ttl) => safeRedisOperation(() => redisClient.expire(key, ttl)),
  flushAll: async () => safeRedisOperation(() => redisClient.flushall()),
  
  // Utility methods
  isConnected: () => isConnected && isRedisEnabled,
  isEnabled: () => isRedisEnabled,
  client: redisClient, // Direct access if needed
  
  // Health check
  ping: async () => safeRedisOperation(() => redisClient.ping(), 'PONG-FALLBACK')
};

export default enhancedRedisClient;
export { isConnected, isRedisEnabled };
