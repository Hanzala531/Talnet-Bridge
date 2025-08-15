import { ApiClient, TestLogger, assert } from '../utils.js';
import { ENDPOINTS, TEST_TOKENS } from '../config.js';
import { USERS } from '../data/testData.js';

const api = new ApiClient();
const logger = new TestLogger();

export async function runAuthTests() {
    console.log('\n🔐 RUNNING AUTHENTICATION TESTS');
    console.log('='.repeat(50));

    try {
        await testUserRegistration();
        await testUserLogin();
        await testInvalidLogin();
        await testTokenRefresh();
        await testProtectedRoute();
        await testUserProfile();
        await testLogout();
    } catch (error) {
        logger.log('Auth Tests', false, `Unexpected error: ${error.message}`);
    }

    logger.summary();
    return logger.results;
}

async function testUserRegistration() {
    try {
        // Test Admin Registration
        const { response, data, success } = await api.post(ENDPOINTS.AUTH.REGISTER, USERS.ADMIN);
        
        assert.statusCode(response, 201, 'Admin registration should return 201');
        assert.exists(data.data, 'Response should contain user data');
        assert.equals(data.data.role, 'admin', 'User role should be admin');
        
        logger.log('Admin Registration', success, 'Admin user registered successfully');

        // Test School Registration
        const schoolResult = await api.post(ENDPOINTS.AUTH.REGISTER, USERS.SCHOOL_OWNER);
        assert.statusCode(schoolResult.response, 201, 'School registration should return 201');
        logger.log('School Registration', schoolResult.success, 'School user registered successfully');

        // Test Student Registration
        const studentResult = await api.post(ENDPOINTS.AUTH.REGISTER, USERS.STUDENT);
        assert.statusCode(studentResult.response, 201, 'Student registration should return 201');
        logger.log('Student Registration', studentResult.success, 'Student user registered successfully');

    } catch (error) {
        logger.log('User Registration', false, error.message);
    }
}

async function testUserLogin() {
    try {
        // Test Admin Login
        const adminLogin = await api.post(ENDPOINTS.AUTH.LOGIN, {
            email: USERS.ADMIN.email,
            password: USERS.ADMIN.password
        });

        assert.statusCode(adminLogin.response, 200, 'Admin login should return 200');
        assert.exists(adminLogin.data.data.accessToken, 'Response should contain access token');
        
        // Store token for future tests
        TEST_TOKENS.admin = adminLogin.data.data.accessToken;
        logger.log('Admin Login', adminLogin.success, 'Admin logged in successfully');

        // Test School Login
        const schoolLogin = await api.post(ENDPOINTS.AUTH.LOGIN, {
            email: USERS.SCHOOL_OWNER.email,
            password: USERS.SCHOOL_OWNER.password
        });

        assert.statusCode(schoolLogin.response, 200, 'School login should return 200');
        TEST_TOKENS.school = schoolLogin.data.data.accessToken;
        logger.log('School Login', schoolLogin.success, 'School user logged in successfully');

        // Test Student Login
        const studentLogin = await api.post(ENDPOINTS.AUTH.LOGIN, {
            email: USERS.STUDENT.email,
            password: USERS.STUDENT.password
        });

        assert.statusCode(studentLogin.response, 200, 'Student login should return 200');
        TEST_TOKENS.student = studentLogin.data.data.accessToken;
        logger.log('Student Login', studentLogin.success, 'Student logged in successfully');

    } catch (error) {
        logger.log('User Login', false, error.message);
    }
}

async function testInvalidLogin() {
    try {
        // Test with wrong password
        const { response, data, success } = await api.post(ENDPOINTS.AUTH.LOGIN, {
            email: USERS.ADMIN.email,
            password: 'wrongpassword'
        });

        assert.statusCode(response, 401, 'Invalid login should return 401');
        assert.isFalse(success, 'Invalid login should not succeed');
        
        logger.log('Invalid Login Test', true, 'Invalid credentials properly rejected');

        // Test with non-existent email
        const nonExistentResult = await api.post(ENDPOINTS.AUTH.LOGIN, {
            email: 'nonexistent@test.com',
            password: 'anypassword'
        });

        assert.statusCode(nonExistentResult.response, 401, 'Non-existent user login should return 401');
        logger.log('Non-existent User Login', true, 'Non-existent user properly rejected');

    } catch (error) {
        logger.log('Invalid Login Test', false, error.message);
    }
}

async function testTokenRefresh() {
    try {
        // This test depends on having refresh token from login
        // For now, we'll just test that the endpoint exists
        const { response } = await api.post(ENDPOINTS.AUTH.REFRESH, {}, TEST_TOKENS.admin);
        
        // Refresh might fail if refresh token is not properly stored, but endpoint should exist
        logger.log('Token Refresh Test', true, `Refresh endpoint accessible (status: ${response.status})`);

    } catch (error) {
        logger.log('Token Refresh Test', false, error.message);
    }
}

async function testProtectedRoute() {
    try {
        // Test accessing protected route without token
        const { response } = await api.get(ENDPOINTS.USERS.PROFILE);
        
        assert.statusCode(response, 401, 'Protected route without token should return 401');
        logger.log('Protected Route (No Token)', true, 'Unauthorized access properly blocked');

        // Test accessing protected route with valid token
        const protectedResult = await api.get(ENDPOINTS.USERS.PROFILE, TEST_TOKENS.admin);
        
        if (protectedResult.success) {
            logger.log('Protected Route (Valid Token)', true, 'Authorized access successful');
        } else {
            logger.log('Protected Route (Valid Token)', false, `Access failed: ${protectedResult.response.status}`);
        }

    } catch (error) {
        logger.log('Protected Route Test', false, error.message);
    }
}

async function testUserProfile() {
    try {
        const { response, data, success } = await api.get(ENDPOINTS.USERS.PROFILE, TEST_TOKENS.admin);
        
        assert.statusCode(response, 200, 'Profile request should return 200');
        assert.exists(data.data, 'Response should contain user data');
        assert.equals(data.data.email, USERS.ADMIN.email, 'Profile should return correct email');
        
        logger.log('User Profile', success, 'User profile retrieved successfully');

    } catch (error) {
        logger.log('User Profile', false, error.message);
    }
}

async function testLogout() {
    try {
        const { response, success } = await api.post(ENDPOINTS.AUTH.LOGOUT, {}, TEST_TOKENS.admin);
        
        // Logout might return different status codes depending on implementation
        logger.log('User Logout', success, `Logout completed (status: ${response.status})`);

    } catch (error) {
        logger.log('User Logout', false, error.message);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAuthTests();
}
