# 🧪 **Talent Bridge Testing Suite Documentation**

## **📋 Table of Contents**
- [Overview](#overview)
- [Testing Architecture](#testing-architecture)
- [Test Categories](#test-categories)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Writing Tests](#writing-tests)
- [Coverage Reports](#coverage-reports)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

---

## **🎯 Overview**

The Talent Bridge testing suite is a comprehensive testing framework designed to ensure code quality, reliability, and performance. It includes unit tests, integration tests, and end-to-end tests with robust coverage reporting.

### **Key Features:**
- ✅ **Comprehensive Coverage**: Unit, Integration, and E2E tests
- ✅ **Performance Testing**: Load and stress testing capabilities
- ✅ **Mock Data Management**: Consistent test fixtures and data
- ✅ **Parallel Execution**: Fast test execution with Jest
- ✅ **Coverage Reporting**: Detailed code coverage analysis
- ✅ **CI/CD Ready**: Optimized for continuous integration

---

## **🏗️ Testing Architecture**

```
tests/
├── unit/                    # Unit tests for individual components
│   ├── controllers/         # Controller unit tests
│   ├── models/             # Model validation tests
│   ├── middlewares/        # Middleware unit tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests for API endpoints
│   ├── api.integration.test.js
│   ├── auth.integration.test.js
│   └── database.integration.test.js
├── e2e/                   # End-to-end workflow tests
│   ├── user-journey.e2e.test.js
│   └── business-flows.e2e.test.js
├── helpers/               # Test utilities and helpers
│   ├── globalSetup.js     # Global test configuration
│   └── testUtils.js       # Common test utilities
└── fixtures/              # Test data and mock objects
    └── testData.js        # Centralized test fixtures
```

---

## **📝 Test Categories**

### **1. Unit Tests** 
- **Purpose**: Test individual components in isolation
- **Location**: `tests/unit/`
- **Coverage**: Controllers, Models, Middlewares, Utilities
- **Run Command**: `npm run test:unit`

### **2. Integration Tests**
- **Purpose**: Test API endpoints and component interactions
- **Location**: `tests/integration/`
- **Coverage**: Full API workflows, Authentication, Database operations
- **Run Command**: `npm run test:integration`

### **3. End-to-End Tests**
- **Purpose**: Test complete user journeys and business workflows
- **Location**: `tests/e2e/`
- **Coverage**: User registration to course completion flows
- **Run Command**: `npm run test:e2e`

### **4. Performance Tests**
- **Purpose**: Test system performance under load
- **Coverage**: Concurrent requests, Large payloads, Response times
- **Included in**: Integration and unit tests

---

## **🚀 Running Tests**

### **Quick Start**
```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (development)
npm run test:watch
```

### **Specific Test Categories**
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# End-to-end tests only
npm run test:e2e
```

### **Feature-Specific Tests**
```bash
# User-related tests
npm run test:user

# Course-related tests
npm run test:course

# Job-related tests
npm run test:job

# Authentication tests
npm run test:auth

# API integration tests
npm run test:api
```

### **Advanced Testing Options**
```bash
# Verbose output
npm run test:verbose

# Silent mode
npm run test:silent

# Debug mode
npm run test:debug

# CI mode (no watch, with coverage)
npm run test:ci

# Performance tests only
npm run test:performance
```

---

## **📁 Test Structure**

### **Unit Test Example**
```javascript
describe('User Controller Tests', () => {
  describe('POST /api/v1/users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
    });
  });
});
```

### **Integration Test Example**
```javascript
describe('API Integration Tests', () => {
  it('should complete full registration and login flow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/api/v1/users/register')
      .send(userData);

    expectSuccessResponse(registerResponse, 201);

    // 2. Login with same credentials
    const loginResponse = await request(app)
      .post('/api/v1/users/login')
      .send({ email: userData.email, password: userData.password });

    expectSuccessResponse(loginResponse, 200);
  });
});
```

---

## **✍️ Writing Tests**

### **Test Utilities**
The testing suite provides comprehensive utilities in `tests/helpers/testUtils.js`:

```javascript
import {
  createTestUser,
  createTestCourse,
  authenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
} from '../helpers/testUtils.js';
```

### **Available Test Helpers**

#### **User Management**
```javascript
// Create test users
const user = await createTestUser({ role: 'student' });
const users = await createTestUsers(5);

// Generate authentication tokens
const token = generateTestToken(user);
const authRequest = authenticatedRequest(user);
```

#### **Data Creation**
```javascript
// Create test entities
const course = await createTestCourse(schoolUser);
const job = await createTestJob(employerUser);
const student = await createTestStudent(user);
```

#### **Response Validation**
```javascript
// Success responses
expectSuccessResponse(response, 200);

// Error responses
expectErrorResponse(response, 400);
expectValidationError(response, 'email');
expectUnauthorizedError(response);
expectForbiddenError(response);
expectNotFoundError(response);
```

#### **Performance Testing**
```javascript
// Measure execution time
const { result, duration } = await measureExecutionTime(async () => {
  return await someAsyncOperation();
});

// Validate response time
expectResponseTime(response, 1000); // max 1 second
```

### **Test Fixtures**
Use consistent test data from `tests/fixtures/testData.js`:

```javascript
import { mockUsers, mockCourse, testScenarios } from '../fixtures/testData.js';

// Use predefined mock data
const userData = mockUsers.student;
const courseData = mockCourse;

// Use test scenarios
const { validData, invalidEmail } = testScenarios.userRegistrationFlow;
```

---

## **📊 Coverage Reports**

### **Generating Coverage Reports**
```bash
# Generate coverage report
npm run test:coverage

# View HTML coverage report
open coverage/lcov-report/index.html
```

### **Coverage Thresholds**
Current coverage requirements:
- **Branches**: 70%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### **Coverage Configuration**
Located in `jest.config.js`:
```javascript
coverageThreshold: {
  global: {
    branches: 70,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```

---

## **🔄 CI/CD Integration**

### **GitHub Actions Example**
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run test:ci
      - uses: codecov/codecov-action@v1
        with:
          file: ./coverage/lcov.info
```

### **Pre-commit Hooks**
```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit test
npx husky add .husky/pre-commit "npm run test:ci"
```

---

## **🛠️ Configuration Files**

### **Jest Configuration** (`jest.config.js`)
```javascript
export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/globalSetup.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### **Test Environment** (`.env.test`)
```env
NODE_ENV=test
ACCESS_TOKEN_SECRET=test-secret
REDIS_ENABLED=false
LOG_LEVEL=error
```

---

## **🐛 Troubleshooting**

### **Common Issues**

#### **MongoDB Connection Errors**
```bash
# Clean up test database
npm run clean:test

# Restart with fresh database
npm test
```

#### **Jest Timeout Errors**
```javascript
// Increase timeout in test file
jest.setTimeout(30000);

// Or globally in jest.config.js
testTimeout: 30000
```

#### **Memory Issues with Large Test Suites**
```bash
# Run tests with increased memory
node --max-old-space-size=4096 node_modules/.bin/jest
```

#### **Port Conflicts**
```bash
# Check for processes using test port
lsof -i :4001

# Kill conflicting processes
kill -9 <PID>
```

### **Debugging Tests**

#### **Debug Mode**
```bash
# Run specific test in debug mode
npm run test:debug -- user.controller.test.js
```

#### **Verbose Logging**
```bash
# Enable detailed test output
npm run test:verbose
```

#### **Isolate Failing Tests**
```bash
# Run only tests matching pattern
npx jest --testNamePattern="should register user"

# Run single test file
npx jest tests/unit/controllers/user.controller.test.js
```

---

## **📈 Performance Benchmarks**

### **Test Execution Times**
- **Unit Tests**: < 30 seconds
- **Integration Tests**: < 2 minutes  
- **Full Suite**: < 5 minutes
- **Coverage Generation**: < 1 minute

### **Performance Test Metrics**
- **API Response Time**: < 1000ms
- **Database Operations**: < 500ms
- **Concurrent Requests**: 10+ simultaneous
- **Large Payloads**: Up to 10MB

---

## **🎯 Best Practices**

### **Test Organization**
1. **Group related tests** using `describe` blocks
2. **Use descriptive test names** that explain the scenario
3. **Follow AAA pattern**: Arrange, Act, Assert
4. **Keep tests independent** - each test should be able to run in isolation

### **Test Data Management**
1. **Use test fixtures** for consistent data
2. **Clean up after each test** using `beforeEach`/`afterEach`
3. **Mock external dependencies** (APIs, file system, etc.)
4. **Use factory functions** for dynamic test data generation

### **Performance Considerations**
1. **Parallel execution** for faster test runs
2. **Proper cleanup** to prevent memory leaks
3. **Efficient database operations** using transactions
4. **Minimal test data** creation

### **Maintenance**
1. **Regular test review** and cleanup
2. **Update test data** when models change
3. **Monitor coverage metrics** and improve low-coverage areas
4. **Document complex test scenarios**

---

## **📚 Resources**

### **Documentation Links**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [MongoDB Memory Server](https://github.com/nodkz/mongodb-memory-server)

### **Internal References**
- [API Documentation](./swagger.json)
- [Project Structure](./README.md)
- [Environment Configuration](./.env.example)

---

## **🏆 Testing Metrics**

### **Current Stats**
- **Total Tests**: 150+
- **Test Files**: 25+
- **Code Coverage**: 85%+
- **Test Execution Time**: < 3 minutes
- **Performance Tests**: 15+

### **Quality Gates**
- ✅ All tests must pass
- ✅ Coverage threshold must be met
- ✅ No test should take longer than 30 seconds
- ✅ Integration tests must complete in under 2 minutes
- ✅ Performance tests must validate response times

---

**📞 Support**: For testing-related questions or issues, refer to this documentation or check the inline comments in test files.
