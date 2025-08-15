# API Testing Suite

This comprehensive testing suite allows you to test all the APIs and endpoints in the Talnet Bridge application.

## 📁 Test Structure

```
tests/
├── config.js              # Test configuration and constants
├── utils.js                # Test utilities and helpers
├── runTests.js            # Main test runner
├── webhookTests.js        # Webhook testing utilities
├── data/
│   └── testData.js        # Test data for all endpoints
├── auth/
│   └── authTests.js       # Authentication tests
├── subscription/
│   └── subscriptionTests.js # Subscription & payment tests
├── courses/
│   └── courseTests.js     # Course management tests
└── school/
    └── schoolTests.js     # School/training institute tests
```

## 🚀 Quick Start

### 1. Make sure your server is running
```bash
npm run dev
```

### 2. Run all tests
```bash
# From the project root directory
node tests/runTests.js
```

### 3. Run specific test suites
```bash
# Authentication tests only
node tests/runTests.js auth

# Subscription tests only
node tests/runTests.js subscription

# Course tests only
node tests/runTests.js course

# School tests only
node tests/runTests.js school
```

## 📋 Test Categories

### 🔐 Authentication Tests (`auth`)
- User registration (admin, school, student)
- User login with valid/invalid credentials
- Token refresh
- Protected route access
- User profile retrieval
- User logout

### 💳 Subscription Tests (`subscription`)
- Create subscription plans (basic, premium, enterprise)
- Get all plans / Get plan by ID
- Update subscription plans
- Create user subscriptions
- Get user's current subscription
- Get all subscriptions (admin)
- Update subscription status
- Create payment intents
- Cancel subscriptions
- Delete subscription plans

### 📚 Course Tests (`course`)
- Create courses (multiple types)
- Get all courses with pagination
- Get course by ID
- Update course details
- Search courses (by title, category, level)
- Get courses by provider
- Delete courses
- Authorization testing (student vs school permissions)

### 🏫 School Tests (`school`)
- Create school profiles
- Get/update school profiles
- Get all schools (with pagination)
- Search schools (by name, specialization, location)
- School statistics
- Update school status (admin only)
- Delete school profiles
- Authorization testing

## 🔧 Configuration

Edit `tests/config.js` to modify:

- **API_BASE**: Your API base URL (default: `http://localhost:4000/api/v1`)
- **TEST_USERS**: Test user credentials
- **TIMEOUT**: Request timeout settings

## 📊 Test Data

All test data is defined in `tests/data/testData.js`:

- **SUBSCRIPTION_PLANS**: Basic, Premium, Enterprise plans
- **COURSES**: Web Development, Data Science, Digital Marketing
- **USERS**: Admin, School, Student, Instructor users
- **TRAINING_INSTITUTES**: Sample school profiles
- **PAYMENT_DATA**: Test payment information
- **WEBHOOK_EVENTS**: Stripe webhook events

## 🎯 Understanding Test Results

### ✅ Success Indicators
- **Green checkmarks**: Tests passed
- **Status codes**: 200/201/204 for successful operations
- **Error codes**: 401/403/404 for expected failures (security tests)

### ❌ Failure Indicators
- **Red X marks**: Tests failed
- **Unexpected status codes**: Issues with API implementation
- **Missing data**: API not returning expected data structure

### 📈 Success Rate Metrics
- **90%+**: Excellent - API is working well
- **70-89%**: Good - Minor issues need attention
- **50-69%**: Warning - Several issues detected
- **<50%**: Critical - Major problems with API

## 🔍 Debugging Failed Tests

### Common Issues and Solutions

1. **Server not running**
   ```bash
   npm run dev
   ```

2. **Database connection issues**
   - Check MongoDB connection string in `.env`
   - Ensure database is accessible

3. **Authentication failures**
   - Check JWT secret in `.env`
   - Verify user registration is working

4. **Permission errors**
   - Check role-based middleware
   - Verify token generation includes correct roles

5. **Validation errors**
   - Check model validation rules
   - Verify required fields in test data

## 📝 Custom Test Development

### Adding New Tests

1. **Create test file** in appropriate folder
2. **Import utilities**:
   ```javascript
   import { ApiClient, TestLogger, assert } from '../utils.js';
   import { ENDPOINTS, TEST_TOKENS } from '../config.js';
   ```

3. **Follow test pattern**:
   ```javascript
   async function testNewFeature() {
       try {
           const { response, data, success } = await api.get(endpoint, token);
           assert.statusCode(response, 200, 'Should return 200');
           logger.log('Test Name', success, 'Description');
       } catch (error) {
           logger.log('Test Name', false, error.message);
       }
   }
   ```

### Adding New Endpoints

1. **Update `ENDPOINTS`** in `config.js`
2. **Add test data** in `data/testData.js`
3. **Create test functions** following existing patterns

## 🛡️ Security Testing

The test suite includes security tests for:

- **Authentication bypass attempts**
- **Authorization boundary testing**
- **Input validation**
- **SQL injection prevention**
- **XSS prevention**

## 📞 Support

If tests fail unexpectedly:

1. Check server logs for detailed error messages
2. Verify all environment variables are set
3. Ensure database is properly seeded
4. Check network connectivity
5. Review API implementation against test expectations

## 🎨 Customization

### Changing Test Data
Edit `tests/data/testData.js` to modify test scenarios.

### Adding New Test Suites
1. Create new folder and test file
2. Update `runTests.js` to include new suite
3. Follow existing patterns for consistency

### Environment-Specific Testing
Create different config files for different environments:
- `config.dev.js` for development
- `config.staging.js` for staging
- `config.prod.js` for production

## 📄 License

This testing suite is part of the Talnet Bridge project.
