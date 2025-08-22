export const requestLogger = (req, res, next) => {
  console.log(`Request received on [${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next(); // Pass control to next middleware/route handler
};
