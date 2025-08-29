import jwt from "jsonwebtoken";
import { User } from "../models/contents/User.models.js";

/**
 * Notification Socket Handler - Web App Only
 * Handles real-time notification delivery via Socket.io
 */

/**
 * Initialize notification socket handlers
 * @param {Object} io - Socket.io server instance
 */
export function initNotificationSocket(io) {
  // Notification namespace for organized event handling
  const notificationNamespace = io.of('/notifications');

  notificationNamespace.use(async (socket, next) => {
    try {
      // Extract token from handshake auth
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // Get user details
      const user = await User.findById(decoded._id).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  notificationNamespace.on('connection', (socket) => {
    console.log(`User ${socket.user.fullName} connected to notifications`);
    
    // Join user to their personal notification room
    const userRoom = `user:${socket.user._id}`;
    socket.join(userRoom);

    // Handle notification acknowledgment
    socket.on('notification:ack', (notificationId) => {
      console.log(`Notification ${notificationId} acknowledged by user ${socket.user._id}`);
      // Here you could update delivery status if needed
    });

    // Handle marking notification as read
    socket.on('notification:mark-read', (notificationId) => {
      console.log(`Notification ${notificationId} marked as read by user ${socket.user._id}`);
      // Broadcast to other user sessions that notification was read
      socket.to(userRoom).emit('notification:read', { notificationId });
    });

    // Handle user requesting notification count
    socket.on('notification:get-count', async () => {
      try {
        // Import here to avoid circular dependency
        const { getNotificationCounts } = await import('../services/notification.service.js');
        const counts = await getNotificationCounts(socket.user._id);
        socket.emit('notification:count-update', counts);
      } catch (error) {
        console.error('Error getting notification count:', error);
        socket.emit('notification:error', { message: 'Failed to get notification count' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`User ${socket.user.fullName} disconnected from notifications`);
    });
  });

  return notificationNamespace;
}

/**
 * Send real-time notification to user (Web App Only)
 * @param {Object} io - Socket.io server instance
 * @param {string} userId - Recipient user ID
 * @param {Object} notification - Notification object
 */
export function sendWebAppNotification(io, userId, notification) {
  if (!io) {
    console.warn('Socket.io instance not available for notification delivery');
    return;
  }

  const notificationNamespace = io.of('/notifications');
  const userRoom = `user:${userId}`;
  
  // Send notification to user's room
  notificationNamespace.to(userRoom).emit('notification:new', {
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

  console.log(`Web app notification sent to user ${userId}: ${notification.title}`);
}

/**
 * Broadcast system notification to all connected users
 * @param {Object} io - Socket.io server instance
 * @param {Object} notification - System notification object
 */
export function broadcastSystemNotification(io, notification) {
  if (!io) {
    console.warn('Socket.io instance not available for system notification broadcast');
    return;
  }

  const notificationNamespace = io.of('/notifications');
  
  // Broadcast to all connected users
  notificationNamespace.emit('notification:system', {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    priority: notification.priority,
    createdAt: notification.createdAt
  });

  console.log(`System notification broadcasted: ${notification.title}`);
}
