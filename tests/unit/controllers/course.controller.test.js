import {
  createTestUser,
  createTestCourse,
  authenticatedRequest,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectUnauthorizedError,
  expectForbiddenError,
  expectNotFoundError,
} from '../../helpers/testUtils.js';
import { Course } from '../../../src/models/index.js';

describe('Course Controller Tests', () => {
  let schoolUser, studentUser, adminUser, course;

  beforeEach(async () => {
    schoolUser = await createTestUser({
      role: 'school',
      email: 'school@test.com',
    });
    studentUser = await createTestUser({
      role: 'student',
      email: 'student@test.com',
    });
    adminUser = await createTestUser({
      role: 'admin',
      email: 'admin@test.com',
    });
    course = await createTestCourse(schoolUser);
  });

  describe('GET /api/v1/courses', () => {
    beforeEach(async () => {
      // Create additional courses for pagination testing
      await createTestCourse(schoolUser, { title: 'Course 2' });
      await createTestCourse(schoolUser, { title: 'Course 3' });
    });

    it('should get all courses with pagination', async () => {
      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses?page=1&limit=2');

      expectSuccessResponse(response, 200);
      expect(response.body.data).toHaveProperty('courses');
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.courses).toHaveLength(2);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(2);
    });

    it('should filter courses by category', async () => {
      await createTestCourse(schoolUser, { 
        title: 'Business Course',
        category: 'Business' 
      });

      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses?category=Technology');

      expectSuccessResponse(response, 200);
      expect(response.body.data.courses.length).toBe(3); // 3 Technology courses
      response.body.data.courses.forEach(course => {
        expect(course.category).toBe('Technology');
      });
    });

    it('should return 404 when no courses found', async () => {
      // Clear all courses
      await Course.deleteMany({});

      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses');

      expectNotFoundError(response);
    });
  });

  describe('GET /api/v1/courses/:id', () => {
    it('should get course by valid ID', async () => {
      const response = await authenticatedRequest(studentUser)
        .get(`/api/v1/courses/${course._id}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data.course._id).toBe(course._id.toString());
      expect(response.body.data.course.title).toBe(course.title);
    });

    it('should return 404 for non-existent course', async () => {
      const nonExistentId = '64f123abc456def789012345';
      const response = await authenticatedRequest(studentUser)
        .get(`/api/v1/courses/${nonExistentId}`);

      expectNotFoundError(response);
    });

    it('should return 400 for invalid course ID format', async () => {
      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses/invalid-id');

      expectErrorResponse(response, 500); // MongoDB will throw an error for invalid ObjectId
    });
  });

  describe('POST /api/v1/courses', () => {
    const validCourseData = {
      title: 'New Test Course',
      instructor: 'New Instructor',
      duration: '6 weeks',
      price: 399.99,
      language: 'English',
      type: 'online',
      description: 'A comprehensive new course',
      objectives: ['Learn new skills', 'Master concepts', 'Build projects'],
      skills: ['New Skill', 'Advanced Topics'],
      category: 'Technology',
    };

    it('should create course with valid data as school user', async () => {
      const response = await authenticatedRequest(schoolUser)
        .post('/api/v1/courses')
        .send(validCourseData);

      expectSuccessResponse(response, 201);
      expect(response.body.data.course.title).toBe(validCourseData.title);
      expect(response.body.data.course.trainingProvider).toBe(schoolUser._id.toString());
    });

    it('should not create course with missing required fields', async () => {
      const response = await authenticatedRequest(schoolUser)
        .post('/api/v1/courses')
        .send({ title: 'Incomplete Course' });

      expectValidationError(response);
    });

    it('should not create duplicate course', async () => {
      // Create course first
      await createTestCourse(schoolUser, {
        title: validCourseData.title,
        instructor: validCourseData.instructor,
      });

      const response = await authenticatedRequest(schoolUser)
        .post('/api/v1/courses')
        .send(validCourseData);

      expectErrorResponse(response, 409);
      expect(response.body.message).toMatch(/already exists/i);
    });

    it('should not allow non-school users to create courses', async () => {
      const response = await authenticatedRequest(studentUser)
        .post('/api/v1/courses')
        .send(validCourseData);

      expectForbiddenError(response);
    });

    it('should not create course without authentication', async () => {
      const response = await authenticatedRequest({})
        .post('/api/v1/courses')
        .send(validCourseData);

      expectUnauthorizedError(response);
    });
  });

  describe('PUT /api/v1/courses/:id', () => {
    const updateData = {
      title: 'Updated Course Title',
      price: 499.99,
      description: 'Updated description',
    };

    it('should update own course as school user', async () => {
      const response = await authenticatedRequest(schoolUser)
        .put(`/api/v1/courses/${course._id}`)
        .send(updateData);

      expectSuccessResponse(response, 200);
      expect(response.body.data.course.title).toBe(updateData.title);
      expect(response.body.data.course.price).toBe(updateData.price);
    });

    it('should not update course of another school', async () => {
      const anotherSchool = await createTestUser({
        role: 'school',
        email: 'another@school.com',
      });

      const response = await authenticatedRequest(anotherSchool)
        .put(`/api/v1/courses/${course._id}`)
        .send(updateData);

      expectErrorResponse(response, 400);
      expect(response.body.message).toMatch(/only update your own/i);
    });

    it('should return 404 for non-existent course', async () => {
      const nonExistentId = '64f123abc456def789012345';
      const response = await authenticatedRequest(schoolUser)
        .put(`/api/v1/courses/${nonExistentId}`)
        .send(updateData);

      expectNotFoundError(response);
    });

    it('should not allow non-school users to update courses', async () => {
      const response = await authenticatedRequest(studentUser)
        .put(`/api/v1/courses/${course._id}`)
        .send(updateData);

      expectForbiddenError(response);
    });
  });

  describe('PATCH /api/v1/courses/:id/status', () => {
    it('should update course status as admin', async () => {
      const response = await authenticatedRequest(adminUser)
        .patch(`/api/v1/courses/${course._id}/status`)
        .send({ status: 'approved' });

      expectSuccessResponse(response, 200);
      expect(response.body.data.course.status).toBe('approved');
    });

    it('should not update status with invalid value', async () => {
      const response = await authenticatedRequest(adminUser)
        .patch(`/api/v1/courses/${course._id}/status`)
        .send({ status: 'invalid_status' });

      expectValidationError(response);
    });

    it('should not allow non-admin to update status', async () => {
      const response = await authenticatedRequest(schoolUser)
        .patch(`/api/v1/courses/${course._id}/status`)
        .send({ status: 'approved' });

      expectErrorResponse(response, 400);
      expect(response.body.message).toMatch(/only admin/i);
    });
  });

  describe('DELETE /api/v1/courses/:id', () => {
    it('should delete course as admin', async () => {
      const response = await authenticatedRequest(adminUser)
        .delete(`/api/v1/courses/${course._id}`);

      expectSuccessResponse(response, 200);
    });

    it('should not allow non-admin to delete courses', async () => {
      const response = await authenticatedRequest(schoolUser)
        .delete(`/api/v1/courses/${course._id}`);

      expectForbiddenError(response);
    });

    it('should return 404 for non-existent course', async () => {
      const nonExistentId = '64f123abc456def789012345';
      const response = await authenticatedRequest(adminUser)
        .delete(`/api/v1/courses/${nonExistentId}`);

      expectNotFoundError(response);
    });
  });

  describe('GET /api/v1/courses/search', () => {
    beforeEach(async () => {
      await createTestCourse(schoolUser, {
        title: 'JavaScript Fundamentals',
        category: 'Technology',
        price: 199.99,
      });
      await createTestCourse(schoolUser, {
        title: 'Python for Beginners',
        category: 'Technology',
        price: 299.99,
      });
      await createTestCourse(schoolUser, {
        title: 'Business Management',
        category: 'Business',
        price: 399.99,
      });
    });

    it('should search courses by title', async () => {
      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses/search?q=JavaScript');

      expectSuccessResponse(response, 200);
      expect(response.body.data.courses.length).toBeGreaterThan(0);
      expect(response.body.data.courses[0].title).toMatch(/JavaScript/i);
    });

    it('should filter by category', async () => {
      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses/search?q=&category=Technology');

      expectSuccessResponse(response, 200);
      response.body.data.courses.forEach(course => {
        expect(course.category).toBe('Technology');
      });
    });

    it('should filter by price range', async () => {
      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses/search?q=&priceMin=200&priceMax=350');

      expectSuccessResponse(response, 200);
      response.body.data.courses.forEach(course => {
        expect(course.price).toBeGreaterThanOrEqual(200);
        expect(course.price).toBeLessThanOrEqual(350);
      });
    });
  });

  describe('GET /api/v1/courses/provider/:providerId', () => {
    it('should get courses by provider', async () => {
      const response = await authenticatedRequest(studentUser)
        .get(`/api/v1/courses/provider/${schoolUser._id}`);

      expectSuccessResponse(response, 200);
      expect(response.body.data.courses.length).toBeGreaterThan(0);
      response.body.data.courses.forEach(course => {
        expect(course.trainingProvider).toBe(schoolUser._id.toString());
      });
    });

    it('should return empty array for provider with no courses', async () => {
      const anotherSchool = await createTestUser({
        role: 'school',
        email: 'empty@school.com',
      });

      const response = await authenticatedRequest(studentUser)
        .get(`/api/v1/courses/provider/${anotherSchool._id}`);

      expectNotFoundError(response);
    });
  });

  describe('Course Model Validation', () => {
    it('should validate required fields', async () => {
      try {
        await Course.create({
          title: 'Incomplete Course',
          // Missing required fields
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should validate price is non-negative', async () => {
      try {
        await Course.create({
          title: 'Test Course',
          instructor: 'Test Instructor',
          duration: '4 weeks',
          price: -100, // Invalid negative price
          language: 'English',
          type: 'online',
          description: 'Test description',
          objectives: ['Test objective'],
          skills: ['Test skill'],
          category: 'Technology',
          trainingProvider: schoolUser._id,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });

    it('should validate objectives array is not empty', async () => {
      try {
        await Course.create({
          title: 'Test Course',
          instructor: 'Test Instructor',
          duration: '4 weeks',
          price: 100,
          language: 'English',
          type: 'online',
          description: 'Test description',
          objectives: [], // Empty array should fail
          skills: ['Test skill'],
          category: 'Technology',
          trainingProvider: schoolUser._id,
        });
        fail('Should have thrown validation error');
      } catch (error) {
        expect(error.name).toBe('ValidationError');
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk course creation efficiently', async () => {
      const coursePromises = Array.from({ length: 10 }, (_, index) =>
        createTestCourse(schoolUser, {
          title: `Bulk Course ${index}`,
          instructor: `Instructor ${index}`,
        })
      );

      const start = Date.now();
      await Promise.all(coursePromises);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle course search with large dataset', async () => {
      // Create many courses
      const coursePromises = Array.from({ length: 50 }, (_, index) =>
        createTestCourse(schoolUser, {
          title: `Performance Course ${index}`,
          category: index % 2 === 0 ? 'Technology' : 'Business',
        })
      );
      await Promise.all(coursePromises);

      const start = Date.now();
      const response = await authenticatedRequest(studentUser)
        .get('/api/v1/courses/search?q=Performance&category=Technology');
      const duration = Date.now() - start;

      expectSuccessResponse(response, 200);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
