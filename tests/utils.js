import { TEST_CONFIG, TEST_TOKENS, TEST_UTILS } from './config.js';

// HTTP Client utility
export class ApiClient {
    constructor(baseURL = TEST_CONFIG.API_BASE) {
        this.baseURL = baseURL;
    }

    // Get headers with auth token
    getHeaders(token = null, additionalHeaders = {}) {
        const headers = { ...TEST_CONFIG.HEADERS };
        
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        
        return { ...headers, ...additionalHeaders };
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: this.getHeaders(),
            ...options
        };

        try {
            console.log(`🔄 ${config.method} ${endpoint}`);
            
            const response = await fetch(url, config);
            const data = await response.json();
            
            const result = TEST_UTILS.formatResponse(response, data);
            
            if (response.ok) {
                console.log(`✅ ${config.method} ${endpoint} - ${response.status}`);
            } else {
                console.log(`❌ ${config.method} ${endpoint} - ${response.status}: ${data.message}`);
            }
            
            return { response, data, success: response.ok };
        } catch (error) {
            console.log(`💥 ${config.method} ${endpoint} - Error: ${error.message}`);
            throw error;
        }
    }

    // GET request
    async get(endpoint, token = null) {
        return this.request(endpoint, {
            method: 'GET',
            headers: this.getHeaders(token)
        });
    }

    // POST request
    async post(endpoint, body = {}, token = null) {
        return this.request(endpoint, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify(body)
        });
    }

    // PUT request
    async put(endpoint, body = {}, token = null) {
        return this.request(endpoint, {
            method: 'PUT',
            headers: this.getHeaders(token),
            body: JSON.stringify(body)
        });
    }

    // DELETE request
    async delete(endpoint, token = null) {
        return this.request(endpoint, {
            method: 'DELETE',
            headers: this.getHeaders(token)
        });
    }

    // PATCH request
    async patch(endpoint, body = {}, token = null) {
        return this.request(endpoint, {
            method: 'PATCH',
            headers: this.getHeaders(token),
            body: JSON.stringify(body)
        });
    }
}

// Test Result Logger
export class TestLogger {
    constructor() {
        this.results = [];
        this.startTime = Date.now();
    }

    log(testName, success, message = '', data = null) {
        const result = {
            testName,
            success,
            message,
            data,
            timestamp: new Date().toISOString()
        };
        
        this.results.push(result);
        
        const icon = success ? '✅' : '❌';
        console.log(`${icon} ${testName}: ${message}`);
        
        if (data && !success) {
            console.log(`   Data:`, data);
        }
    }

    summary() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        const passed = this.results.filter(r => r.success).length;
        const failed = this.results.filter(r => !r.success).length;
        const total = this.results.length;

        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`⏱️  Duration: ${duration}ms`);
        console.log(`📝 Total Tests: ${total}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`📈 Success Rate: ${total > 0 ? Math.round((passed/total) * 100) : 0}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.results.filter(r => !r.success).forEach(result => {
                console.log(`   - ${result.testName}: ${result.message}`);
            });
        }
        
        console.log('='.repeat(60));
    }
}

// Test assertion utilities
export const assert = {
    isTrue(condition, message) {
        if (!condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    },

    isFalse(condition, message) {
        if (condition) {
            throw new Error(`Assertion failed: ${message}`);
        }
    },

    equals(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
        }
    },

    notEquals(actual, expected, message) {
        if (actual === expected) {
            throw new Error(`Assertion failed: ${message}. Expected not to equal: ${expected}`);
        }
    },

    exists(value, message) {
        if (value === null || value === undefined) {
            throw new Error(`Assertion failed: ${message}. Value does not exist`);
        }
    },

    isArray(value, message) {
        if (!Array.isArray(value)) {
            throw new Error(`Assertion failed: ${message}. Expected array, got ${typeof value}`);
        }
    },

    isObject(value, message) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new Error(`Assertion failed: ${message}. Expected object, got ${typeof value}`);
        }
    },

    statusCode(response, expectedCode, message) {
        if (response.status !== expectedCode) {
            throw new Error(`Assertion failed: ${message}. Expected status ${expectedCode}, got ${response.status}`);
        }
    }
};
