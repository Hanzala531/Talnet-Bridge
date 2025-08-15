// Test Configuration
export const TEST_CONFIG = {
    // API Base URL
    API_BASE: 'http://localhost:4000/api/v1',
    
    // Test timeouts
    TIMEOUT: 30000,
    
    // Test data
    TEST_USERS: {
        ADMIN: {
            email: 'admin@test.com',
            password: 'Test123!@#',
            fullName: 'Test Admin',
            role: 'admin'
        },
        SCHOOL: {
            email: 'school@test.com',
            password: 'Test123!@#',
            fullName: 'Test School',
            role: 'school'
        },
        STUDENT: {
            email: 'student@test.com',
            password: 'Test123!@#',
            fullName: 'Test Student',
            role: 'student'
        }
    },
    
    // Headers
    HEADERS: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
};

// Test Tokens Storage
export const TEST_TOKENS = {
    admin: null,
    school: null,
    student: null
};

// API Endpoints
export const ENDPOINTS = {
    // Auth endpoints
    AUTH: {
        REGISTER: '/users/register',
        LOGIN: '/users/login',
        REFRESH: '/users/refresh-token',
        LOGOUT: '/users/logout',
        PROFILE: '/users/profile'
    },
    
    // User endpoints
    USERS: {
        BASE: '/users',
        PROFILE: '/users/profile',
        UPDATE: '/users/update-profile',
        CHANGE_PASSWORD: '/users/change-password',
        DELETE: '/users/delete-account'
    },
    
    // Subscription endpoints
    SUBSCRIPTIONS: {
        PLANS: '/subscriptions/plans',
        USER_SUBSCRIPTION: '/subscriptions/my-subscription',
        CREATE_SUBSCRIPTION: '/subscriptions',
        CANCEL_SUBSCRIPTION: '/subscriptions/cancel',
        ALL_SUBSCRIPTIONS: '/subscriptions/all',
        UPDATE_STATUS: '/subscriptions/:id/status',
        PAYMENT_INTENT: '/subscriptions/payment-intent',
        CONFIRM_PAYMENT: '/subscriptions/confirm-payment'
    },
    
    // Course endpoints
    COURSES: {
        BASE: '/courses',
        CREATE: '/courses',
        UPDATE: '/courses/:id',
        DELETE: '/courses/:id',
        GET_BY_ID: '/courses/:id',
        BY_PROVIDER: '/courses/provider/:providerId',
        SEARCH: '/courses/search'
    },
    
    // School endpoints
    SCHOOLS: {
        BASE: '/schools',
        PROFILE: '/schools/profile',
        UPDATE: '/schools/profile',
        DELETE: '/schools/profile',
        ALL: '/schools/all',
        SEARCH: '/schools/search',
        STATISTICS: '/schools/:id/statistics',
        UPDATE_STATUS: '/schools/:id/status'
    },
    
    // Payment endpoints
    PAYMENTS: {
        WEBHOOK: '/payments/webhook'
    }
};

// Test utilities
export const TEST_UTILS = {
    // Generate random test data
    randomEmail: () => `test${Date.now()}@example.com`,
    randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
    randomNumber: (min = 1, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
    
    // Wait function
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
    
    // Format response for logging
    formatResponse: (response, data) => ({
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        data: data
    })
};
