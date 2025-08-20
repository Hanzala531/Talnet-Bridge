import rateLimit from "express-rate-limit";

// Apply to all requests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: {
    status: 429,
    message: "Too many requests, please try again later."
  },
  standardHeaders: true, 
  legacyHeaders: false,
  trustProxy: false, // Set to specific value to avoid security warning
});

export default limiter;
