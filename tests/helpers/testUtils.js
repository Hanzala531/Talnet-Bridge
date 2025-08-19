import request from 'supertest';
import jwt from 'jsonwebtoken';
import { User } from '../../src/models/index.js';
import { app } from '../../src/app.js';

/**
 * Test utilities for creating test data and making authenticated requests
 */

// Create test user with different roles
export const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '03001234567',
    password: 'testPassword123',
    role: 'student',
    status: 'approved',
    onboardingStage: 'active',
    ...overrides
  };

  const user = await User.create(defaultUser);
  return user;
};

// Create multiple test users
export const createTestUsers = async (count = 3) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser({
      fullName: `Test User ${i + 1}`,
      email: `test${i + 1}@example.com`,
      phone: `03001234${String(567 + i).padStart(3, '0')}`,
    });
    users.push(user);
  }
  return users;
};

// Generate JWT token for test user
export const generateTestToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Create authenticated request with token
export const authenticatedRequest = (user) => {
  const token = generateTestToken(user);
  return request(app).set('Authorization', `Bearer ${token}`);
};

// Create test data for different entities
export const createTestCourse = async (provider, overrides = {}) => {
  const { Course } = await import('../../src/models/index.js');
  
  const defaultCourse = {
    title: 'Test Course',
    instructor: 'Test Instructor',
    duration: '4 weeks',
    price: 299.99,
    language: 'English',
    type: 'online',
    description: 'A comprehensive test course',
    objectives: ['Learn testing', 'Master Jest', 'Build confidence'],
    skills: ['Testing', 'JavaScript', 'API Development'],
    category: 'Technology',
    trainingProvider: provider._id,
    status: 'approved',
    ...overrides
  };

  const course = await Course.create(defaultCourse);
  return course;
};

export const createTestJob = async (employer, overrides = {}) => {
  const { Job } = await import('../../src/models/index.js');
  
  const defaultJob = {
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    location: 'Karachi',
    employmentType: 'Full-time',
    salary: {
      min: 50000,
      max: 80000,
      currency: 'PKR'
    },
    jobDescription: 'Exciting opportunity for software engineer',
    skillsRequired: [
      { skill: 'JavaScript', proficiency: 'Intermediate' },
      { skill: 'React', proficiency: 'Advanced' }
    ],
    benefits: 'Health insurance, flexible hours',
    category: 'Technology',
    postedBy: employer._id,
    status: 'active',
    ...overrides
  };

  const job = await Job.create(defaultJob);
  return job;
};

export const createTestStudent = async (user, overrides = {}) => {
  const { Student } = await import('../../src/models/index.js');
  
  const defaultStudent = {
    userId: user._id,
    bio: 'Passionate about technology and learning',
    location: 'Karachi, Pakistan',
    skills: ['JavaScript', 'React', 'Node.js'],
    gsceResult: [
      { subject: 'Mathematics', grade: 'A*' },
      { subject: 'Physics', grade: 'A' }
    ],
    ...overrides
  };

  const student = await Student.create(defaultStudent);
  return student;
};

// API testing helpers
export const expectSuccessResponse = (response, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', true);
  expect(response.body).toHaveProperty('statusCode', statusCode);
  expect(response.body).toHaveProperty('data');
  expect(response.body).toHaveProperty('message');
};

export const expectErrorResponse = (response, statusCode, message = null) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('success', false);
  expect(response.body).toHaveProperty('statusCode', statusCode);
  if (message) {
    expect(response.body.message).toMatch(message);
  }
};

export const expectValidationError = (response, field = null) => {
  expectErrorResponse(response, 400);
  if (field) {
    expect(response.body.message.toLowerCase()).toMatch(field.toLowerCase());
  }
};

export const expectUnauthorizedError = (response) => {
  expectErrorResponse(response, 401, /unauthorized|token/i);
};

export const expectForbiddenError = (response) => {
  expectErrorResponse(response, 403, /forbidden|access denied/i);
};

export const expectNotFoundError = (response) => {
  expectErrorResponse(response, 404, /not found/i);
};

// Database helpers
export const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

export const countDocuments = async (model) => {
  return await model.countDocuments();
};

// Mock data generators
export const generateMockUsers = (count = 5) => {
  return Array.from({ length: count }, (_, index) => ({
    fullName: `User ${index + 1}`,
    email: `user${index + 1}@test.com`,
    phone: `03001234${String(567 + index).padStart(3, '0')}`,
    password: 'password123',
    role: ['student', 'employer', 'school'][index % 3],
  }));
};

export const generateMockCourses = (providerId, count = 3) => {
  return Array.from({ length: count }, (_, index) => ({
    title: `Course ${index + 1}`,
    instructor: `Instructor ${index + 1}`,
    duration: `${4 + index} weeks`,
    price: 100 + (index * 50),
    language: 'English',
    type: ['online', 'offline', 'hybrid'][index % 3],
    description: `Description for course ${index + 1}`,
    objectives: [`Objective ${index + 1}A`, `Objective ${index + 1}B`],
    skills: [`Skill ${index + 1}A`, `Skill ${index + 1}B`],
    category: ['Technology', 'Business', 'Arts'][index % 3],
    trainingProvider: providerId,
  }));
};

// Performance testing helpers
export const measureExecutionTime = async (fn) => {
  const start = process.hrtime.bigint();
  const result = await fn();
  const end = process.hrtime.bigint();
  const duration = Number(end - start) / 1000000; // Convert to milliseconds
  return { result, duration };
};

export const expectResponseTime = (response, maxTime = 1000) => {
  const responseTime = response.get('X-Response-Time') || 
                       response.headers['x-response-time'];
  if (responseTime) {
    const time = parseInt(responseTime.replace('ms', ''));
    expect(time).toBeLessThan(maxTime);
  }
};

// Socket.io testing helpers
export const createSocketClient = (token) => {
  const Client = require('socket.io-client');
  return new Client('http://localhost:4000', {
    auth: { token },
    autoConnect: false,
  });
};

export const waitForSocketEvent = (socket, event, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Socket event '${event}' not received within ${timeout}ms`));
    }, timeout);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

export default {
  createTestUser,
  createTestUsers,
  generateTestToken,
  authenticatedRequest,
  createTestCourse,
  createTestJob,
  createTestStudent,
  expectSuccessResponse,
  expectErrorResponse,
  expectValidationError,
  expectUnauthorizedError,
  expectForbiddenError,
  expectNotFoundError,
  clearDatabase,
  countDocuments,
  generateMockUsers,
  generateMockCourses,
  measureExecutionTime,
  expectResponseTime,
  createSocketClient,
  waitForSocketEvent,
};
