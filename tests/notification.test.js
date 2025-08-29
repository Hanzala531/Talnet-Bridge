/**
 * Notification System Tests
 * Testing suite for web app notification functionality
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createNotification, markNotificationAsRead, getNotificationCounts } from '../services/notification.service.js';
import { Notification } from '../models/contents/notification.models.js';
import { User } from '../models/contents/User.models.js';
import { NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../constants/notification.constants.js';

describe('Notification System - Web App Only', () => {
  let mongoServer;
  let testUser;

  beforeEach(async () => {
    // Setup in-memory MongoDB
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Create test user
    testUser = await User.create({
      fullName: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'student'
    });
  });

  afterEach(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('Notification Creation', () => {
    it('should create a web app notification successfully', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Test Notification',
        message: 'This is a test notification for web app delivery',
        type: NOTIFICATION_TYPES.COURSE_ENROLLMENT,
        priority: NOTIFICATION_PRIORITIES.NORMAL
      };

      const notification = await createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.recipient.toString()).toBe(testUser._id.toString());
      expect(notification.title).toBe(notificationData.title);
      expect(notification.message).toBe(notificationData.message);
      expect(notification.type).toBe(notificationData.type);
      expect(notification.priority).toBe(notificationData.priority);
      expect(notification.delivery.inApp.delivered).toBe(true);
      expect(notification.delivery.inApp.deliveredAt).toBeDefined();
    });

    it('should auto-set delivery status for web app', async () => {
      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Auto Delivery Test',
        message: 'Testing automatic delivery status setting',
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED
      });

      expect(notification.delivery.inApp.delivered).toBe(true);
      expect(notification.delivery.inApp.deliveredAt).toBeInstanceOf(Date);
    });

    it('should reject notification for non-existent user', async () => {
      const fakeUserId = new mongoose.Types.ObjectId();
      
      await expect(createNotification({
        recipient: fakeUserId,
        title: 'Test Notification',
        message: 'This should fail',
        type: NOTIFICATION_TYPES.SYSTEM_UPDATE
      })).rejects.toThrow('Recipient user not found');
    });

    it('should create course enrollment notification', async () => {
      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Course Enrollment Confirmed',
        message: 'You have successfully enrolled in JavaScript Fundamentals',
        type: NOTIFICATION_TYPES.COURSE_ENROLLMENT,
        relatedEntity: {
          entityType: 'course',
          entityId: new mongoose.Types.ObjectId()
        },
        actionUrl: '/courses/123'
      });

      expect(notification.type).toBe(NOTIFICATION_TYPES.COURSE_ENROLLMENT);
      expect(notification.relatedEntity.entityType).toBe('course');
      expect(notification.actionUrl).toBe('/courses/123');
    });

    it('should create payment notification with proper priority', async () => {
      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Payment Failed',
        message: 'Your payment could not be processed',
        type: NOTIFICATION_TYPES.PAYMENT_FAILED,
        priority: NOTIFICATION_PRIORITIES.HIGH
      });

      expect(notification.type).toBe(NOTIFICATION_TYPES.PAYMENT_FAILED);
      expect(notification.priority).toBe(NOTIFICATION_PRIORITIES.HIGH);
    });
  });

  describe('Notification Status Management', () => {
    let testNotification;

    beforeEach(async () => {
      testNotification = await createNotification({
        recipient: testUser._id,
        title: 'Status Test',
        message: 'Testing notification status changes',
        type: NOTIFICATION_TYPES.SYSTEM_UPDATE
      });
    });

    it('should mark notification as read', async () => {
      const updatedNotification = await markNotificationAsRead(
        testNotification._id,
        testUser._id
      );

      expect(updatedNotification.status).toBe('read');
      expect(updatedNotification.readAt).toBeDefined();
    });

    it('should not mark notification as read for wrong user', async () => {
      const otherUser = await User.create({
        fullName: 'Other User',
        email: 'other@example.com',
        password: 'password123',
        role: 'student'
      });

      await expect(markNotificationAsRead(
        testNotification._id,
        otherUser._id
      )).rejects.toThrow('Notification not found');
    });
  });

  describe('Notification Counts', () => {
    beforeEach(async () => {
      // Create multiple notifications
      await Promise.all([
        createNotification({
          recipient: testUser._id,
          title: 'Unread 1',
          message: 'First unread notification',
          type: NOTIFICATION_TYPES.COURSE_ENROLLMENT
        }),
        createNotification({
          recipient: testUser._id,
          title: 'Unread 2',
          message: 'Second unread notification',
          type: NOTIFICATION_TYPES.JOB_APPLICATION
        })
      ]);

      // Create and mark one as read
      const readNotification = await createNotification({
        recipient: testUser._id,
        title: 'Read Notification',
        message: 'This will be marked as read',
        type: NOTIFICATION_TYPES.MESSAGE_RECEIVED
      });

      await markNotificationAsRead(readNotification._id, testUser._id);
    });

    it('should return correct notification counts', async () => {
      const counts = await getNotificationCounts(testUser._id);

      expect(counts.total).toBe(3);
      expect(counts.unread).toBe(2);
    });
  });

  describe('Notification Model', () => {
    it('should have required fields', async () => {
      const notification = new Notification({
        recipient: testUser._id,
        title: 'Model Test',
        message: 'Testing notification model',
        type: NOTIFICATION_TYPES.PROFILE_VERIFIED
      });

      await notification.save();

      expect(notification.recipient).toBeDefined();
      expect(notification.title).toBeDefined();
      expect(notification.message).toBeDefined();
      expect(notification.type).toBeDefined();
      expect(notification.status).toBe('unread');
      expect(notification.priority).toBe('normal');
    });

    it('should validate notification type', async () => {
      const notification = new Notification({
        recipient: testUser._id,
        title: 'Invalid Type Test',
        message: 'Testing invalid notification type',
        type: 'invalid_type'
      });

      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate title length', async () => {
      const notification = new Notification({
        recipient: testUser._id,
        title: 'AB', // Too short
        message: 'Testing title validation',
        type: NOTIFICATION_TYPES.SYSTEM_UPDATE
      });

      await expect(notification.save()).rejects.toThrow();
    });

    it('should validate message length', async () => {
      const notification = new Notification({
        recipient: testUser._id,
        title: 'Message Length Test',
        message: 'Short', // Too short
        type: NOTIFICATION_TYPES.SYSTEM_UPDATE
      });

      await expect(notification.save()).rejects.toThrow();
    });
  });

  describe('Notification Expiration', () => {
    it('should handle expiration date', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Expiring Notification',
        message: 'This notification will expire in a week',
        type: NOTIFICATION_TYPES.SYSTEM_UPDATE,
        expiresAt: futureDate
      });

      expect(notification.expiresAt).toEqual(futureDate);
      expect(notification.isExpired).toBe(false);
    });

    it('should detect expired notifications', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Expired Notification',
        message: 'This notification is already expired',
        type: NOTIFICATION_TYPES.SYSTEM_UPDATE,
        expiresAt: pastDate
      });

      expect(notification.isExpired).toBe(true);
    });
  });

  describe('Related Entity', () => {
    it('should store related entity information', async () => {
      const courseId = new mongoose.Types.ObjectId();
      
      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Course Related',
        message: 'Notification with related course entity',
        type: NOTIFICATION_TYPES.COURSE_ENROLLMENT,
        relatedEntity: {
          entityType: 'course',
          entityId: courseId
        }
      });

      expect(notification.relatedEntity.entityType).toBe('course');
      expect(notification.relatedEntity.entityId.toString()).toBe(courseId.toString());
    });
  });

  describe('Static Methods', () => {
    it('should use createNotification static method', async () => {
      const notificationData = {
        recipient: testUser._id,
        title: 'Static Method Test',
        message: 'Testing static createNotification method',
        type: NOTIFICATION_TYPES.CERTIFICATE_ISSUED
      };

      const notification = await Notification.createNotification(notificationData);

      expect(notification).toBeDefined();
      expect(notification.delivery.inApp.delivered).toBe(true);
    });

    it('should use markAsRead instance method', async () => {
      const notification = await createNotification({
        recipient: testUser._id,
        title: 'Mark Read Test',
        message: 'Testing markAsRead method',
        type: NOTIFICATION_TYPES.INTERVIEW_SCHEDULED
      });

      await notification.markAsRead();

      expect(notification.status).toBe('read');
      expect(notification.readAt).toBeDefined();
    });
  });
});

describe('Notification Constants', () => {
  it('should have all required notification types', () => {
    const requiredTypes = [
      'course_enrollment',
      'course_completion',
      'job_application',
      'payment_received',
      'payment_failed',
      'message_received',
      'system_update',
      'security_alert'
    ];

    requiredTypes.forEach(type => {
      expect(Object.values(NOTIFICATION_TYPES)).toContain(type);
    });
  });

  it('should have valid priority levels', () => {
    const priorities = Object.values(NOTIFICATION_PRIORITIES);
    
    expect(priorities).toContain('low');
    expect(priorities).toContain('normal');
    expect(priorities).toContain('high');
  });
});

// Mock Socket.io for real-time notification tests
describe('Real-time Notifications', () => {
  let mockIo;
  let mockSocket;

  beforeEach(() => {
    mockSocket = {
      emit: jest.fn(),
      to: jest.fn().mockReturnThis()
    };

    mockIo = {
      of: jest.fn().mockReturnValue(mockSocket)
    };
  });

  it('should emit notification via socket', async () => {
    const { sendRealTimeNotification } = await import('../services/notification.service.js');
    
    const notification = {
      _id: 'test-id',
      title: 'Real-time Test',
      message: 'Testing real-time notification',
      type: NOTIFICATION_TYPES.MESSAGE_RECEIVED,
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      createdAt: new Date()
    };

    sendRealTimeNotification(mockIo, testUser._id, notification);

    expect(mockIo.of).toHaveBeenCalledWith('/notifications');
    expect(mockSocket.to).toHaveBeenCalledWith(`user:${testUser._id}`);
    expect(mockSocket.emit).toHaveBeenCalledWith('notification:new', expect.objectContaining({
      _id: notification._id,
      title: notification.title,
      message: notification.message
    }));
  });
});
