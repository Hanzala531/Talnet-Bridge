import express from "express";
import {
    getUserNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    getNotificationCount,
    createNotification,
    bulkCreateNotifications,
    bulkDeleteNotifications,
    getNotificationPreferences,
    updateNotificationPreferences
} from '../controllers/notification.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const notificationRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "64f123abc456def789012345"
 *         title:
 *           type: string
 *           example: "Course Enrollment Confirmed"
 *         message:
 *           type: string
 *           example: "You have successfully enrolled in JavaScript Fundamentals"
 *         type:
 *           type: string
 *           enum: [course_enrollment, course_completion, certificate_issued, payment_received, payment_failed, job_application, interview_scheduled, profile_verified, message_received, system_update, security_alert, subscription_expiry]
 *           example: "course_enrollment"
 *         isRead:
 *           type: boolean
 *           example: false
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           example: "normal"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-08-19T10:30:00.000Z"
 *         readAt:
 *           type: string
 *           format: date-time
 *           example: "2025-08-19T11:00:00.000Z"
 *         relatedEntity:
 *           type: object
 *           properties:
 *             entityType:
 *               type: string
 *               enum: [course, job, application, payment, user, message]
 *               example: "course"
 *             entityId:
 *               type: string
 *               example: "64f456def789abc123456789"
 *     NotificationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         statusCode:
 *           type: integer
 *           example: 200
 *         data:
 *           type: object
 *           properties:
 *             notifications:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *             pagination:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 10
 *                 total:
 *                   type: integer
 *                   example: 25
 *                 pages:
 *                   type: integer
 *                   example: 3
 *             summary:
 *               type: object
 *               properties:
 *                 unreadCount:
 *                   type: integer
 *                   example: 5
 *                 totalCount:
 *                   type: integer
 *                   example: 25
 *         message:
 *           type: string
 *           example: "Notifications retrieved successfully"
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get user notifications with advanced filtering
 *     description: Retrieve paginated notifications for authenticated user with filtering options and Redis caching
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of notifications per page (max 50)
 *         example: 10
 *       - in: query
 *         name: unread
 *         schema:
 *           type: boolean
 *         description: Filter unread notifications only
 *         example: true
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [course_enrollment, course_completion, certificate_issued, payment_received, payment_failed, job_application, interview_scheduled, profile_verified, message_received, system_update, security_alert, subscription_expiry]
 *         description: Filter by notification type
 *         example: "course_enrollment"
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *         description: Sort order (field with optional - for descending)
 *         example: "-createdAt"
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *             examples:
 *               success:
 *                 summary: Successful response with notifications
 *                 value:
 *                   success: true
 *                   statusCode: 200
 *                   data:
 *                     notifications:
 *                       - _id: "64f123abc456def789012345"
 *                         title: "Course Enrollment Confirmed"
 *                         message: "You have successfully enrolled in JavaScript Fundamentals"
 *                         type: "course_enrollment"
 *                         isRead: false
 *                         priority: "normal"
 *                         createdAt: "2025-08-19T10:30:00.000Z"
 *                         relatedEntity:
 *                           entityType: "course"
 *                           entityId: "64f456def789abc123456789"
 *                     pagination:
 *                       page: 1
 *                       limit: 10
 *                       total: 25
 *                       pages: 3
 *                     summary:
 *                       unreadCount: 5
 *                       totalCount: 25
 *                   message: "Notifications retrieved successfully"
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Internal server error
 */
notificationRouter.get('/', requestLogger, verifyJWT, getUserNotifications);

/**
 * @swagger
 * /api/v1/notifications/count:
 *   get:
 *     summary: Get comprehensive notification statistics
 *     description: Get total, unread, and breakdown by type notification counts with Redis caching
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification count retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     unread:
 *                       type: integer
 *                       example: 5
 *                     byType:
 *                       type: object
 *                       properties:
 *                         course_enrollment:
 *                           type: integer
 *                           example: 8
 *                         payment_received:
 *                           type: integer
 *                           example: 5
 *                         job_application:
 *                           type: integer
 *                           example: 3
 *                     recent:
 *                       type: integer
 *                       description: Notifications from last 24 hours
 *                       example: 8
 *                 message:
 *                   type: string
 *                   example: "Notification count retrieved successfully"
 *             examples:
 *               success:
 *                 summary: Successful count response
 *                 value:
 *                   success: true
 *                   statusCode: 200
 *                   data:
 *                     total: 25
 *                     unread: 5
 *                     byType:
 *                       course_enrollment: 8
 *                       payment_received: 5
 *                       job_application: 3
 *                       system_update: 2
 *                     recent: 8
 *                   message: "Notification count retrieved successfully"
 *       401:
 *         description: Unauthorized
 */
notificationRouter.get('/count', requestLogger, verifyJWT, getNotificationCount);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */
notificationRouter.patch('/:id/read', requestLogger, verifyJWT, markNotificationAsRead);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
notificationRouter.patch('/read-all', requestLogger, verifyJWT, markAllNotificationsAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *       404:
 *         description: Notification not found
 *       401:
 *         description: Unauthorized
 */
notificationRouter.delete('/:id', requestLogger, verifyJWT, deleteNotification);

// Enhanced notification endpoints

/**
 * @swagger
 * /api/v1/notifications/create:
 *   post:
 *     summary: Create a new notification (Admin only)
 *     description: Create a single notification for a specific user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - title
 *               - message
 *               - type
 *             properties:
 *               userId:
 *                 type: string
 *                 description: Recipient user ID
 *                 example: "64f123abc456def789012345"
 *               title:
 *                 type: string
 *                 maxLength: 100
 *                 description: Notification title
 *                 example: "Course Enrollment Confirmed"
 *               message:
 *                 type: string
 *                 maxLength: 500
 *                 description: Notification message
 *                 example: "You have successfully enrolled in JavaScript Fundamentals course"
 *               type:
 *                 type: string
 *                 enum: [course_enrollment, course_completion, certificate_issued, payment_received, payment_failed, job_application, interview_scheduled, profile_verified, message_received, system_update, security_alert, subscription_expiry]
 *                 description: Type of notification
 *                 example: "course_enrollment"
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high, urgent]
 *                 default: "normal"
 *                 description: Notification priority
 *                 example: "normal"
 *               relatedEntity:
 *                 type: object
 *                 properties:
 *                   entityType:
 *                     type: string
 *                     enum: [course, job, application, payment, user, message]
 *                     example: "course"
 *                   entityId:
 *                     type: string
 *                     example: "64f456def789abc123456789"
 *           examples:
 *             courseEnrollment:
 *               summary: Course enrollment notification
 *               value:
 *                 userId: "64f123abc456def789012345"
 *                 title: "Course Enrollment Confirmed"
 *                 message: "You have successfully enrolled in JavaScript Fundamentals"
 *                 type: "course_enrollment"
 *                 priority: "normal"
 *                 relatedEntity:
 *                   entityType: "course"
 *                   entityId: "64f456def789abc123456789"
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
notificationRouter.post('/create', requestLogger, verifyJWT, authorizeRoles('admin'), createNotification);

/**
 * @swagger
 * /api/v1/notifications/bulk/create:
 *   post:
 *     summary: Create multiple notifications (Admin only)
 *     description: Create notifications for multiple users in bulk
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notifications
 *             properties:
 *               notifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - userId
 *                     - title
 *                     - message
 *                     - type
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: "64f123abc456def789012345"
 *                     title:
 *                       type: string
 *                       example: "System Maintenance"
 *                     message:
 *                       type: string
 *                       example: "Scheduled maintenance will occur tonight"
 *                     type:
 *                       type: string
 *                       example: "system_update"
 *                     priority:
 *                       type: string
 *                       default: "normal"
 *                       example: "high"
 *           examples:
 *             systemUpdate:
 *               summary: System update notifications
 *               value:
 *                 notifications:
 *                   - userId: "64f123abc456def789012345"
 *                     title: "System Maintenance"
 *                     message: "Scheduled maintenance will occur tonight from 2-4 AM"
 *                     type: "system_update"
 *                     priority: "high"
 *                   - userId: "64f456def789abc123456789"
 *                     title: "System Maintenance"
 *                     message: "Scheduled maintenance will occur tonight from 2-4 AM"
 *                     type: "system_update"
 *                     priority: "high"
 *     responses:
 *       201:
 *         description: Bulk notifications created successfully
 *       400:
 *         description: Bad request - Invalid notification data
 *       403:
 *         description: Forbidden - Admin access required
 */
notificationRouter.post('/bulk/create', requestLogger, verifyJWT, authorizeRoles('admin'), bulkCreateNotifications);

/**
 * @swagger
 * /api/v1/notifications/bulk/delete:
 *   delete:
 *     summary: Delete multiple notifications
 *     description: Delete multiple notifications by IDs for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of notification IDs to delete
 *                 example: ["64f123abc456def789012345", "64f456def789abc123456789"]
 *           examples:
 *             bulkDelete:
 *               summary: Delete multiple notifications
 *               value:
 *                 notificationIds:
 *                   - "64f123abc456def789012345"
 *                   - "64f456def789abc123456789"
 *                   - "64f789abc123def456789012"
 *     responses:
 *       200:
 *         description: Notifications deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       example: 3
 *                 message:
 *                   type: string
 *                   example: "Notifications deleted successfully"
 *       400:
 *         description: Bad request - Invalid notification IDs
 */
notificationRouter.delete('/bulk/delete', requestLogger, verifyJWT, bulkDeleteNotifications);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get user notification preferences
 *     description: Get notification preferences for email, push, and in-app notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     email:
 *                       type: object
 *                       properties:
 *                         course_enrollment:
 *                           type: boolean
 *                           example: true
 *                         payment_received:
 *                           type: boolean
 *                           example: true
 *                         job_application:
 *                           type: boolean
 *                           example: true
 *                         security_alert:
 *                           type: boolean
 *                           example: true
 *                         system_update:
 *                           type: boolean
 *                           example: false
 *                     push:
 *                       type: object
 *                       properties:
 *                         course_enrollment:
 *                           type: boolean
 *                           example: true
 *                         message_received:
 *                           type: boolean
 *                           example: true
 *                     inApp:
 *                       type: object
 *                       properties:
 *                         all:
 *                           type: boolean
 *                           example: true
 *   patch:
 *     summary: Update notification preferences
 *     description: Update user's notification preferences for different channels
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: object
 *                 properties:
 *                   course_enrollment:
 *                     type: boolean
 *                   payment_received:
 *                     type: boolean
 *               push:
 *                 type: object
 *                 properties:
 *                   message_received:
 *                     type: boolean
 *           examples:
 *             updatePreferences:
 *               summary: Update notification preferences
 *               value:
 *                 email:
 *                   course_enrollment: true
 *                   payment_received: false
 *                   system_update: false
 *                 push:
 *                   message_received: true
 *                   course_enrollment: false
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 */
notificationRouter.get('/preferences', requestLogger, verifyJWT, getNotificationPreferences);
notificationRouter.patch('/preferences', requestLogger, verifyJWT, updateNotificationPreferences);

export default notificationRouter;
