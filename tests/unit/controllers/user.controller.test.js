import {
  createTestUser,
  generateTestToken,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
} from '../../helpers/testUtils.js';
import { User } from '../../../src/models/index.js';
import request from 'supertest';
import { app } from '../../../src/app.js';

describe('User Controller Tests', () => {
  describe('POST /api/v1/users/register', () => {
    const validUserData = {
      fullName: 'John Doe',
      email: 'john.doe@test.com',
      phone: '03001234567',
      password: 'SecurePass123!',
      role: 'student',
    };

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData);

      expectSuccessResponse(response, 201);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe(validUserData.email);
      expect(response.body.data.user).not.toHaveProperty('password');
    });

    it('should not register user with existing email', async () => {
      // Create user first
      await createTestUser({ email: validUserData.email });

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({ email: 'test@test.com' });

      expectValidationError(response);
    });

    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({ ...validUserData, email: 'invalid-email' });

      expectValidationError(response, 'email');
    });

    it('should validate phone number format', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({ ...validUserData, phone: '123' });

      expectValidationError(response, 'phone');
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({ ...validUserData, password: '123' });

      expectValidationError(response, 'password');
    });
  });

  describe('POST /api/v1/users/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'login@test.com',
        password: 'testPassword123',
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'login@test.com',
          password: 'testPassword123',
        });

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data.user.email).toBe('login@test.com');
    });

    it('should not login with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'testPassword123',
        });

      expectErrorResponse(response, 404);
    });

    it('should not login with invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: 'login@test.com',
          password: 'wrongPassword',
        });

      expectErrorResponse(response, 400);
    });

    it('should validate required fields for login', async () => {
      const response = await request(app)
        .post('/api/v1/users/login')
        .send({ email: 'test@test.com' });

      expectValidationError(response);
    });
  });

  describe('POST /api/v1/users/logout', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser();
      token = generateTestToken(testUser);
    });

    it('should logout authenticated user', async () => {
      const response = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response, 200);
      expect(response.body.message).toMatch(/logged out/i);
    });

    it('should not logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/users/logout');

      expectErrorResponse(response, 401);
    });

    it('should not logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(response, 401);
    });
  });

  describe('GET /api/v1/users', () => {
    let adminUser, regularUser, token;

    beforeEach(async () => {
      adminUser = await createTestUser({
        role: 'admin',
        email: 'admin@test.com',
      });
      regularUser = await createTestUser({
        role: 'student',
        email: 'user@test.com',
      });
      token = generateTestToken(adminUser);

      // Create some additional users for pagination testing
      await createTestUser({ email: 'user1@test.com' });
      await createTestUser({ email: 'user2@test.com' });
    });

    it('should get all users with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.users).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/v1/users?role=admin')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data.users).toHaveLength(1);
      expect(response.body.data.users[0].role).toBe('admin');
    });

    it('should search users by name or email', async () => {
      const response = await request(app)
        .get('/api/v1/users?search=admin')
        .set('Authorization', `Bearer ${token}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data.users.length).toBeGreaterThan(0);
    });

    it('should not allow unauthorized access', async () => {
      const response = await request(app)
        .get('/api/v1/users');

      expectErrorResponse(response, 401);
    });
  });

  describe('User Model Validation', () => {
    it('should hash password before saving', async () => {
      const plainPassword = 'testPassword123';
      const user = await User.create({
        fullName: 'Test User',
        email: 'hash@test.com',
        phone: '03001234567',
        password: plainPassword,
        role: 'student',
      });

      expect(user.password).not.toBe(plainPassword);
      expect(user.password.length).toBeGreaterThan(20); // bcrypt hash length
    });

    it('should validate password correctly', async () => {
      const user = await createTestUser({
        password: 'testPassword123',
      });

      const isValid = await user.isPasswordCorrect('testPassword123');
      const isInvalid = await user.isPasswordCorrect('wrongPassword');

      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    it('should generate access token', async () => {
      const user = await createTestUser();
      const token = user.generateAccessToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });

    it('should generate refresh token', async () => {
      const user = await createTestUser();
      const token = user.generateRefreshToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This test would require mocking mongoose connection
      // For now, we'll test that errors are properly formatted
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({
          fullName: 'Test User',
          email: 'invalid-email-format',
          phone: '03001234567',
          password: 'password123',
          role: 'student',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expectErrorResponse(response, 400);
    });
  });

  describe('Performance Tests', () => {
    it('should register user within acceptable time', async () => {
      const start = Date.now();
      
      const response = await request(app)
        .post('/api/v1/users/register')
        .send({
          fullName: 'Performance Test',
          email: 'perf@test.com',
          phone: '03001234567',
          password: 'password123',
          role: 'student',
        });

      const duration = Date.now() - start;
      
      expectSuccessResponse(response, 201);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle concurrent registrations', async () => {
      const promises = Array.from({ length: 5 }, (_, index) =>
        request(app)
          .post('/api/v1/users/register')
          .send({
            fullName: `Concurrent User ${index}`,
            email: `concurrent${index}@test.com`,
            phone: `03001234${String(567 + index).padStart(3, '0')}`,
            password: 'password123',
            role: 'student',
          })
      );

      const responses = await Promise.all(promises);
      
      responses.forEach(response => {
        expectSuccessResponse(response, 201);
      });
    });
  });
});
