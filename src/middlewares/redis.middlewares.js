import redisClient from "../config/redis.js";

export const cacheMiddleware = (keyPrefix, expirySeconds = 60) => {
  return async (req, res, next) => {
    const key = keyPrefix + JSON.stringify(req.params) + JSON.stringify(req.query);

    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        console.log("Cache hit for", key);
        return res.json(JSON.parse(cachedData));
      }

      // Modify res.send to cache response
      const originalSend = res.json.bind(res);
      res.json = (body) => {
        redisClient.setEx(key, expirySeconds, JSON.stringify(body));
        return originalSend(body);
      };

      next();
    } catch (err) {
      console.error("Cache error:", err);
      next();
    }
  };
};
