import Redis from "ioredis";

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,

  // Fail-fast configs
  lazyConnect: true, // don't auto-connect until explicitly called
  maxRetriesPerRequest: 1, // retry once, fail if still bad
  connectTimeout: process.env.REDIS_CONNECT_TIMEOUT || 5000, // default 5s

  // Disable unnecessary auto behaviors
  retryOnFailover: false,
  autoResubscribe: false,
  autoResendUnfulfilledCommands: false,
  enableOfflineQueue: false,
  enableAutoPipelining: false,
  showFriendlyErrorStack: false,
};

// Redis client state
let redisClient = null;
let isConnected = false;
let isRedisEnabled = process.env.REDIS_ENABLED !== "false"; // env toggle

// Safe Redis connect function
const connectRedis = async () => {
  if (!isRedisEnabled) {
    console.log("📝 Redis disabled - running without cache");
    return;
  }

  redisClient = new Redis(redisConfig);

  redisClient.on("connect", () => {
    console.log("✅ Redis connected successfully");
    isConnected = true;
  });

  redisClient.on("ready", () => {
    console.log("✅ Redis client ready to use");
    isConnected = true;
  });

  redisClient.on("error", (err) => {
    console.warn("⚠️ Redis error:", err.message);
    isConnected = false;
  });

  redisClient.on("close", () => {
    console.warn("⚠️ Redis connection closed");
    isConnected = false;
  });

  try {
    await redisClient.connect();
  } catch (error) {
    console.warn("Redis not available - continuing without cache:", error.message);
    isRedisEnabled = false;
    isConnected = false;
    redisClient.disconnect();
    redisClient = null;
  }
};

// Safe Redis operations with fallback
const safeRedisOperation = async (operation, fallbackValue = null) => {
  if (!isRedisEnabled || !isConnected || !redisClient) {
    return fallbackValue;
  }
  try {
    return await operation();
  } catch {
    return fallbackValue;
  }
};

// Enhanced Redis wrapper
const enhancedRedisClient = {
  get: (key) => safeRedisOperation(() => redisClient.get(key)),
  set: (key, value) => safeRedisOperation(() => redisClient.set(key, value)),
  setEx: (key, ttl, value) => safeRedisOperation(() => redisClient.setex(key, ttl, value)),
  del: (keys) => safeRedisOperation(() => redisClient.del(keys)),
  keys: (pattern) => safeRedisOperation(() => redisClient.keys(pattern), []),
  exists: (key) => safeRedisOperation(() => redisClient.exists(key), 0),
  expire: (key, ttl) => safeRedisOperation(() => redisClient.expire(key, ttl)),
  flushAll: () => safeRedisOperation(() => redisClient.flushall()),

  // Utility
  isConnected: () => isConnected,
  isEnabled: () => isRedisEnabled,
  client: () => redisClient,

  // Health check
  ping: () => safeRedisOperation(() => redisClient.ping(), "PONG-FALLBACK"),
};

export default enhancedRedisClient;
export { connectRedis, isConnected, isRedisEnabled };
