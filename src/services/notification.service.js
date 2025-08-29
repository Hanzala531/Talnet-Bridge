import { Notification } from "../models/contents/notification.models.js";
import { User } from "../models/contents/User.models.js";
import { Enrollment } from "../models/contents/enrollments.models.js";
import { Course } from "../models/contents/course.models.js";
import { NOTIFICATION_TYPES } from "../constants/notification.constants.js";
import redisClient from "../config/redis.config.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Create a notification for a user (Web App Only)
 * @param {Object} data - Notification data
 * @param {string} data.recipient - User ID of the recipient
 * @param {string} data.title - Notification title
 * @param {string} data.message - Notification message
 * @param {string} data.type - Notification type
 * @param {Object} data.relatedEntity - Related entity information
 * @param {string} data.actionUrl - URL for notification action
 * @param {string} data.priority - Notification priority (low, normal, high)
 * @param {Object} data.metadata - Additional metadata
 * @param {Date} data.expiresAt - Expiration date
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(data) {
  try {
    // Validate recipient exists
    const recipient = await User.findById(data.recipient).select("_id fullName email role");
    if (!recipient) {
      throw new ApiError(404, "Recipient user not found");
    }

    // Create notification (Web App Only)
    const notification = new Notification({
      recipient: data.recipient,
      title: data.title,
      message: data.message,
      type: data.type,
      relatedEntity: data.relatedEntity,
      actionUrl: data.actionUrl,
      priority: data.priority || "normal",
      metadata: data.metadata,
      expiresAt: data.expiresAt,
      delivery: {
        inApp: {
          delivered: true,
          deliveredAt: new Date()
        }
      }
    });

    await notification.save();

    // Clear cache for user notifications
    const cacheKeys = [
      `notifications:${data.recipient}:*`,
      `notification:count:${data.recipient}`,
    ];
    
    for (const pattern of cacheKeys) {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    }

    return notification;
  } catch (error) {
    throw new ApiError(500, `Failed to create notification: ${error.message}`);
  }
}

/**
 * Create notification for new chat message (Web App Only)
 * @param {Object} data - Message data
 * @param {string} data.senderId - ID of message sender
 * @param {string} data.recipientId - ID of message recipient
 * @param {string} data.conversationId - ID of conversation
 * @param {string} data.messageText - Message content preview
 * @param {string} data.senderName - Name of sender
 * @returns {Promise<Object>} Created notification
 */
export async function createChatMessageNotification({
  senderId,
  recipientId,
  conversationId,
  messageText,
  senderName,
}) {
  // Don't notify if sender and recipient are the same
  if (senderId === recipientId) {
    return null;
  }

  const preview = messageText.length > 50 
    ? messageText.substring(0, 50) + "..." 
    : messageText;

  return await createNotification({
    recipient: recipientId,
    title: `New message from ${senderName}`,
    message: preview,
    type: "message_received",
    relatedEntity: {
      entityType: "message",
      entityId: conversationId,
    },
    actionUrl: `/chat/conversations/${conversationId}`,
    priority: "normal",
    metadata: {
      senderId,
      conversationId,
    },
  });
}

/**
 * Create multiple notifications for course-related events
 * @param {Array} recipients - Array of recipient user IDs
 * @param {Object} data - Notification data
 * @returns {Promise<Array>} Created notifications
 */
export async function createBulkNotifications(recipients, data) {
  const notifications = [];
  
  for (const recipientId of recipients) {
    try {
      const notification = await createNotification({
        ...data,
        recipient: recipientId,
      });
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to create notification for user ${recipientId}:`, error);
    }
  }

  return notifications;
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationAsRead(notificationId, userId) {
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  if (notification.status !== "read") {
    notification.status = "read";
    notification.readAt = new Date();
    await notification.save();

    // Clear cache
    const cacheKeys = await redisClient.keys(`notifications:${userId}:*`);
    if (cacheKeys.length > 0) {
      await redisClient.del(...cacheKeys);
    }
    await redisClient.del(`notification:count:${userId}`);
  }

  return notification;
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Update result
 */
export async function markAllNotificationsAsRead(userId) {
  const result = await Notification.updateMany(
    {
      recipient: userId,
      status: "unread",
    },
    {
      $set: {
        status: "read",
        readAt: new Date(),
      },
    }
  );

  // Clear cache
  const cacheKeys = await redisClient.keys(`notifications:${userId}:*`);
  if (cacheKeys.length > 0) {
    await redisClient.del(...cacheKeys);
  }
  await redisClient.del(`notification:count:${userId}`);

  return result;
}

/**
 * Delete notification
 * @param {string} notificationId - Notification ID
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Deletion result
 */
export async function deleteNotification(notificationId, userId) {
  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!result) {
    throw new ApiError(404, "Notification not found");
  }

  // Clear cache
  const cacheKeys = await redisClient.keys(`notifications:${userId}:*`);
  if (cacheKeys.length > 0) {
    await redisClient.del(...cacheKeys);
  }
  await redisClient.del(`notification:count:${userId}`);

  return result;
}

/**
 * Get notification counts for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Notification counts
 */
export async function getNotificationCounts(userId) {
  const cacheKey = `notification:count:${userId}`;
  
  // Try cache first
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const [totalCount, unreadCount] = await Promise.all([
    Notification.countDocuments({ recipient: userId }),
    Notification.countDocuments({ recipient: userId, status: "unread" }),
  ]);

  const counts = {
    total: totalCount,
    unread: unreadCount,
  };

  // Cache for 5 minutes
  await redisClient.setEx(cacheKey, 300, JSON.stringify(counts));

  return counts;
}

/**
 * Send real-time notification via Socket.IO (Web App Only)
 * @param {Object} io - Socket.IO instance
 * @param {string} userId - Recipient user ID
 * @param {Object} notification - Notification object
 */
export function sendRealTimeNotification(io, userId, notification) {
  if (io) {
    // Send to notification namespace
    const notificationNamespace = io.of('/notifications');
    notificationNamespace.to(`user:${userId}`).emit("notification:new", {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      relatedEntity: notification.relatedEntity,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt,
      delivery: notification.delivery
    });
  }
}

/**
 * Create notification for course enrollment (Web App Only)
 * @param {string} studentId - Student user ID
 * @param {string} courseTitle - Course title
 * @param {string} courseId - Course ID
 * @returns {Promise<Object>} Created notification
 */
export async function createCourseEnrollmentNotification(studentId, courseTitle, courseId) {
  return await createNotification({
    recipient: studentId,
    title: "Course Enrollment Confirmed",
    message: `You have successfully enrolled in ${courseTitle}. You can now access all course materials and start learning immediately.`,
    type: "course_enrollment",
    relatedEntity: {
      entityType: "course",
      entityId: courseId,
    },
    actionUrl: `/courses/${courseId}`,
    priority: "normal",
  });
}

/**
 * Create notification for job application (Web App Only)
 * @param {string} employerId - Employer user ID
 * @param {string} applicantName - Applicant name
 * @param {string} jobTitle - Job title
 * @param {string} applicationId - Application ID
 * @returns {Promise<Object>} Created notification
 */
export async function createJobApplicationNotification(employerId, applicantName, jobTitle, applicationId) {
  return await createNotification({
    recipient: employerId,
    title: "New Job Application",
    message: `${applicantName} has applied for the position: ${jobTitle}. Review their application and credentials.`,
    type: "job_application",
    relatedEntity: {
      entityType: "application",
      entityId: applicationId,
    },
    actionUrl: `/jobs/applications/${applicationId}`,
    priority: "high",
  });
}

/**
 * Create notification for payment (Web App Only)
 * @param {string} userId - User ID
 * @param {string} amount - Payment amount
 * @param {string} description - Payment description
 * @param {string} status - Payment status (received/failed)
 * @param {string} paymentId - Payment ID
 * @returns {Promise<Object>} Created notification
 */
export async function createPaymentNotification(userId, amount, description, status, paymentId) {
  const isSuccess = status === "received";
  
  return await createNotification({
    recipient: userId,
    title: isSuccess ? "Payment Received" : "Payment Failed",
    message: isSuccess 
      ? `Your payment of $${amount} for ${description} has been processed successfully.`
      : `Your payment of $${amount} for ${description} could not be processed. Please try again or contact support.`,
    type: isSuccess ? "payment_received" : "payment_failed",
    relatedEntity: {
      entityType: "payment",
      entityId: paymentId,
    },
    actionUrl: `/payments/${paymentId}`,
    priority: isSuccess ? "normal" : "high",
  });
}

/**
 * Get students who have enrolled in courses from a specific school
 * @param {string} schoolId - Training Institute ID
 * @returns {Promise<Array>} Array of unique student user IDs
 */
export async function getSchoolStudents(schoolId) {
  try {
    // Find all courses from this school
    const schoolCourses = await Course.find({ trainingProvider: schoolId }).select('_id');
    const courseIds = schoolCourses.map(course => course._id);

    if (courseIds.length === 0) {
      return [];
    }

    // Find students enrolled in any of these courses
    const enrollments = await Enrollment.find({ 
      courseId: { $in: courseIds },
      status: { $in: ['enrolled', 'completed'] } // Only active/completed enrollments
    }).select('studentId');

    // Get unique student IDs
    const uniqueStudentIds = [...new Set(enrollments.map(enrollment => enrollment.studentId.toString()))];
    
    return uniqueStudentIds;
  } catch (error) {
    console.error('Error fetching school students:', error);
    return [];
  }
}

/**
 * Create notifications for new course creation to school students
 * @param {Object} course - The created course object
 * @param {string} schoolName - Name of the school
 * @param {Object} io - Socket.io instance for real-time notifications (optional)
 * @returns {Promise<Array>} Array of created notifications
 */
export async function createCourseCreationNotifications(course, schoolName, io = null) {
  try {
    // Get all students who have enrolled in courses from this school
    const studentIds = await getSchoolStudents(course.trainingProvider);
    
    if (studentIds.length === 0) {
      console.log('No students found for this school to notify');
      return [];
    }

    // Create notification data
    const notificationData = {
      title: "New Course Available!",
      message: `${schoolName} has launched a new course: "${course.title}". Check it out and enroll if interested!`,
      type: NOTIFICATION_TYPES.COURSE_CREATED,
      relatedEntity: {
        entityType: "course",
        entityId: course._id,
      },
      actionUrl: `/courses/${course._id}`,
      priority: "normal",
      metadata: {
        courseId: course._id,
        schoolId: course.trainingProvider,
        courseTitle: course.title,
        instructor: course.instructor,
        category: course.category
      }
    };

    // Create notifications for all students
    const notifications = await createBulkNotifications(studentIds, notificationData);
    
    // Send real-time notifications if socket.io instance is provided
    if (io && notifications.length > 0) {
      const notificationNamespace = io.of('/notifications');
      
      notifications.forEach(notification => {
        const userRoom = `user:${notification.recipient}`;
        notificationNamespace.to(userRoom).emit('new_notification', {
          id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          actionUrl: notification.actionUrl,
          priority: notification.priority,
          createdAt: notification.createdAt,
          metadata: notification.metadata
        });
      });
      
      console.log(`Sent real-time notifications to ${notifications.length} students`);
    }
    
    console.log(`Created ${notifications.length} course creation notifications for course: ${course.title}`);
    return notifications;

  } catch (error) {
    console.error('Error creating course creation notifications:', error);
    throw new ApiError(500, `Failed to create course creation notifications: ${error.message}`);
  }
}
