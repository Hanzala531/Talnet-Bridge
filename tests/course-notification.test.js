import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createCourseCreationNotifications, getSchoolStudents } from '../src/services/notification.service.js';
import { Course } from '../src/models/contents/course.models.js';
import { Enrollment } from '../src/models/contents/enrollments.models.js';
import { User } from '../src/models/contents/User.models.js';
import { TrainingInstitute } from '../src/models/contents/trainingInstitute.models.js';
import { Notification } from '../src/models/contents/notification.models.js';

/**
 * Test suite for course creation notifications
 * Tests the notification system when a school creates a new course
 */
describe('Course Creation Notifications', () => {
  let testSchool, testCourse, testStudents, testEnrollments;

  beforeEach(async () => {
    // Clean up any existing test data
    await Notification.deleteMany({ 'metadata.courseTitle': 'Test Course' });
    await Enrollment.deleteMany({});
    await Course.deleteMany({ title: 'Test Course' });
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    await TrainingInstitute.deleteMany({ name: 'Test Training Institute' });

    // Create test school user
    const schoolUser = await User.create({
      fullName: 'Test School Admin',
      email: 'school@example.com',
      password: 'password123',
      phone: '+1234567890',
      role: 'school'
    });

    // Create test school
    testSchool = await TrainingInstitute.create({
      userId: schoolUser._id,
      name: 'Test Training Institute',
      email: 'school@example.com',
      phone: '+1234567890',
      about: 'A test training institute',
      established: new Date('2020-01-01'),
      location: 'Test City',
      focusAreas: ['Technology', 'Business']
    });

    // Create test students
    const student1 = await User.create({
      fullName: 'Test Student 1',
      email: 'student1@example.com',
      password: 'password123',
      phone: '+1234567891',
      role: 'student'
    });

    const student2 = await User.create({
      fullName: 'Test Student 2',
      email: 'student2@example.com',
      password: 'password123',
      phone: '+1234567892',
      role: 'student'
    });

    testStudents = [student1, student2];

    // Create a course for the school
    const existingCourse = await Course.create({
      title: 'Existing Course',
      instructor: 'Test Instructor',
      duration: '4 weeks',
      price: 299,
      language: 'English',
      type: 'online',
      description: 'An existing course for testing',
      objectives: ['Learn basics'],
      skills: ['Basic skills'],
      category: 'Technology',
      trainingProvider: testSchool._id,
      coverImage: 'https://example.com/image.jpg',
      instructorPicture: 'https://example.com/instructor.jpg'
    });

    // Create enrollments for students in the existing course
    testEnrollments = await Promise.all([
      Enrollment.create({
        studentId: student1._id,
        courseId: existingCourse._id,
        status: 'enrolled'
      }),
      Enrollment.create({
        studentId: student2._id,
        courseId: existingCourse._id,
        status: 'enrolled'
      })
    ]);

    // Create new test course
    testCourse = await Course.create({
      title: 'Test Course',
      instructor: 'Test Instructor',
      duration: '6 weeks',
      price: 399,
      language: 'English',
      type: 'online',
      description: 'A new test course',
      objectives: ['Learn advanced topics'],
      skills: ['Advanced skills'],
      category: 'Technology',
      trainingProvider: testSchool._id,
      coverImage: 'https://example.com/image.jpg',
      instructorPicture: 'https://example.com/instructor.jpg'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await Notification.deleteMany({ 'metadata.courseTitle': 'Test Course' });
    await Enrollment.deleteMany({});
    await Course.deleteMany({});
    await User.deleteMany({ email: { $regex: /test.*@example\.com/ } });
    await TrainingInstitute.deleteMany({ name: 'Test Training Institute' });
  });

  describe('getSchoolStudents', () => {
    it('should return students who have enrolled in school courses', async () => {
      const studentIds = await getSchoolStudents(testSchool._id);
      
      expect(studentIds).toHaveLength(2);
      expect(studentIds).toContain(testStudents[0]._id.toString());
      expect(studentIds).toContain(testStudents[1]._id.toString());
    });

    it('should return empty array for school with no courses', async () => {
      // Create a school with no courses
      const newSchoolUser = await User.create({
        fullName: 'New School Admin',
        email: 'newschool@example.com',
        password: 'password123',
        phone: '+1234567899',
        role: 'school'
      });

      const newSchool = await TrainingInstitute.create({
        userId: newSchoolUser._id,
        name: 'New Training Institute',
        email: 'newschool@example.com',
        phone: '+1234567899',
        about: 'A new training institute',
        established: new Date('2023-01-01'),
        location: 'New City',
        focusAreas: ['Business']
      });

      const studentIds = await getSchoolStudents(newSchool._id);
      expect(studentIds).toHaveLength(0);
    });
  });

  describe('createCourseCreationNotifications', () => {
    it('should create notifications for all students of the school', async () => {
      const notifications = await createCourseCreationNotifications(
        testCourse, 
        testSchool.name
      );

      expect(notifications).toHaveLength(2);
      
      // Check notification content
      notifications.forEach(notification => {
        expect(notification.title).toBe('New Course Available!');
        expect(notification.message).toContain(testSchool.name);
        expect(notification.message).toContain(testCourse.title);
        expect(notification.type).toBe('course_created');
        expect(notification.relatedEntity.entityType).toBe('course');
        expect(notification.relatedEntity.entityId).toEqual(testCourse._id);
        expect(notification.actionUrl).toBe(`/courses/${testCourse._id}`);
        expect(notification.priority).toBe('normal');
      });

      // Check metadata
      const firstNotification = notifications[0];
      expect(firstNotification.metadata.courseId).toEqual(testCourse._id);
      expect(firstNotification.metadata.schoolId).toEqual(testSchool._id);
      expect(firstNotification.metadata.courseTitle).toBe(testCourse.title);
      expect(firstNotification.metadata.instructor).toBe(testCourse.instructor);
      expect(firstNotification.metadata.category).toBe(testCourse.category);
    });

    it('should return empty array when school has no students', async () => {
      // Create a school with no students
      const newSchoolUser = await User.create({
        fullName: 'Empty School Admin',
        email: 'emptyschool@example.com',
        password: 'password123',
        phone: '+1234567898',
        role: 'school'
      });

      const emptySchool = await TrainingInstitute.create({
        userId: newSchoolUser._id,
        name: 'Empty Training Institute',
        email: 'emptyschool@example.com',
        phone: '+1234567898',
        about: 'An empty training institute',
        established: new Date('2023-01-01'),
        location: 'Empty City',
        focusAreas: ['Business']
      });

      const emptyCourse = await Course.create({
        title: 'Empty Course',
        instructor: 'Empty Instructor',
        duration: '2 weeks',
        price: 199,
        language: 'English',
        type: 'online',
        description: 'A course with no students',
        objectives: ['Learn nothing'],
        skills: ['No skills'],
        category: 'Business',
        trainingProvider: emptySchool._id,
        coverImage: 'https://example.com/image.jpg',
        instructorPicture: 'https://example.com/instructor.jpg'
      });

      const notifications = await createCourseCreationNotifications(
        emptyCourse, 
        emptySchool.name
      );

      expect(notifications).toHaveLength(0);
    });

    it('should handle socket.io integration when provided', async () => {
      // Mock socket.io
      const mockSocket = {
        emit: jest.fn()
      };
      
      const mockNamespace = {
        to: jest.fn(() => mockSocket)
      };
      
      const mockIo = {
        of: jest.fn(() => mockNamespace)
      };

      const notifications = await createCourseCreationNotifications(
        testCourse, 
        testSchool.name,
        mockIo
      );

      expect(notifications).toHaveLength(2);
      expect(mockIo.of).toHaveBeenCalledWith('/notifications');
      expect(mockNamespace.to).toHaveBeenCalledTimes(2);
      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
      
      // Check the socket emission content
      expect(mockSocket.emit).toHaveBeenCalledWith('new_notification', expect.objectContaining({
        title: 'New Course Available!',
        type: 'course_created',
        actionUrl: `/courses/${testCourse._id}`
      }));
    });
  });
});
