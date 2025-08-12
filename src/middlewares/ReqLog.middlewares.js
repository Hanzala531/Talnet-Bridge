
export const requestLogger = (req, res, next) => {
    console.log(
      `Request Method: ${req.method}, Request endpoint: ${req.url} , Orignal URL: ${req.originalUrl}`
    );
    next(); // Call the next middleware or route handler
  };