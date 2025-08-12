const apiResponse = (status = 200, message = "success", payload, success) => {
    return {
        status,
        message,
        payload,
        success: success !== null ? success : status < 400,
        timestamp: new Date().toISOString() // Fixed: Data -> Date
    }
}

// Success responses
const successResponse = (payload, message = "Operation successful") => {
    return apiResponse(200, message, payload, true);
}

const createdResponse = (payload, message = "Resource created successfully") => {
    return apiResponse(201, message, payload, true);
}

const acceptedResponse = (payload, message = "Request accepted") => {
    return apiResponse(202, message, payload, true);
}

const noContentResponse = (message = "No content") => {
    return apiResponse(204, message, null, true);
}

const deletedResponse = (message = "Resource deleted successfully") => {
    return apiResponse(200, message, null, true);
}

const updatedResponse = (payload, message = "Resource updated successfully") => {
    return apiResponse(200, message, payload, true);
}

const retrievedResponse = (payload, message = "Resource retrieved successfully") => {
    return apiResponse(200, message, payload, true);
}

// Error responses
const badRequestResponse = (message = "Bad request", errors = null) => {
    return apiResponse(400, message, errors, false);
}

const unauthorizedResponse = (message = "Unauthorized access") => {
    return apiResponse(401, message, null, false);
}

const forbiddenResponse = (message = "Forbidden") => {
    return apiResponse(403, message, null, false);
}

const notFoundResponse = (message = "Resource not found") => {
    return apiResponse(404, message, null, false);
}

const methodNotAllowedResponse = (message = "Method not allowed") => {
    return apiResponse(405, message, null, false);
}

const conflictResponse = (message = "Conflict", errors = null) => {
    return apiResponse(409, message, errors, false);
}

const validationErrorResponse = (errors, message = "Validation failed") => {
    return apiResponse(422, message, errors, false);
}

const tooManyRequestsResponse = (message = "Too many requests") => {
    return apiResponse(429, message, null, false);
}

const serverErrorResponse = (message = "Internal server error") => {
    return apiResponse(500, message, null, false);
}

const serviceUnavailableResponse = (message = "Service unavailable") => {
    return apiResponse(503, message, null, false);
}

export {
    apiResponse,
    successResponse,
    createdResponse,
    acceptedResponse,
    noContentResponse,
    deletedResponse,
    updatedResponse,
    retrievedResponse,
    badRequestResponse,
    unauthorizedResponse,
    forbiddenResponse,
    notFoundResponse,
    methodNotAllowedResponse,
    conflictResponse,
    validationErrorResponse,
    tooManyRequestsResponse,
    serverErrorResponse,
    serviceUnavailableResponse
}