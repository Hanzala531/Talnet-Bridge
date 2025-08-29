# Web App Notification Integration Guide

## Overview
This guide shows how to integrate real-time notifications in your web application frontend.

## Socket.io Client Setup

### 1. Install Socket.io Client
```bash
npm install socket.io-client
```

### 2. Initialize Notification Connection

```javascript
import { io } from 'socket.io-client';

class NotificationManager {
  constructor(authToken) {
    this.authToken = authToken;
    this.socket = null;
    this.notificationCount = 0;
    this.callbacks = {};
  }

  // Connect to notification namespace
  connect() {
    this.socket = io('/notifications', {
      auth: {
        token: this.authToken
      },
      autoConnect: true
    });

    this.setupEventListeners();
  }

  // Setup event listeners
  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to notification service');
      this.requestNotificationCount();
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from notification service');
    });

    // Notification events
    this.socket.on('notification:new', (notification) => {
      this.handleNewNotification(notification);
    });

    this.socket.on('notification:count-update', (counts) => {
      this.updateNotificationCount(counts);
    });

    this.socket.on('notification:system', (notification) => {
      this.handleSystemNotification(notification);
    });

    this.socket.on('notification:read', (data) => {
      this.handleNotificationRead(data.notificationId);
    });

    this.socket.on('notification:error', (error) => {
      console.error('Notification error:', error.message);
    });
  }

  // Handle new notification
  handleNewNotification(notification) {
    // Show notification in UI
    this.showNotificationToast(notification);
    
    // Update notification count
    this.notificationCount++;
    this.updateNotificationBadge();
    
    // Call registered callbacks
    if (this.callbacks.onNewNotification) {
      this.callbacks.onNewNotification(notification);
    }
  }

  // Handle system notification
  handleSystemNotification(notification) {
    // Show system-wide notification (e.g., maintenance alert)
    this.showSystemAlert(notification);
    
    if (this.callbacks.onSystemNotification) {
      this.callbacks.onSystemNotification(notification);
    }
  }

  // Show notification toast
  showNotificationToast(notification) {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `notification-toast priority-${notification.priority}`;
    toast.innerHTML = `
      <div class="notification-header">
        <h4>${notification.title}</h4>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="notification-body">
        <p>${notification.message}</p>
        ${notification.actionUrl ? `<a href="${notification.actionUrl}" class="notification-action">View</a>` : ''}
      </div>
    `;

    // Add to notification container
    const container = document.getElementById('notification-container') || this.createNotificationContainer();
    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);

    // Acknowledge notification
    this.acknowledgeNotification(notification._id);
  }

  // Show system alert
  showSystemAlert(notification) {
    // Create system alert (modal or banner)
    const alert = document.createElement('div');
    alert.className = 'system-alert';
    alert.innerHTML = `
      <div class="alert-content">
        <h3>${notification.title}</h3>
        <p>${notification.message}</p>
        <button onclick="this.parentElement.parentElement.remove()">OK</button>
      </div>
    `;
    
    document.body.appendChild(alert);
  }

  // Create notification container if it doesn't exist
  createNotificationContainer() {
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.className = 'notification-container';
    document.body.appendChild(container);
    return container;
  }

  // Update notification badge
  updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    if (badge) {
      badge.textContent = this.notificationCount;
      badge.style.display = this.notificationCount > 0 ? 'block' : 'none';
    }
  }

  // Request notification count
  requestNotificationCount() {
    this.socket.emit('notification:get-count');
  }

  // Update notification count
  updateNotificationCount(counts) {
    this.notificationCount = counts.unread;
    this.updateNotificationBadge();
    
    if (this.callbacks.onCountUpdate) {
      this.callbacks.onCountUpdate(counts);
    }
  }

  // Mark notification as read
  markAsRead(notificationId) {
    this.socket.emit('notification:mark-read', notificationId);
  }

  // Handle notification read
  handleNotificationRead(notificationId) {
    // Remove from unread count
    this.notificationCount = Math.max(0, this.notificationCount - 1);
    this.updateNotificationBadge();
    
    if (this.callbacks.onNotificationRead) {
      this.callbacks.onNotificationRead(notificationId);
    }
  }

  // Acknowledge notification receipt
  acknowledgeNotification(notificationId) {
    this.socket.emit('notification:ack', notificationId);
  }

  // Register callback functions
  on(event, callback) {
    this.callbacks[event] = callback;
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Usage Example
export default NotificationManager;

// Initialize with auth token
const notificationManager = new NotificationManager(userAuthToken);

// Register callbacks
notificationManager.on('onNewNotification', (notification) => {
  console.log('New notification received:', notification);
  // Update notification list in UI
});

notificationManager.on('onCountUpdate', (counts) => {
  console.log('Notification counts updated:', counts);
  // Update UI elements
});

// Connect to notification service
notificationManager.connect();
```

### 3. CSS Styles for Notifications

```css
/* Notification Container */
.notification-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  width: 350px;
}

/* Notification Toast */
.notification-toast {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  margin-bottom: 10px;
  border-left: 4px solid #3b82f6;
  animation: slideIn 0.3s ease-out;
}

.notification-toast.priority-high {
  border-left-color: #ef4444;
}

.notification-toast.priority-low {
  border-left-color: #10b981;
}

/* Notification Header */
.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px;
  border-bottom: 1px solid #e5e7eb;
}

.notification-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 20px;
  height: 20px;
}

/* Notification Body */
.notification-body {
  padding: 8px 16px 12px;
}

.notification-body p {
  margin: 0 0 8px;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.4;
}

.notification-action {
  display: inline-block;
  padding: 4px 12px;
  background: #3b82f6;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

/* System Alert */
.system-alert {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.alert-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  max-width: 400px;
  text-align: center;
}

/* Notification Badge */
.notification-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ef4444;
  color: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

/* Animations */
@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

### 4. HTML Structure

```html
<!-- Notification Bell Icon with Badge -->
<div class="notification-icon-container">
  <button id="notification-bell" class="notification-bell">
    🔔
    <span class="notification-badge" style="display: none;">0</span>
  </button>
</div>

<!-- Notification container will be added dynamically -->
```

This implementation provides:
- Real-time notification delivery via WebSocket
- Toast notifications for new messages
- System alerts for important announcements
- Notification count management
- Responsive UI components
- Web app only focus (no email/SMS complexity)
