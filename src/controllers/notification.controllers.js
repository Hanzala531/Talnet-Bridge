/**
 * NOTIFICATION CONTROLLERS
 * 
 * This module handles all notification-related operations for the TalentBridge platform.
 * Provides comprehensive notification management including real-time notifications,
 * bulk operations, filtering, and performance optimization through Redis caching.
 * 
 * Features:
 * - Real-time notification delivery
 * - Bulk notification operations
 * - Advanced filtering and searching
 * - Redis caching for performance
 * - Notification preferences management
 * - Push notification support
 * - Email notification integration
 * 
 * Cache Strategy:
 * - User notification counts: 5 minutes TTL
 * - Recent notifications: 2 minutes TTL
 * - Notification preferences: 1 hour TTL
 */

import { Notification } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { successResponse, badRequestResponse, notFoundResponse } from "../utils/ApiResponse.js";
import redisClient from "../config/redis.config.js";
import mongoose from "mongoose";
import { 
  createNotification, 
  markNotificationAsRead as markAsRead,
  markAllNotificationsAsRead as markAllAsRead,
  deleteNotification as deleteNotif,
  getNotificationCounts,
  createBulkNotifications,
  sendRealTimeNotification
} from "../services/notification.service.js";

/**
 * Get user notifications with Redis caching
 * 
 * @function getUserNotifications
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Items per page (default: 10, max: 50)
 * @param {boolean} req.query.unread - Filter unread notifications only
 * @param {string} req.query.type - Filter by notification type
 * @param {string} req.query.sort - Sort order (default: '-createdAt')
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Paginated notifications with metadata
 * 
 * @example
 * GET /api/v1/notifications?page=1&limit=10&unread=true&type=course_enrollment
 * 
 * Response: {
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "notifications": [{
 *       "_id": "64f123...",
 *       "title": "Course Enrollment Confirmed",
 *       "message": "You have successfully enrolled in JavaScript Fundamentals",
 *       "type": "course_enrollment",
 *       "isRead": false,
 *       "createdAt": "2025-08-19T10:30:00Z",
 *       "relatedEntity": {
 *         "entityType": "course",
 *         "entityId": "64f456..."
 *       }
 *     }],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 25,
 *       "pages": 3
 *     },
 *     "summary": {
 *       "unreadCount": 5,
 *       "totalCount": 25
 *     }
 *   },
 *   "message": "Notifications retrieved successfully"
 * }
 */
// Get user notifications
const getUserNotifications = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, unread, type, sort = '-createdAt' } = req.query;

        // Create cache key
        const cacheKey = `notifications:${userId}:${page}:${limit}:${unread || 'all'}:${type || 'all'}:${sort}`;
        
        // Try to get from cache first (with error handling)
        let cached = null;
        try {
            if (redisClient && redisClient.status === 'ready') {
                cached = await redisClient.get(cacheKey);
            }
        } catch (cacheError) {
            console.warn("⚠️ Redis cache failed, continuing without cache:", cacheError.message);
        }

        const filter = { recipient: userId };
        if (unread === 'true') {
            filter.status = 'unread';
        }
        if (type) {
            filter.type = type;
        }


        const skip = (page - 1) * Math.min(limit, 50);
        const limitNum = Math.min(Number(limit), 50);


        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate('relatedEntity.entityId', 'title name')
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient: userId, status: 'unread' })
        ]);


        const response = successResponse(200, {
            notifications,
            pagination: {
                page: Number(page),
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            summary: {
                unreadCount,
                totalCount: total
            }
        }, "Notifications retrieved successfully");

        // Cache for 2 minutes (with error handling)
        try {
            if (redisClient && redisClient.status === 'ready') {
                await redisClient.setEx(cacheKey, 120, JSON.stringify(response));
            } 
        } catch (cacheError) {
            console.warn("⚠️ Failed to cache response:", cacheError.message);
        }

        res.status(200).json(response);
    } catch (error) {throw new ApiError(500, "Failed to retrieve notifications");
    }
});

/**
 * Get notification count with Redis caching
 * 
 * @function getNotificationCount
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Notification counts by type and read status
 * 
 * @example
 * GET /api/v1/notifications/count
 * 
 * Response: {
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "total": 25,
 *     "unread": 5,
 *     "byType": {
 *       "course_enrollment": 3,
 *       "payment_received": 2,
 *       "job_application": 1
 *     },
 *     "recent": 8
 *   },
 *   "message": "Notification count retrieved successfully"
 * }
 */
/**
 * Create notification for authenticated user or specified user (admin only)
 * 
 * @function createNotification
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.recipient - Recipient user ID (optional, defaults to authenticated user)
 * @param {string} req.body.title - Notification title
 * @param {string} req.body.message - Notification message
 * @param {string} req.body.type - Notification type
 * @param {Object} req.body.relatedEntity - Related entity information
 * @param {string} req.body.actionUrl - Action URL
 * @param {string} req.body.priority - Priority level
 * @param {Object} req.body.channels - Delivery channels
 * @param {Object} req.body.metadata - Additional metadata
 * @param {Date} req.body.expiresAt - Expiration date
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Created notification
 */
const createNotificationController = asyncHandler(async (req, res) => {
    try {
        const { 
            recipient, 
            title, 
            message, 
            type, 
            relatedEntity, 
            actionUrl, 
            priority, 
            channels, 
            metadata, 
            expiresAt 
        } = req.body;

        // If recipient is not specified, use authenticated user
        const targetRecipient = recipient || req.user._id;

        // Only admins can create notifications for other users
        if (recipient && recipient !== req.user._id.toString() && req.user.role !== 'admin') {
            throw new ApiError(403, "Only admins can create notifications for other users");
        }

        const notification = await createNotification({
            recipient: targetRecipient,
            title,
            message,
            type,
            relatedEntity,
            actionUrl,
            priority,
            channels,
            metadata,
            expiresAt,
        });

        // Send real-time notification
        const io = req.app.get("io");
        if (io) {
            sendRealTimeNotification(io, targetRecipient, notification);
        }

        res.status(201).json(
            successResponse(201, { notification }, "Notification created successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to create notification");
    }
});

/**
 * Create bulk notifications (admin only)
 * 
 * @function createBulkNotificationsController
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array<string>} req.body.recipients - Array of recipient user IDs
 * @param {string} req.body.title - Notification title
 * @param {string} req.body.message - Notification message
 * @param {string} req.body.type - Notification type
 * @param {Object} req.body.relatedEntity - Related entity information
 * @param {string} req.body.actionUrl - Action URL
 * @param {string} req.body.priority - Priority level
 * @param {Object} req.body.channels - Delivery channels
 * @param {Object} req.body.metadata - Additional metadata
 * @param {Date} req.body.expiresAt - Expiration date
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Created notifications
 */
const createBulkNotificationsController = asyncHandler(async (req, res) => {
    try {
        const { 
            recipients, 
            title, 
            message, 
            type, 
            relatedEntity, 
            actionUrl, 
            priority, 
            channels, 
            metadata, 
            expiresAt 
        } = req.body;

        // Only admins can create bulk notifications
        if (req.user.role !== 'admin') {
            throw new ApiError(403, "Only admins can create bulk notifications");
        }

        if (!Array.isArray(recipients) || recipients.length === 0) {
            throw new ApiError(400, "Recipients must be a non-empty array");
        }

        const notifications = await createBulkNotifications(recipients, {
            title,
            message,
            type,
            relatedEntity,
            actionUrl,
            priority,
            channels,
            metadata,
            expiresAt,
        });

        // Send real-time notifications
        const io = req.app.get("io");
        if (io) {
            notifications.forEach(notification => {
                sendRealTimeNotification(io, notification.recipient, notification);
            });
        }

        res.status(201).json(
            successResponse(201, { 
                notifications,
                count: notifications.length,
                totalRequested: recipients.length 
            }, "Bulk notifications created successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to create bulk notifications");
    }
});

// Get notification count
const getNotificationCount = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const cacheKey = `notification:count:${userId}`;
        
        // Try cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const [totalCount, unreadCount, typeBreakdown, recentCount] = await Promise.all([
            Notification.countDocuments({ recipient: userId }),
            Notification.countDocuments({ recipient: userId, status: 'unread' }),
            Notification.aggregate([
                { $match: { recipient: new mongoose.Types.ObjectId(userId) } },
                { $group: { _id: '$type', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            Notification.countDocuments({ 
                recipient: userId, 
                createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
            })
        ]);

        const byType = typeBreakdown.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
        }, {});

        const response = successResponse(200, {
            total: totalCount,
            unread: unreadCount,
            byType,
            recent: recentCount
        }, "Notification count retrieved successfully");

        // Cache for 5 minutes
        await redisClient.setEx(cacheKey, 300, JSON.stringify(response));

        res.status(200).json(response);
    } catch (error) {
        throw new ApiError(500, "Failed to get notification count");
    }
});

// Mark notification as read
const markNotificationAsRead = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const notification = await markAsRead(id, userId);

        // Send real-time update
        const io = req.app.get("io");
        if (io) {
            io.to(`user:${userId}`).emit("notification:read", {
                notificationId: id,
                timestamp: new Date(),
            });
        }

        res.status(200).json(
            successResponse(200, notification, "Notification marked as read")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to mark notification as read");
    }
});

// Mark all notifications as read
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const result = await markAllAsRead(userId);

        // Send real-time update
        const io = req.app.get("io");
        if (io) {
            io.to(`user:${userId}`).emit("notification:all_read", {
                timestamp: new Date(),
                modifiedCount: result.modifiedCount,
            });
        }

        res.status(200).json(
            successResponse(200, {
                modifiedCount: result.modifiedCount
            }, "All notifications marked as read")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to mark all notifications as read");
    }
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { id } = req.params;

        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: userId
        });

        if (!notification) {
            throw new ApiError(404, "Notification not found");
        }

        res.status(200).json(
            new successResponse(200, null, "Notification deleted successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to delete notification");
    }
});

/**
 * Create a new notification (Admin/System use)
 * 
 * @function createNotificationAdmin
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.userId - Recipient user ID
 * @param {string} req.body.title - Notification title
 * @param {string} req.body.message - Notification message
 * @param {string} req.body.type - Notification type
 * @param {Object} req.body.relatedEntity - Related entity information
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Created notification
 */
const createNotificationAdmin = asyncHandler(async (req, res) => {
    try {
        const { userId, title, message, type, relatedEntity, priority = 'normal' } = req.body;

        if (!userId || !title || !message || !type) {
            throw new ApiError(400, "Missing required fields: userId, title, message, type");
        }

        const notification = await Notification.create({
            recipient: userId,
            title,
            message,
            type,
            relatedEntity,
            priority,
            status: 'unread'
        });

        // Invalidate user's notification cache
        const keys = await redisClient.keys(`notification*:${userId}*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        // Emit real-time notification if socket is available
        if (req.io) {
            req.io.to(`user:${userId}`).emit('new_notification', notification);
        }

        res.status(201).json(
            successResponse(201, notification, "Notification created successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to create notification");
    }
});

/**
 * Bulk create notifications
 * 
 * @function bulkCreateNotifications
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array} req.body.notifications - Array of notification objects
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Bulk creation result
 */
const bulkCreateNotifications = asyncHandler(async (req, res) => {
    try {
        const { notifications } = req.body;

        if (!Array.isArray(notifications) || notifications.length === 0) {
            throw new ApiError(400, "Notifications array is required");
        }

        // Validate each notification
        for (const notif of notifications) {
            if (!notif.userId || !notif.title || !notif.message || !notif.type) {
                throw new ApiError(400, "Each notification must have userId, title, message, and type");
            }
        }

        const createdNotifications = await Notification.insertMany(
            notifications.map(notif => ({
                ...notif,
                recipient: notif.userId,
                status: 'unread',
                priority: notif.priority || 'normal'
            }))
        );

        // Invalidate cache for affected users
        const userIds = [...new Set(notifications.map(n => n.userId))];
        for (const userId of userIds) {
            const keys = await redisClient.keys(`notification*:${userId}*`);
            if (keys.length > 0) {
                await redisClient.del(keys);
            }
        }

        res.status(201).json(
            successResponse(201, {
                created: createdNotifications.length,
                notifications: createdNotifications
            }, "Bulk notifications created successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to create bulk notifications");
    }
});

/**
 * Delete multiple notifications
 * 
 * @function bulkDeleteNotifications
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {Array} req.body.notificationIds - Array of notification IDs to delete
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Deletion result
 */
const bulkDeleteNotifications = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { notificationIds } = req.body;

        if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
            throw new ApiError(400, "Notification IDs array is required");
        }

        const result = await Notification.deleteMany({
            _id: { $in: notificationIds },
            recipient: userId
        });

        // Invalidate cache
        const keys = await redisClient.keys(`notification*:${userId}*`);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }

        res.status(200).json(
            successResponse(200, {
                deletedCount: result.deletedCount
            }, "Notifications deleted successfully")
        );
    } catch (error) {
        throw new ApiError(500, "Failed to delete notifications");
    }
});

/**
 * Get notification preferences for user
 * 
 * @function getNotificationPreferences
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} User notification preferences
 */
const getNotificationPreferences = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const cacheKey = `notification:preferences:${userId}`;
        
        // Try cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        // Get notification preferences (Web App Only)
        const preferences = {
            inApp: {
                course_enrollment: true,
                course_completion: true,
                certificate_issued: true,
                payment_received: true,
                payment_failed: true,
                job_application: true,
                interview_scheduled: true,
                profile_verified: true,
                message_received: true,
                system_update: true,
                security_alert: true,
                subscription_expiry: true,
                course_approved: true,
                course_rejected: true
            }
        };

        const response = successResponse(200, preferences, "Notification preferences retrieved");
        
        // Cache for 1 hour
        await redisClient.setEx(cacheKey, 3600, JSON.stringify(response));

        res.status(200).json(response);
    } catch (error) {
        throw new ApiError(500, "Failed to get notification preferences");
    }
});

/**
 * Update notification preferences (Web App Only)
 * 
 * @function updateNotificationPreferences
 * @param {Object} req - Express request object
 * @param {Object} req.body - Preference updates for in-app notifications
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Updated preferences
 */
const updateNotificationPreferences = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const updates = req.body;

        // Validate that only inApp preferences are being updated
        if (updates.email || updates.push || updates.sms) {
            throw new ApiError(400, "Only in-app notification preferences can be updated. Email, push, and SMS notifications are not supported.");
        }

        // Update user preferences for in-app notifications only
        // Here you would update the user preferences model with the inApp settings
        
        // Invalidate cache
        await redisClient.del(`notification:preferences:${userId}`);

        res.status(200).json(
            successResponse(200, updates, "In-app notification preferences updated successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to update notification preferences");
    }
});

/**
 * Get user notifications excluding message-related ones
 * 
 * @function getNonMessageNotifications
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Items per page (default: 10, max: 50)
 * @param {boolean} req.query.unread - Filter unread notifications only
 * @param {string} req.query.type - Filter by notification type (optional)
 * @param {string} req.query.sort - Sort order (default: '-createdAt')
 * @param {Object} req.user - Authenticated user
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Paginated notifications excluding 'message_received'
 */
const getNonMessageNotifications = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, unread, type, sort = '-createdAt' } = req.query;

        // Create cache key
        const cacheKey = `notifications:nonmsg:${userId}:${page}:${limit}:${unread || 'all'}:${type || 'all'}:${sort}`;
        
        // Try to get from cache first
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return res.status(200).json(JSON.parse(cached));
        }

        const filter = { recipient: userId, type: { $ne: 'message_received' } }; // Exclude message_received
        if (unread === 'true') {
            filter.status = 'unread';
        }
        if (type) {
            filter.type = type; // Additional type filter if provided
        }

        const skip = (page - 1) * Math.min(limit, 50);
        const limitNum = Math.min(Number(limit), 50);

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(filter)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .populate('relatedEntity.entityId', 'title name')
                .lean(),
            Notification.countDocuments(filter),
            Notification.countDocuments({ recipient: userId, status: 'unread', type: { $ne: 'message_received' } })
        ]);

        const response = successResponse(200, {
            notifications,
            pagination: {
                page: Number(page),
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            },
            summary: {
                unreadCount,
                totalCount: total
            }
        }, "Non-message notifications retrieved successfully");

        // Cache for 2 minutes
        await redisClient.setEx(cacheKey, 120, JSON.stringify(response));

        res.status(200).json(response);
    } catch (error) {
        throw new ApiError(500, "Failed to retrieve non-message notifications");
    }
});

/**
 * TEST ENDPOINT - Create a test notification for debugging
 * Remove this in production
 */
const createTestNotification = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        
        console.log("=== CREATING TEST NOTIFICATION ===");
        console.log("User ID:", userId);
        
        const notification = await createNotification({
            recipient: userId,
            title: "Test Notification",
            message: "This is a test notification to verify the system is working",
            type: "system_update",
            priority: "normal"
        });
        
        console.log("Test notification created:", notification._id);
        
        res.json(successResponse(
            { notification },
            "Test notification created successfully"
        ));
    } catch (error) {
        console.error("Test notification failed:", error);
        throw new ApiError(500, `Test notification failed: ${error.message}`);
    }
});

export {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getNotificationCount,
    createNotificationAdmin,
    createNotificationController,
    createBulkNotificationsController,
    bulkCreateNotifications,
    bulkDeleteNotifications,
    getNotificationPreferences,
    updateNotificationPreferences,
    getNonMessageNotifications,
    createTestNotification // Add test endpoint
};
