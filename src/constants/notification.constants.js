/**
 * Notification System Constants and Types
 * Web App Only Configuration
 */

// Notification Types
export const NOTIFICATION_TYPES = {
  // Course Related
  COURSE_ENROLLMENT: 'course_enrollment',
  COURSE_COMPLETION: 'course_completion',
  COURSE_APPROVED: 'course_approved',
  COURSE_REJECTED: 'course_rejected',
  COURSE_CREATED: 'course_created',
  CERTIFICATE_ISSUED: 'certificate_issued',
  
  // Job Related
  JOB_APPLICATION: 'job_application',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  
  // Payment Related
  PAYMENT_RECEIVED: 'payment_received',
  PAYMENT_FAILED: 'payment_failed',
  
  // User Related
  PROFILE_VERIFIED: 'profile_verified',
  MESSAGE_RECEIVED: 'message_received',
  
  // System Related
  SYSTEM_UPDATE: 'system_update',
  SECURITY_ALERT: 'security_alert',
  SUBSCRIPTION_EXPIRY: 'subscription_expiry'
};

// Notification Priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high'
};

// Notification Status
export const NOTIFICATION_STATUS = {
  UNREAD: 'unread',
  READ: 'read',
  DISMISSED: 'dismissed'
};

// Related Entity Types
export const ENTITY_TYPES = {
  COURSE: 'course',
  JOB: 'job',
  APPLICATION: 'application',
  PAYMENT: 'payment',
  USER: 'user',
  MESSAGE: 'message'
};

// Socket Events
export const SOCKET_EVENTS = {
  // Client to Server
  JOIN_NOTIFICATION: 'notification:join',
  GET_COUNT: 'notification:get-count',
  MARK_READ: 'notification:mark-read',
  ACKNOWLEDGE: 'notification:ack',
  
  // Server to Client
  NEW_NOTIFICATION: 'notification:new',
  COUNT_UPDATE: 'notification:count-update',
  NOTIFICATION_READ: 'notification:read',
  SYSTEM_NOTIFICATION: 'notification:system',
  ERROR: 'notification:error'
};

// Cache Keys
export const CACHE_KEYS = {
  USER_NOTIFICATIONS: (userId, page, limit, unread, type, sort) => 
    `notifications:${userId}:${page}:${limit}:${unread || 'all'}:${type || 'all'}:${sort}`,
  NOTIFICATION_COUNT: (userId) => `notification:count:${userId}`,
  USER_PREFERENCES: (userId) => `notification:preferences:${userId}`
};

// Cache TTL (Time To Live) in seconds
export const CACHE_TTL = {
  NOTIFICATIONS: 120, // 2 minutes
  COUNT: 300, // 5 minutes
  PREFERENCES: 3600 // 1 hour
};

// Default notification configuration
export const DEFAULT_NOTIFICATION_CONFIG = {
  priority: NOTIFICATION_PRIORITIES.NORMAL,
  status: NOTIFICATION_STATUS.UNREAD,
  delivery: {
    inApp: {
      delivered: true,
      deliveredAt: () => new Date()
    }
  }
};

// Notification type configurations
export const NOTIFICATION_CONFIGS = {
  [NOTIFICATION_TYPES.COURSE_ENROLLMENT]: {
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    title: 'Course Enrollment Confirmed',
    icon: '📚',
    color: '#3b82f6'
  },
  [NOTIFICATION_TYPES.COURSE_COMPLETION]: {
    priority: NOTIFICATION_PRIORITIES.HIGH,
    title: 'Course Completed',
    icon: '🎉',
    color: '#10b981'
  },
  [NOTIFICATION_TYPES.CERTIFICATE_ISSUED]: {
    priority: NOTIFICATION_PRIORITIES.HIGH,
    title: 'Certificate Issued',
    icon: '🏆',
    color: '#f59e0b'
  },
  [NOTIFICATION_TYPES.JOB_APPLICATION]: {
    priority: NOTIFICATION_PRIORITIES.HIGH,
    title: 'New Job Application',
    icon: '💼',
    color: '#8b5cf6'
  },
  [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: {
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    title: 'Payment Received',
    icon: '💳',
    color: '#10b981'
  },
  [NOTIFICATION_TYPES.PAYMENT_FAILED]: {
    priority: NOTIFICATION_PRIORITIES.HIGH,
    title: 'Payment Failed',
    icon: '❌',
    color: '#ef4444'
  },
  [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: {
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    title: 'New Message',
    icon: '💬',
    color: '#06b6d4'
  },
  [NOTIFICATION_TYPES.SYSTEM_UPDATE]: {
    priority: NOTIFICATION_PRIORITIES.NORMAL,
    title: 'System Update',
    icon: '🔧',
    color: '#6b7280'
  },
  [NOTIFICATION_TYPES.SECURITY_ALERT]: {
    priority: NOTIFICATION_PRIORITIES.HIGH,
    title: 'Security Alert',
    icon: '🔒',
    color: '#ef4444'
  }
};

// Default user preferences (Web App Only)
export const DEFAULT_USER_PREFERENCES = {
  inApp: {
    [NOTIFICATION_TYPES.COURSE_ENROLLMENT]: true,
    [NOTIFICATION_TYPES.COURSE_COMPLETION]: true,
    [NOTIFICATION_TYPES.COURSE_APPROVED]: true,
    [NOTIFICATION_TYPES.COURSE_REJECTED]: true,
    [NOTIFICATION_TYPES.CERTIFICATE_ISSUED]: true,
    [NOTIFICATION_TYPES.JOB_APPLICATION]: true,
    [NOTIFICATION_TYPES.INTERVIEW_SCHEDULED]: true,
    [NOTIFICATION_TYPES.PROFILE_VERIFIED]: true,
    [NOTIFICATION_TYPES.PAYMENT_RECEIVED]: true,
    [NOTIFICATION_TYPES.PAYMENT_FAILED]: true,
    [NOTIFICATION_TYPES.MESSAGE_RECEIVED]: true,
    [NOTIFICATION_TYPES.SYSTEM_UPDATE]: true,
    [NOTIFICATION_TYPES.SECURITY_ALERT]: true,
    [NOTIFICATION_TYPES.SUBSCRIPTION_EXPIRY]: true
  }
};

// Validation schemas
export const NOTIFICATION_VALIDATION = {
  title: {
    required: true,
    minLength: 3,
    maxLength: 100
  },
  message: {
    required: true,
    minLength: 10,
    maxLength: 500
  },
  type: {
    required: true,
    enum: Object.values(NOTIFICATION_TYPES)
  },
  priority: {
    required: false,
    enum: Object.values(NOTIFICATION_PRIORITIES),
    default: NOTIFICATION_PRIORITIES.NORMAL
  }
};

// Helper functions
export const NotificationHelpers = {
  /**
   * Get notification configuration by type
   * @param {string} type - Notification type
   * @returns {Object} Configuration object
   */
  getConfig(type) {
    return NOTIFICATION_CONFIGS[type] || {
      priority: NOTIFICATION_PRIORITIES.NORMAL,
      title: 'Notification',
      icon: '🔔',
      color: '#6b7280'
    };
  },

  /**
   * Validate notification data
   * @param {Object} data - Notification data
   * @returns {Object} Validation result
   */
  validate(data) {
    const errors = [];

    // Validate title
    if (!data.title || data.title.length < 3 || data.title.length > 100) {
      errors.push('Title must be between 3 and 100 characters');
    }

    // Validate message
    if (!data.message || data.message.length < 10 || data.message.length > 500) {
      errors.push('Message must be between 10 and 500 characters');
    }

    // Validate type
    if (!data.type || !Object.values(NOTIFICATION_TYPES).includes(data.type)) {
      errors.push('Invalid notification type');
    }

    // Validate priority
    if (data.priority && !Object.values(NOTIFICATION_PRIORITIES).includes(data.priority)) {
      errors.push('Invalid priority level');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Generate cache key for user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {string} Cache key
   */
  getCacheKey(userId, options = {}) {
    const { page = 1, limit = 10, unread, type, sort = '-createdAt' } = options;
    return CACHE_KEYS.USER_NOTIFICATIONS(userId, page, limit, unread, type, sort);
  },

  /**
   * Get notification priority color
   * @param {string} priority - Priority level
   * @returns {string} Color code
   */
  getPriorityColor(priority) {
    const colors = {
      [NOTIFICATION_PRIORITIES.LOW]: '#10b981',
      [NOTIFICATION_PRIORITIES.NORMAL]: '#3b82f6',
      [NOTIFICATION_PRIORITIES.HIGH]: '#ef4444'
    };
    return colors[priority] || colors[NOTIFICATION_PRIORITIES.NORMAL];
  }
};

export default {
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  NOTIFICATION_STATUS,
  ENTITY_TYPES,
  SOCKET_EVENTS,
  CACHE_KEYS,
  CACHE_TTL,
  DEFAULT_NOTIFICATION_CONFIG,
  NOTIFICATION_CONFIGS,
  DEFAULT_USER_PREFERENCES,
  NOTIFICATION_VALIDATION,
  NotificationHelpers
};
