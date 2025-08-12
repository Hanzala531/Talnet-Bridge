class ApiError extends Error {
  constructor (
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.data = null;
    this.success = false;
    this.timestamp = new Date().toISOString();

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export const createApiError = (message, statusCode = 500, errorCode = null, errors = null) => {
    const error = new ApiError(statusCode, message, errors);
    error.name = 'ApiError';
    error.errorCode = errorCode;
    return error;
};

// Helper functions for common error types
export const badRequest = (message = 'Bad Request', errorCode = 'BAD_REQUEST') =>
    createApiError(message, 400, errorCode);

export const unauthorized = (message = 'Unauthorized', errorCode = 'UNAUTHORIZED') =>
    createApiError(message, 401, errorCode);

export const forbidden = (message = 'Forbidden', errorCode = 'FORBIDDEN') =>
    createApiError(message, 403, errorCode);

export const notFound = (message = 'Not Found', errorCode = 'NOT_FOUND') =>
    createApiError(message, 404, errorCode);

export const conflict = (message = 'Conflict', errorCode = 'CONFLICT') =>
    createApiError(message, 409, errorCode);

export const validationError = (errors, message = 'Validation Error', errorCode = 'VALIDATION_ERROR') =>
    createApiError(message, 422, errorCode, errors);

export const internalServer = (message = 'Internal Server Error', errorCode = 'INTERNAL_ERROR') =>
    createApiError(message, 500, errorCode);

// Format error for response
export const formatError = (error) => ({
    name: error.name || 'ApiError',
    message: error.message,
    statusCode: error.statusCode || 500,
    errorCode: error.errorCode || 'UNKNOWN_ERROR',
    errors: error.errors || null,
    timestamp: error.timestamp || new Date().toISOString(),
    success: false
});

export { ApiError };