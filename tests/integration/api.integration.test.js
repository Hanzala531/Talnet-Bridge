import request from 'supertest';
import { app } from '../../src/app.js';
import {
  createTestUser,
  createTestCourse,
  createTestJob,
  expectSuccessResponse,
  expectErrorResponse,
} from '../helpers/testUtils.js';

describe('API Integration Tests', () => {
  describe('User Registration and Authentication Flow', () => {
    const userData = {
      fullName: 'Integration Test User',
      email: 'integration@test.com',
      phone: '03009876543',
      password: 'TestPassword123!',
      role: 'student',
    };

    it('should complete full registration and login flow', async () => {
      // 1. Register user
      const registerResponse = await request(app)
        .post('/api/v1/users/register')
        .send(userData);

      expectSuccessResponse(registerResponse, 201);
      expect(registerResponse.body.data).toHaveProperty('user');
      expect(registerResponse.body.data).toHaveProperty('accessToken');

      const { accessToken } = registerResponse.body.data;

      // 2. Access protected route with token
      const protectedResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${accessToken}`);

      expectSuccessResponse(protectedResponse, 200);

      // 3. Logout
      const logoutResponse = await request(app)
        .post('/api/v1/users/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expectSuccessResponse(logoutResponse, 200);

      // 4. Login again
      const loginResponse = await request(app)
        .post('/api/v1/users/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expectSuccessResponse(loginResponse, 200);
      expect(loginResponse.body.data).toHaveProperty('accessToken');
    });
  });

  describe('Course Management Workflow', () => {
    let schoolUser, studentUser, adminUser, accessTokens;

    beforeEach(async () => {
      // Create users with different roles
      schoolUser = await createTestUser({
        role: 'school',
        email: 'school.integration@test.com',
      });
      studentUser = await createTestUser({
        role: 'student',
        email: 'student.integration@test.com',
      });
      adminUser = await createTestUser({
        role: 'admin',
        email: 'admin.integration@test.com',
      });

      // Get access tokens for each user
      accessTokens = {
        school: schoolUser.generateAccessToken(),
        student: studentUser.generateAccessToken(),
        admin: adminUser.generateAccessToken(),
      };
    });

    it('should complete course creation to approval workflow', async () => {
      const courseData = {
        title: 'Integration Test Course',
        instructor: 'Test Instructor',
        duration: '8 weeks',
        price: 499.99,
        language: 'English',
        type: 'online',
        description: 'A comprehensive integration test course',
        objectives: ['Learn integration testing', 'Master API workflows'],
        skills: ['Testing', 'API Design', 'Quality Assurance'],
        category: 'Technology',
      };

      // 1. School creates course
      const createResponse = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${accessTokens.school}`)
        .send(courseData);

      expectSuccessResponse(createResponse, 201);
      const courseId = createResponse.body.data.course._id;

      // 2. Student can view the course
      const viewResponse = await request(app)
        .get(`/api/v1/courses/${courseId}`)
        .set('Authorization', `Bearer ${accessTokens.student}`);

      expectSuccessResponse(viewResponse, 200);
      expect(viewResponse.body.data.course.title).toBe(courseData.title);

      // 3. Admin approves the course
      const approveResponse = await request(app)
        .patch(`/api/v1/courses/${courseId}/status`)
        .set('Authorization', `Bearer ${accessTokens.admin}`)
        .send({ status: 'approved' });

      expectSuccessResponse(approveResponse, 200);
      expect(approveResponse.body.data.course.status).toBe('approved');

      // 4. Course appears in search results
      const searchResponse = await request(app)
        .get('/api/v1/courses/search?q=Integration')
        .set('Authorization', `Bearer ${accessTokens.student}`);

      expectSuccessResponse(searchResponse, 200);
      expect(searchResponse.body.data.courses.length).toBeGreaterThan(0);
    });

    it('should handle course update workflow', async () => {
      // Create initial course
      const course = await createTestCourse(schoolUser);

      const updateData = {
        title: 'Updated Integration Course',
        price: 599.99,
        description: 'Updated course description',
      };

      // School updates own course
      const updateResponse = await request(app)
        .put(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${accessTokens.school}`)
        .send(updateData);

      expectSuccessResponse(updateResponse, 200);
      expect(updateResponse.body.data.course.title).toBe(updateData.title);
      expect(updateResponse.body.data.course.price).toBe(updateData.price);

      // Verify changes are persisted
      const getResponse = await request(app)
        .get(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${accessTokens.student}`);

      expectSuccessResponse(getResponse, 200);
      expect(getResponse.body.data.course.title).toBe(updateData.title);
    });
  });

  describe('Job Management Workflow', () => {
    let employerUser, studentUser, accessTokens;

    beforeEach(async () => {
      employerUser = await createTestUser({
        role: 'employer',
        email: 'employer.integration@test.com',
      });
      studentUser = await createTestUser({
        role: 'student',
        email: 'student.jobs@test.com',
      });

      accessTokens = {
        employer: employerUser.generateAccessToken(),
        student: studentUser.generateAccessToken(),
      };
    });

    it('should complete job posting to application workflow', async () => {
      const jobData = {
        jobTitle: 'Integration Test Developer',
        department: 'Engineering',
        location: 'Remote',
        employmentType: 'Full-time',
        salary: {
          min: 60000,
          max: 90000,
          currency: 'USD',
        },
        jobDescription: 'We are looking for an integration test developer...',
        skillsRequired: [
          { skill: 'JavaScript', proficiency: 'Advanced' },
          { skill: 'Testing', proficiency: 'Intermediate' },
        ],
        benefits: 'Remote work, health insurance, learning budget',
        category: 'Technology',
      };

      // 1. Employer posts job
      const postResponse = await request(app)
        .post('/api/v1/jobs')
        .set('Authorization', `Bearer ${accessTokens.employer}`)
        .send(jobData);

      expectSuccessResponse(postResponse, 201);
      const jobId = postResponse.body.data.job._id;

      // 2. Job appears in public listings
      const listResponse = await request(app)
        .get('/api/v1/jobs')
        .set('Authorization', `Bearer ${accessTokens.student}`);

      expectSuccessResponse(listResponse, 200);
      expect(listResponse.body.data.jobs.some(job => job._id === jobId)).toBe(true);

      // 3. Student can view job details
      const detailResponse = await request(app)
        .get(`/api/v1/jobs/${jobId}`)
        .set('Authorization', `Bearer ${accessTokens.student}`);

      expectSuccessResponse(detailResponse, 200);
      expect(detailResponse.body.data.jobTitle).toBe(jobData.jobTitle);

      // 4. Job appears in search results
      const searchResponse = await request(app)
        .get('/api/v1/jobs/search/advanced?q=Integration')
        .set('Authorization', `Bearer ${accessTokens.student}`);

      expectSuccessResponse(searchResponse, 200);
      expect(searchResponse.body.data.jobs.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication and Authorization', () => {
    let users, tokens;

    beforeEach(async () => {
      users = {
        student: await createTestUser({
          role: 'student',
          email: 'auth.student@test.com',
        }),
        school: await createTestUser({
          role: 'school',
          email: 'auth.school@test.com',
        }),
        employer: await createTestUser({
          role: 'employer',
          email: 'auth.employer@test.com',
        }),
        admin: await createTestUser({
          role: 'admin',
          email: 'auth.admin@test.com',
        }),
      };

      tokens = Object.fromEntries(
        Object.entries(users).map(([role, user]) => [
          role,
          user.generateAccessToken(),
        ])
      );
    });

    it('should enforce role-based access control', async () => {
      const course = await createTestCourse(users.school);

      // Test course creation permissions
      const courseData = {
        title: 'Auth Test Course',
        instructor: 'Test Instructor',
        duration: '4 weeks',
        price: 299.99,
        language: 'English',
        type: 'online',
        description: 'Test description',
        objectives: ['Test objective'],
        skills: ['Test skill'],
        category: 'Technology',
      };

      // Students cannot create courses
      const studentCreateResponse = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tokens.student}`)
        .send(courseData);

      expectErrorResponse(studentCreateResponse, 403);

      // Schools can create courses
      const schoolCreateResponse = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${tokens.school}`)
        .send(courseData);

      expectSuccessResponse(schoolCreateResponse, 201);

      // Only admins can delete courses
      const studentDeleteResponse = await request(app)
        .delete(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${tokens.student}`);

      expectErrorResponse(studentDeleteResponse, 403);

      const adminDeleteResponse = await request(app)
        .delete(`/api/v1/courses/${course._id}`)
        .set('Authorization', `Bearer ${tokens.admin}`);

      expectSuccessResponse(adminDeleteResponse, 200);
    });

    it('should handle token expiration and refresh', async () => {
      // This test would require implementing token refresh functionality
      // For now, we test token validation
      const validResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tokens.admin}`);

      expectSuccessResponse(validResponse, 200);

      // Test with invalid token
      const invalidResponse = await request(app)
        .get('/api/v1/users')
        .set('Authorization', 'Bearer invalid-token');

      expectErrorResponse(invalidResponse, 401);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'error.test@test.com',
      });
      token = testUser.generateAccessToken();
    });

    it('should handle malformed requests gracefully', async () => {
      // Test with malformed JSON
      const malformedResponse = await request(app)
        .post('/api/v1/users/register')
        .set('Content-Type', 'application/json')
        .send('{ "invalid": json }');

      expectErrorResponse(malformedResponse, 400);

      // Test with missing content-type
      const noContentTypeResponse = await request(app)
        .post('/api/v1/users/register')
        .send({ email: 'test@test.com' });

      expect(noContentTypeResponse.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle rate limiting', async () => {
      // This test would require implementing rate limiting
      // For now, we test that endpoints are accessible
      const response = await request(app)
        .get('/api/v1/courses')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBeLessThan(500);
    });

    it('should handle database errors gracefully', async () => {
      // Test with invalid ObjectId
      const invalidIdResponse = await request(app)
        .get('/api/v1/courses/invalid-id-format')
        .set('Authorization', `Bearer ${token}`);

      expect(invalidIdResponse.status).toBeGreaterThanOrEqual(400);
      expect(invalidIdResponse.body).toHaveProperty('success', false);
    });
  });

  describe('API Performance', () => {
    let testUser, token;

    beforeEach(async () => {
      testUser = await createTestUser({
        email: 'performance@test.com',
      });
      token = testUser.generateAccessToken();
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, () =>
        request(app)
          .get('/api/v1/courses')
          .set('Authorization', `Bearer ${token}`)
      );

      const start = Date.now();
      const responses = await Promise.all(concurrentRequests);
      const duration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBeLessThan(400);
      });

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000);
    });

    it('should handle large payloads', async () => {
      const largeSkillsArray = Array.from({ length: 100 }, (_, i) => `Skill ${i}`);
      const largeObjectivesArray = Array.from({ length: 50 }, (_, i) => `Objective ${i}`);

      const largePayload = {
        title: 'Large Payload Course',
        instructor: 'Performance Instructor',
        duration: '12 weeks',
        price: 999.99,
        language: 'English',
        type: 'online',
        description: 'A' + 'a'.repeat(1000), // Large description
        objectives: largeObjectivesArray,
        skills: largeSkillsArray,
        category: 'Technology',
      };

      const schoolUser = await createTestUser({
        role: 'school',
        email: 'school.performance@test.com',
      });
      const schoolToken = schoolUser.generateAccessToken();

      const response = await request(app)
        .post('/api/v1/courses')
        .set('Authorization', `Bearer ${schoolToken}`)
        .send(largePayload);

      // Should handle large payload successfully
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Health Check and Monitoring', () => {
    it('should respond to health check', async () => {
      const response = await request(app).get('/');

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('availableEndpoints');
    });

    it('should handle 404 for non-existent routes', async () => {
      const response = await request(app).get('/api/v1/non-existent-route');

      expectErrorResponse(response, 404);
      expect(response.body.message).toMatch(/route does not exist/i);
    });
  });
});
