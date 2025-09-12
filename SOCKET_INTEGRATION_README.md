# Socket.IO Integration Guide

## Overview

This guide provides comprehensive integration instructions for the TalentBridge chat and notification systems using Socket.IO. The system supports real-time messaging, typing indicators, read receipts, and push notifications.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Authentication](#authentication)
- [Chat System Integration](#chat-system-integration)
- [Notification System Integration](#notification-system-integration)
- [API Reference](#api-reference)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)

## Prerequisites

### Backend Requirements
- Node.js 16+
- MongoDB
- Socket.IO server running on port 4000 (local) or configured PORT (production)
- JWT authentication configured

### Frontend Requirements
- Socket.IO client library
- JWT token for authentication
- Modern browser with WebSocket support

### Environment Variables
```env
# Backend
ACCESS_TOKEN_SECRET=your_jwt_secret
MONGODB_URI=your_mongodb_uri
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
PORT=4000

# Frontend
REACT_APP_API_URL=http://localhost:4000
REACT_APP_SOCKET_URL=http://localhost:4000
```

## Installation

### Frontend Dependencies
```bash
npm install socket.io-client
```

### Backend Dependencies
```bash
npm install socket.io
```

## Authentication

### Socket Authentication
Socket connections require JWT authentication. Include the token in the connection handshake:

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:4000', {
  auth: {
    token: localStorage.getItem('accessToken') // or from cookie
  },
  transports: ['websocket', 'polling'],
  timeout: 20000,
  forceNew: true,
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', (reason) => {
  console.log('Disconnected:', reason);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Authentication Flow
1. User logs in via REST API and receives JWT token
2. Store token in localStorage/cookies
3. Initialize Socket.IO connection with token
4. Server validates token and associates user with socket
5. User is automatically joined to their personal notification room

## Chat System Integration

### 1. Conversation Management

#### Starting a Conversation
```javascript
// REST API
const startConversation = async (targetUserId) => {
  const response = await fetch('/api/v1/chat/conversations/start', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ targetUserId })
  });

  const data = await response.json();
  if (data.success) {
    return data.data.conversation;
  }
  throw new Error(data.message);
};

// Usage
const conversation = await startConversation('64f123abc456def789012345');
```

#### Loading Conversations
```javascript
const loadConversations = async (cursor = null, search = '', limit = 20) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) params.append('cursor', cursor);
  if (search) params.append('search', search);

  const response = await fetch(`/api/v1/chat/conversations?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  return {
    conversations: data.data.conversations,
    pagination: data.data.pagination
  };
};

// Load initial conversations
const { conversations, pagination } = await loadConversations();

// Load more (pagination)
if (pagination.hasMore) {
  const moreData = await loadConversations(pagination.nextCursor);
}
```

#### Joining Conversation Room
```javascript
const joinConversation = (conversationId) => {
  return new Promise((resolve, reject) => {
    socket.emit('conversation:join', conversationId, (response) => {
      if (response.success) {
        resolve(response);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

// Usage
await joinConversation('64f456def789abc123456789');
```

### 2. Message Management

#### Loading Messages
```javascript
const loadMessages = async (conversationId, cursor = null, limit = 50) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (cursor) params.append('cursor', cursor);

  const response = await fetch(`/api/v1/chat/messages/all/${conversationId}?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  return {
    messages: data.data.messages,
    pagination: data.data.pagination
  };
};

// Load messages for active conversation
const { messages, pagination } = await loadMessages(conversationId);
```

#### Sending Messages
```javascript
// Via Socket.IO (Recommended)
const sendMessage = (conversationId, text, replyTo = null) => {
  return new Promise((resolve, reject) => {
    socket.emit('message:send', {
      conversationId,
      text,
      replyTo,
    }, (response) => {
      if (response.success) {
        resolve(response.messageId);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

// Via REST API (Fallback)
const sendMessageREST = async (conversationId, text, replyTo = null) => {
  const response = await fetch('/api/v1/chat/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ conversationId, text, replyTo })
  });

  const data = await response.json();
  if (data.success) {
    return data.data.message;
  }
  throw new Error(data.message);
};

// Usage
await sendMessage(conversationId, 'Hello, how are you?');
```

#### Real-time Message Reception
```javascript
socket.on('message:new', (data) => {
  const { message, conversationId } = data;

  // Add message to UI
  addMessageToUI(message);

  // Update conversation preview
  updateConversationPreview(conversationId, message);

  // Show notification if not focused
  if (!isConversationActive(conversationId)) {
    showNotification(message.sender.fullName, message.text);
  }

  // Play sound
  playMessageSound();
});
```

### 3. Real-time Features

#### Typing Indicators
```javascript
// Start typing
const startTyping = (conversationId) => {
  socket.emit('typing:start', conversationId);
};

// Stop typing
const stopTyping = (conversationId) => {
  socket.emit('typing:stop', conversationId);
};

// Listen for typing events
socket.on('typing:start', (data) => {
  showTypingIndicator(data.userInfo.fullName);
});

socket.on('typing:stop', (data) => {
  hideTypingIndicator(data.userInfo.fullName);
});

// Auto-stop typing after 3 seconds of inactivity
let typingTimeout;
const handleInputChange = (value) => {
  if (value.trim()) {
    startTyping(conversationId);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      stopTyping(conversationId);
    }, 3000);
  } else {
    stopTyping(conversationId);
  }
};
```

#### Read Receipts
```javascript
// Mark messages as read
const markAsRead = (conversationId, upToMessageId = null) => {
  socket.emit('messages:mark_read', {
    conversationId,
    upToMessageId,
  });
};

// Auto-mark as read when messages are viewed
const handleMessagesViewed = (conversationId, lastMessageId) => {
  markAsRead(conversationId, lastMessageId);
};

// Listen for read receipts
socket.on('messages:read', (data) => {
  updateMessageReadStatus(data.conversationId, data.userId, data.upToMessageId);
});
```

#### Online Status
```javascript
// Get online users in conversation
const getOnlineUsers = async (conversationId) => {
  return new Promise((resolve, reject) => {
    socket.emit('conversation:get_online_users', conversationId, (response) => {
      if (response.success) {
        resolve(response.onlineUsers);
      } else {
        reject(new Error(response.error));
      }
    });
  });
};

// Via REST API
const getOnlineUsersREST = async (conversationId) => {
  const response = await fetch(`/api/v1/chat/conversations/${conversationId}/online`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  return data.data.onlineUsers;
};

// Listen for user presence
socket.on('user:online', (data) => {
  updateUserOnlineStatus(data.userId, true);
});

socket.on('user:offline', (data) => {
  updateUserOnlineStatus(data.userId, false);
});
```

## Notification System Integration

### 1. Real-time Notifications

#### Listening for Notifications
```javascript
// Socket automatically joins user to their notification room
socket.on('notification:new', (notification) => {
  // Handle different notification types
  switch (notification.type) {
    case 'chat_message':
      handleChatNotification(notification);
      break;
    case 'system':
      handleSystemNotification(notification);
      break;
    case 'job_match':
      handleJobMatchNotification(notification);
      break;
    default:
      handleGenericNotification(notification);
  }
});

const handleChatNotification = (notification) => {
  // Update chat UI
  updateChatNotificationBadge(notification.conversationId);

  // Show browser notification if permitted
  if (Notification.permission === 'granted') {
    new Notification(notification.title, {
      body: notification.message,
      icon: '/notification-icon.png'
    });
  }

  // Play notification sound
  playNotificationSound();
};
```

### 2. Notification Management

#### Fetching Notifications
```javascript
const fetchNotifications = async (page = 1, limit = 20) => {
  const response = await fetch(`/api/v1/notifications?page=${page}&limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const data = await response.json();
  return data.data.notifications;
};

const markNotificationAsRead = async (notificationId) => {
  const response = await fetch(`/api/v1/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return response.ok;
};

const markAllNotificationsAsRead = async () => {
  const response = await fetch('/api/v1/notifications/mark-all-read', {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  return response.ok;
};
```

### 3. Notification Preferences
```javascript
const updateNotificationPreferences = async (preferences) => {
  const response = await fetch('/api/v1/notifications/preferences', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      emailNotifications: preferences.email,
      pushNotifications: preferences.push,
      chatNotifications: preferences.chat,
      jobMatchNotifications: preferences.jobMatch
    })
  });

  return response.ok;
};
```

## API Reference

### Chat APIs

#### Conversations
```javascript
// Start conversation
POST /api/v1/chat/conversations/start
Body: { "targetUserId": "string" }
Response: { success: boolean, data: { conversation: object } }

// Get conversations
GET /api/v1/chat/conversations?limit=20&cursor=string&search=string
Response: { success: boolean, data: { conversations: array, pagination: object } }

// Get conversation details
GET /api/v1/chat/conversations/{conversationId}
Response: { success: boolean, data: { conversation: object } }

// Get online users
GET /api/v1/chat/conversations/{conversationId}/online
Response: { success: boolean, data: { onlineUsers: array, count: number } }
```

#### Messages
```javascript
// Send message
POST /api/v1/chat/messages
Body: { "conversationId": "string", "text": "string", "replyTo": "string?" }
Response: { success: boolean, data: { message: object } }

// Get messages
GET /api/v1/chat/messages/all/{conversationId}?limit=50&cursor=string
Response: { success: boolean, data: { messages: array, pagination: object } }
```

### Notification APIs
```javascript
// Get notifications
GET /api/v1/notifications?page=1&limit=20
Response: { success: boolean, data: { notifications: array, pagination: object } }

// Mark notification as read
PUT /api/v1/notifications/{notificationId}/read
Response: { success: boolean }

// Mark all as read
PUT /api/v1/notifications/mark-all-read
Response: { success: boolean }

// Update preferences
PUT /api/v1/notifications/preferences
Body: { "emailNotifications": boolean, "pushNotifications": boolean, ... }
Response: { success: boolean }
```

### Socket Events

#### Chat Events
```javascript
// Connection
socket.on('connect', () => {});
socket.on('disconnect', (reason) => {});
socket.on('connect_error', (error) => {});

// Conversations
socket.emit('conversation:join', conversationId, callback);
socket.emit('conversation:leave', conversationId, callback);
socket.emit('conversation:get_online_users', conversationId, callback);

// Messages
socket.emit('message:send', { conversationId, text, replyTo }, callback);
socket.on('message:new', (data) => {});

// Typing
socket.emit('typing:start', conversationId);
socket.emit('typing:stop', conversationId);
socket.on('typing:start', (data) => {});
socket.on('typing:stop', (data) => {});

// Read receipts
socket.emit('messages:mark_read', { conversationId, upToMessageId }, callback);
socket.on('messages:read', (data) => {});

// Presence
socket.on('user:online', (data) => {});
socket.on('user:offline', (data) => {});
```

#### Notification Events
```javascript
socket.on('notification:new', (notification) => {});
```

## Error Handling

### Socket Connection Errors
```javascript
socket.on('connect_error', (error) => {
  console.error('Connection failed:', error);

  // Retry logic
  setTimeout(() => {
    socket.connect();
  }, 5000);
});

socket.on('disconnect', (reason) => {
  if (reason === 'io server disconnect') {
    // Server disconnected, manual reconnection
    socket.connect();
  }
  // Handle other disconnect reasons
});
```

### API Error Handling
```javascript
const handleApiError = (error) => {
  switch (error.status) {
    case 400:
      // Validation error
      showValidationErrors(error.errors);
      break;
    case 403:
      // Permission denied
      showPermissionError();
      break;
    case 404:
      // Not found
      showNotFoundError();
      break;
    default:
      showGenericError();
  }
};
```

### Message Send Failures
```javascript
const sendMessage = async (conversationId, text) => {
  try {
    await socketSendMessage(conversationId, text);
  } catch (socketError) {
    console.warn('Socket send failed, trying REST API:', socketError);

    try {
      await restSendMessage(conversationId, text);
    } catch (restError) {
      console.error('Both socket and REST failed:', restError);
      showSendError();
    }
  }
};
```

## Best Practices

### 1. Connection Management
```javascript
// Initialize socket when user logs in
useEffect(() => {
  if (user && token) {
    initializeSocket(token);
  }

  return () => {
    if (socket) socket.disconnect();
  };
}, [user, token]);
```

### 2. Room Management
```javascript
// Join conversation rooms when viewing chats
useEffect(() => {
  if (activeConversation) {
    joinConversation(activeConversation.id);
  }

  return () => {
    if (activeConversation) {
      leaveConversation(activeConversation.id);
    }
  };
}, [activeConversation]);
```

### 3. Message State Management
```javascript
// Use optimistic updates for better UX
const handleSendMessage = async (text) => {
  const tempMessage = createTempMessage(text);
  addMessageToUI(tempMessage); // Show immediately

  try {
    const sentMessage = await sendMessage(conversationId, text);
    updateMessageInUI(tempMessage.id, sentMessage); // Replace with real message
  } catch (error) {
    removeMessageFromUI(tempMessage.id); // Remove on failure
    showError('Failed to send message');
  }
};
```

### 4. Performance Optimization
```javascript
// Debounce typing indicators
const debouncedStartTyping = useCallback(
  debounce(() => startTyping(conversationId), 300),
  [conversationId]
);

// Virtual scrolling for large message lists
const VirtualizedMessageList = ({ messages }) => {
  // Implement virtual scrolling to handle 1000+ messages
};
```

### 5. Memory Management
```javascript
// Clean up event listeners
useEffect(() => {
  const handleNewMessage = (data) => { /* ... */ };
  socket.on('message:new', handleNewMessage);

  return () => {
    socket.off('message:new', handleNewMessage);
  };
}, []);
```

## Troubleshooting

### Common Issues

#### 1. Socket Connection Fails
```javascript
// Check CORS settings
// Verify JWT token is valid
// Check network connectivity
// Verify server is running on correct port
```

#### 2. Messages Not Received
```javascript
// Ensure user is joined to conversation room
// Check if conversation access is allowed
// Verify message validation passes
// Check server logs for errors
```

#### 3. Authentication Errors
```javascript
// Verify JWT token format
// Check token expiration
// Ensure token is sent in socket auth
// Verify user exists in database
```

#### 4. Performance Issues
```javascript
// Implement message pagination
// Use virtual scrolling for large lists
// Debounce rapid events (typing, etc.)
// Optimize re-renders with React.memo
```

### Debug Logging
```javascript
// Enable detailed logging
localStorage.setItem('debug', 'socket.io-client:*');

// Monitor socket events
socket.onAny((event, ...args) => {
  console.log(`Socket event: ${event}`, args);
});
```

## Examples

### Complete Chat Component
```javascript
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const ChatApp = () => {
  const [socket, setSocket] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Initialize socket
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const newSocket = io('http://localhost:4000', {
      auth: { token }
    });

    // Socket event handlers
    newSocket.on('connect', () => {
      console.log('Connected to chat');
      loadConversations();
    });

    newSocket.on('message:new', handleNewMessage);
    newSocket.on('typing:start', handleTypingStart);
    newSocket.on('typing:stop', handleTypingStop);
    newSocket.on('user:online', handleUserOnline);
    newSocket.on('user:offline', handleUserOffline);

    setSocket(newSocket);

    return () => newSocket.disconnect();
  }, []);

  // Load conversations
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/v1/chat/conversations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setConversations(data.data.conversations);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  // Join conversation
  const joinConversation = (conversation) => {
    if (activeConversation) {
      socket.emit('conversation:leave', activeConversation._id);
    }

    setActiveConversation(conversation);
    socket.emit('conversation:join', conversation._id);
    loadMessages(conversation._id);
  };

  // Load messages
  const loadMessages = async (conversationId) => {
    try {
      const response = await fetch(`/api/v1/chat/messages/all/${conversationId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      setMessages(data.data.messages);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  // Send message
  const sendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;

    socket.emit('message:send', {
      conversationId: activeConversation._id,
      text: newMessage.trim()
    }, (response) => {
      if (response.success) {
        setNewMessage('');
      } else {
        console.error('Failed to send message:', response.error);
      }
    });
  };

  // Event handlers
  const handleNewMessage = (data) => {
    if (data.conversationId === activeConversation?._id) {
      setMessages(prev => [...prev, data.message]);
    }
    // Update conversation preview
    updateConversationPreview(data.conversationId, data.message);
  };

  const handleTypingStart = (data) => {
    if (data.conversationId === activeConversation?._id) {
      setIsTyping(true);
    }
  };

  const handleTypingStop = (data) => {
    setIsTyping(false);
  };

  const handleUserOnline = (data) => {
    setOnlineUsers(prev => new Set([...prev, data.userId]));
  };

  const handleUserOffline = (data) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(data.userId);
      return newSet;
    });
  };

  return (
    <div className="chat-app">
      <div className="conversations-list">
        {conversations.map(conv => (
          <div
            key={conv._id}
            className={`conversation ${activeConversation?._id === conv._id ? 'active' : ''}`}
            onClick={() => joinConversation(conv)}
          >
            <div className="conversation-info">
              <div className="participants">
                {conv.participantUsers?.filter(u => u._id !== 'currentUserId')
                  .map(u => u.fullName).join(', ')}
              </div>
              {conv.lastMessage && (
                <div className="last-message">
                  {conv.lastMessage.text?.substring(0, 50)}...
                </div>
              )}
            </div>
            {conv.unreadCount > 0 && (
              <div className="unread-badge">{conv.unreadCount}</div>
            )}
          </div>
        ))}
      </div>

      <div className="chat-window">
        {activeConversation ? (
          <>
            <div className="messages">
              {messages.map(msg => (
                <div key={msg._id} className={`message ${msg.sender._id === 'currentUserId' ? 'own' : 'other'}`}>
                  <div className="message-content">
                    <div className="sender">{msg.sender.fullName}</div>
                    <div className="text">{msg.text}</div>
                    <div className="timestamp">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && <div className="typing">Someone is typing...</div>}
            </div>

            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
              />
              <button onClick={sendMessage} disabled={!newMessage.trim()}>
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="no-conversation">Select a conversation to start chatting</div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
```

### Notification Handler
```javascript
import { useEffect } from 'react';

const useNotifications = (socket) => {
  useEffect(() => {
    if (!socket) return;

    const handleNotification = (notification) => {
      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon.png',
          tag: notification._id // Prevent duplicates
        });
      }

      // Update UI
      updateNotificationBadge(notification);

      // Play sound
      playNotificationSound();
    };

    socket.on('notification:new', handleNotification);

    return () => {
      socket.off('notification:new', handleNotification);
    };
  }, [socket]);
};

// Usage
const NotificationHandler = () => {
  useNotifications(socket);
  return null; // This component only handles notifications
};
```

## Frontend Integration Guide

### Complete React Chat Implementation

```javascript
// ChatProvider.jsx - Socket Management
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import io from 'socket.io-client';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(new Map());
  const [typingUsers, setTypingUsers] = useState(new Map());

  // Initialize socket connection
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    console.log('🔌 Initializing socket connection...');

    const newSocket = io('http://localhost:4000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to chat server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚫 Connection error:', error);
      setIsConnected(false);
    });

    // Message events
    newSocket.on('message:new', handleNewMessage);

    // Typing events
    newSocket.on('typing:start', handleTypingStart);
    newSocket.on('typing:stop', handleTypingStop);

    // Presence events
    newSocket.on('user:online', handleUserOnline);
    newSocket.on('user:offline', handleUserOffline);

    // Notification events
    newSocket.on('notification:new', handleNotification);

    setSocket(newSocket);

    // Cleanup
    return () => {
      console.log('🧹 Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);

  // Event handlers
  const handleNewMessage = useCallback((data) => {
    const { message, conversationId } = data;
    console.log('📨 New message received:', message);

    // Add to messages if it's the active conversation
    if (activeConversation && activeConversation._id === conversationId) {
      setMessages(prev => [...prev, message]);
    }

    // Update conversation preview
    setConversations(prev => prev.map(conv =>
      conv._id === conversationId
        ? { ...conv, lastMessage: message, unreadCount: conv.unreadCount + 1 }
        : conv
    ));

    // Play notification sound if not active
    if (!activeConversation || activeConversation._id !== conversationId) {
      playMessageSound();
    }
  }, [activeConversation]);

  const handleTypingStart = useCallback((data) => {
    const { userInfo, conversationId } = data;
    if (activeConversation && activeConversation._id === conversationId) {
      setTypingUsers(prev => new Map(prev.set(userInfo._id, userInfo)));
    }
  }, [activeConversation]);

  const handleTypingStop = useCallback((data) => {
    const { userInfo, conversationId } = data;
    if (activeConversation && activeConversation._id === conversationId) {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(userInfo._id);
        return newMap;
      });
    }
  }, [activeConversation]);

  const handleUserOnline = useCallback((data) => {
    setOnlineUsers(prev => new Map(prev.set(data.userId, true)));
  }, []);

  const handleUserOffline = useCallback((data) => {
    setOnlineUsers(prev => new Map(prev.set(data.userId, false)));
  }, []);

  const handleNotification = useCallback((notification) => {
    console.log('🔔 New notification:', notification);

    // Show browser notification
    if (Notification.permission === 'granted' && document.hidden) {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/notification-icon.png',
        tag: notification._id
      });
    }

    // Update UI notification badge
    updateNotificationBadge(notification);
  }, []);

  // API functions
  const loadConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/chat/conversations', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await response.json();
      if (data.success) {
        setConversations(data.data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const joinConversation = useCallback((conversationId) => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not connected'));

      socket.emit('conversation:join', conversationId, (response) => {
        if (response.success) {
          console.log('✅ Joined conversation:', conversationId);
          resolve(response);
        } else {
          console.error('❌ Failed to join conversation:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }, [socket]);

  const leaveConversation = useCallback((conversationId) => {
    if (socket) {
      socket.emit('conversation:leave', conversationId);
      console.log('👋 Left conversation:', conversationId);
    }
  }, [socket]);

  const sendMessage = useCallback((conversationId, text, replyTo = null) => {
    return new Promise((resolve, reject) => {
      if (!socket) return reject(new Error('Socket not connected'));

      socket.emit('message:send', {
        conversationId,
        text: text.trim(),
        replyTo
      }, (response) => {
        if (response.success) {
          console.log('✅ Message sent:', response.messageId);
          resolve(response.messageId);
        } else {
          console.error('❌ Failed to send message:', response.error);
          reject(new Error(response.error));
        }
      });
    });
  }, [socket]);

  const sendMessageREST = useCallback(async (conversationId, text, replyTo = null) => {
    const response = await fetch('/api/v1/chat/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ conversationId, text, replyTo })
    });

    const data = await response.json();
    if (data.success) {
      return data.data.message;
    }
    throw new Error(data.message);
  }, []);

  const loadMessages = useCallback(async (conversationId, cursor = null, limit = 50) => {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (cursor) params.append('cursor', cursor);

    const response = await fetch(`/api/v1/chat/messages/all/${conversationId}?${params}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });

    const data = await response.json();
    if (data.success) {
      return {
        messages: data.data.messages,
        pagination: data.data.pagination
      };
    }
    throw new Error(data.message);
  }, []);

  const startTyping = useCallback((conversationId) => {
    if (socket) {
      socket.emit('typing:start', conversationId);
    }
  }, [socket]);

  const stopTyping = useCallback((conversationId) => {
    if (socket) {
      socket.emit('typing:stop', conversationId);
    }
  }, [socket]);

  const markAsRead = useCallback((conversationId, upToMessageId = null) => {
    if (socket) {
      socket.emit('messages:mark_read', {
        conversationId,
        upToMessageId
      });
    }
  }, [socket]);

  // Context value
  const value = {
    // State
    socket,
    isConnected,
    conversations,
    activeConversation,
    messages,
    onlineUsers,
    typingUsers,

    // Actions
    loadConversations,
    setActiveConversation,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendMessageREST,
    loadMessages,
    setMessages,
    startTyping,
    stopTyping,
    markAsRead,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Utility functions
const playMessageSound = () => {
  // Play notification sound
  const audio = new Audio('/message-sound.mp3');
  audio.play().catch(() => {}); // Ignore errors if sound fails
};

const updateNotificationBadge = (notification) => {
  // Update notification badge in UI
  const badge = document.querySelector('.notification-badge');
  if (badge) {
    const currentCount = parseInt(badge.textContent || '0');
    badge.textContent = currentCount + 1;
    badge.style.display = 'block';
  }
};
```

### Chat Component Implementation

```javascript
// ChatWindow.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useChat } from './ChatProvider';
import debounce from 'lodash/debounce';

const ChatWindow = ({ conversationId }) => {
  const {
    socket,
    isConnected,
    activeConversation,
    messages,
    typingUsers,
    joinConversation,
    leaveConversation,
    sendMessage,
    sendMessageREST,
    loadMessages,
    setMessages,
    startTyping,
    stopTyping,
    markAsRead,
  } = useChat();

  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Join conversation when component mounts
  useEffect(() => {
    if (conversationId && socket && isConnected) {
      joinConversation(conversationId).catch(console.error);
    }

    return () => {
      if (conversationId) {
        leaveConversation(conversationId);
      }
    };
  }, [conversationId, socket, isConnected, joinConversation, leaveConversation]);

  // Load initial messages
  useEffect(() => {
    if (conversationId) {
      loadInitialMessages();
    }
  }, [conversationId]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversationId && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      markAsRead(conversationId, lastMessage._id);
    }
  }, [conversationId, messages, markAsRead]);

  const loadInitialMessages = async () => {
    setIsLoading(true);
    try {
      const { messages: loadedMessages, pagination } = await loadMessages(conversationId);
      setMessages(loadedMessages);
      setHasMore(pagination.hasMore);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMoreMessages = async () => {
    if (!hasMore || isLoading) return;

    setIsLoading(true);
    try {
      const oldestMessage = messages[0];
      const { messages: olderMessages, pagination } = await loadMessages(
        conversationId,
        oldestMessage._id
      );

      setMessages(prev => [...olderMessages, ...prev]);
      setHasMore(pagination.hasMore);
    } catch (error) {
      console.error('Failed to load more messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      // Try socket first
      await sendMessage(conversationId, messageText);
    } catch (socketError) {
      console.warn('Socket send failed, trying REST:', socketError);
      try {
        // Fallback to REST API
        await sendMessageREST(conversationId, messageText);
      } catch (restError) {
        console.error('Both send methods failed:', restError);
        // Show error to user
        alert('Failed to send message. Please try again.');
        // Restore message in input
        setNewMessage(messageText);
      }
    }
  };

  const handleInputChange = useCallback(
    debounce((value) => {
      if (value.trim()) {
        startTyping(conversationId);
      } else {
        stopTyping(conversationId);
      }
    }, 300),
    [conversationId, startTyping, stopTyping]
  );

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-window">
      {/* Connection Status */}
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Messages Area */}
      <div className="messages-container" onScroll={handleScroll}>
        {isLoading && <div className="loading">Loading messages...</div>}

        {hasMore && (
          <button
            className="load-more-btn"
            onClick={loadMoreMessages}
            disabled={isLoading}
          >
            Load Earlier Messages
          </button>
        )}

        <div className="messages-list">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`message ${message.sender._id === 'currentUserId' ? 'own' : 'other'}`}
            >
              <div className="message-avatar">
                <img src={message.sender.profilePicture || '/default-avatar.png'} alt="" />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="sender-name">{message.sender.fullName}</span>
                  <span className="message-time">{formatTime(message.createdAt)}</span>
                </div>
                <div className="message-text">{message.text}</div>
                {message.replyTo && (
                  <div className="message-reply">
                    <span>Replying to: {message.replyTo.text?.substring(0, 50)}...</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicators */}
          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              {Array.from(typingUsers.values()).map(user => user.fullName).join(', ')} is typing...
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="message-input-container">
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleInputChange(e.target.value);
          }}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          rows={1}
          disabled={!isConnected}
        />
        <button
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || !isConnected}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
```

### Conversation List Component

```javascript
// ConversationList.jsx
import React, { useEffect } from 'react';
import { useChat } from './ChatProvider';

const ConversationList = () => {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    loadConversations,
    onlineUsers
  } = useChat();

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="conversation-list">
      <h3>Conversations</h3>
      {conversations.map((conversation) => (
        <div
          key={conversation._id}
          className={`conversation-item ${
            activeConversation?._id === conversation._id ? 'active' : ''
          }`}
          onClick={() => setActiveConversation(conversation)}
        >
          <div className="conversation-avatar">
            <img src={conversation.participants[0]?.user?.profilePicture || '/default-avatar.png'} alt="" />
            {onlineUsers.get(conversation.participants[0]?.user?._id) && (
              <div className="online-indicator"></div>
            )}
          </div>

          <div className="conversation-info">
            <div className="conversation-name">
              {conversation.participants
                .filter(p => p.user._id !== 'currentUserId')
                .map(p => p.user.fullName)
                .join(', ')}
            </div>

            {conversation.lastMessage && (
              <div className="last-message">
                <span className="message-text">
                  {conversation.lastMessage.text?.substring(0, 50)}
                  {conversation.lastMessage.text?.length > 50 ? '...' : ''}
                </span>
                <span className="message-time">
                  {formatTime(conversation.lastMessage.createdAt)}
                </span>
              </div>
            )}
          </div>

          {conversation.unreadCount > 0 && (
            <div className="unread-badge">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
```

### App.jsx Integration

```javascript
// App.jsx
import React from 'react';
import { ChatProvider } from './components/chat/ChatProvider';
import ConversationList from './components/chat/ConversationList';
import ChatWindow from './components/chat/ChatWindow';
import './App.css';

function App() {
  const [activeConversationId, setActiveConversationId] = useState(null);

  return (
    <ChatProvider>
      <div className="app">
        <div className="chat-layout">
          <ConversationList
            onConversationSelect={setActiveConversationId}
          />
          {activeConversationId && (
            <ChatWindow conversationId={activeConversationId} />
          )}
        </div>
      </div>
    </ChatProvider>
  );
}

export default App;
```

### CSS Styling

```css
/* Chat Styles */
.chat-layout {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.conversation-list {
  width: 300px;
  background: white;
  border-right: 1px solid #e0e0e0;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.conversation-item:hover,
.conversation-item.active {
  background: #f8f9fa;
}

.conversation-avatar {
  position: relative;
  margin-right: 12px;
}

.conversation-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.online-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  background: #4caf50;
  border: 2px solid white;
  border-radius: 50%;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-name {
  font-weight: 600;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.last-message {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.message-text {
  flex: 1;
  color: #666;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.message-time {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
  flex-shrink: 0;
}

.unread-badge {
  background: #007bff;
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 12px;
  font-weight: 600;
  min-width: 20px;
  text-align: center;
}

.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.connection-status {
  padding: 8px 16px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
}

.connection-status.connected {
  background: #d4edda;
  color: #155724;
}

.connection-status.disconnected {
  background: #f8d7da;
  color: #721c24;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  max-width: 70%;
}

.message.own {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message.other {
  align-self: flex-start;
}

.message-avatar {
  margin: 0 8px;
}

.message-avatar img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}

.message-content {
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 16px;
  max-width: 400px;
}

.message.own .message-content {
  background: #007bff;
  color: white;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.sender-name {
  font-weight: 600;
  font-size: 14px;
}

.message-time {
  font-size: 12px;
  opacity: 0.7;
}

.message-text {
  word-wrap: break-word;
}

.typing-indicator {
  font-style: italic;
  color: #666;
  padding: 8px 16px;
  font-size: 14px;
}

.message-input-container {
  display: flex;
  padding: 16px;
  gap: 8px;
  border-top: 1px solid #e0e0e0;
}

.message-input-container textarea {
  flex: 1;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  resize: none;
  font-family: inherit;
  outline: none;
}

.message-input-container textarea:focus {
  border-color: #007bff;
}

.message-input-container button {
  padding: 12px 24px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-weight: 600;
}

.message-input-container button:hover:not(:disabled) {
  background: #0056b3;
}

.message-input-container button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.load-more-btn {
  width: 100%;
  padding: 8px;
  margin-bottom: 16px;
  background: #f8f9fa;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
}

.load-more-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 16px;
  color: #666;
}
```

## Frontend Integration Summary

### Key Components:
1. **ChatProvider** - Manages socket connection and global state
2. **ConversationList** - Shows all conversations with unread counts
3. **ChatWindow** - Handles message display and sending
4. **Real-time updates** - Automatic message reception and UI updates

### Key Features Implemented:
- ✅ Socket.IO connection with JWT authentication
- ✅ Real-time message sending and receiving
- ✅ Typing indicators
- ✅ Online/offline status
- ✅ Read receipts
- ✅ Unread message counts
- ✅ Message pagination
- ✅ Fallback to REST API when socket fails
- ✅ Error handling and connection status
- ✅ Responsive UI with proper styling

### Usage:
1. Wrap your app with `<ChatProvider>`
2. Use `<ConversationList>` to show conversations
3. Use `<ChatWindow conversationId={id}>` to show chat
4. Messages are sent automatically via socket with REST fallback

This implementation provides a complete, production-ready chat system! 🚀

## 🎯 Socket.IO vs REST API: When to Use Which?

### **Decision Tree for Message Sending**

```javascript
function sendMessage(conversationId, text) {
  // 🚀 ALWAYS TRY SOCKET.IO FIRST (for real-time experience)
  if (socketConnected && userOnline) {
    return sendViaSocket(conversationId, text);
  }
  
  // 🔄 FALLBACK TO REST API (for reliability)
  return sendViaREST(conversationId, text);
}
```

### **📊 When to Use Socket.IO (Primary)**

| Scenario | Use Socket.IO | Why |
|----------|---------------|-----|
| **Live Chat** | ✅ Always | Instant delivery, real-time updates |
| **Typing Indicators** | ✅ Always | Real-time feedback |
| **Online Status** | ✅ Always | Live presence updates |
| **Read Receipts** | ✅ Always | Instant read confirmations |
| **Group Chat** | ✅ Always | Multiple users see instantly |
| **Mobile App** | ✅ Always | Better battery/performance |

### **📊 When to Use REST API (Fallback)**

| Scenario | Use REST API | Why |
|----------|--------------|-----|
| **Socket Disconnected** | ✅ Fallback | Works without WebSocket |
| **File Uploads** | ✅ Primary | REST handles multipart data |
| **Large Messages** | ✅ Primary | No size limits |
| **Offline Mode** | ✅ Primary | Queues for later sending |
| **Background Sync** | ✅ Primary | App can sync when reopened |
| **Retry Logic** | ✅ Primary | Built-in HTTP retry mechanisms |

### **🔄 Smart Hybrid Approach (Recommended)**

```javascript
// ChatProvider.jsx - Smart message sending
const sendMessage = useCallback(async (conversationId, text, replyTo = null) => {
  // 🎯 STRATEGY 1: Try Socket.IO first (real-time)
  if (socket && isConnected) {
    try {
      console.log('🚀 Sending via Socket.IO (real-time)');
      const messageId = await sendViaSocket(conversationId, text, replyTo);
      
      // ✅ SUCCESS: Real-time message sent
      return { success: true, method: 'socket', messageId };
      
    } catch (socketError) {
      console.warn('⚠️ Socket failed, trying REST:', socketError);
      
      // 🔄 FALLBACK: Try REST API
      try {
        const message = await sendViaREST(conversationId, text, replyTo);
        return { success: true, method: 'rest', message };
        
      } catch (restError) {
        console.error('❌ Both methods failed:', restError);
        return { success: false, error: restError.message };
      }
    }
  }
  
  // 📡 STRATEGY 2: Socket not available, use REST
  else {
    console.log('📡 Socket not connected, using REST API');
    try {
      const message = await sendViaREST(conversationId, text, replyTo);
      return { success: true, method: 'rest', message };
      
    } catch (restError) {
      console.error('❌ REST API failed:', restError);
      return { success: false, error: restError.message };
    }
  }
}, [socket, isConnected]);

// Usage in components
const handleSendMessage = async () => {
  const result = await sendMessage(conversationId, newMessage);
  
  if (result.success) {
    setNewMessage('');
    console.log(`✅ Message sent via ${result.method}`);
  } else {
    alert(`Failed to send message: ${result.error}`);
    // Keep message in input for retry
  }
};
```

### **🎮 Real-World Usage Examples**

#### **1. Live Chat Application**
```javascript
// ✅ ALWAYS use Socket.IO for live chat
const LiveChat = () => {
  const handleSend = () => {
    // User expects instant delivery
    sendMessage(conversationId, text); // Socket.IO primary
  };
};
```

#### **2. File Sharing**
```javascript
// ✅ ALWAYS use REST API for files
const sendFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('conversationId', conversationId);
  
  // REST API handles file uploads better
  await fetch('/api/v1/chat/messages/file', {
    method: 'POST',
    body: formData,
    headers: { 'Authorization': token }
  });
};
```

#### **3. Offline Messaging**
```javascript
// ✅ Use REST API for offline queue
const sendOfflineMessage = async (conversationId, text) => {
  // Store in IndexedDB for later
  await storeOfflineMessage({ conversationId, text, timestamp: Date.now() });
  
  // Try to send immediately
  const result = await sendMessage(conversationId, text);
  
  if (result.success) {
    // Remove from offline queue
    await removeOfflineMessage(conversationId, text);
  }
  // If failed, message stays in queue for retry
};
```

#### **4. Background Sync**
```javascript
// ✅ Use REST API for background sync
const syncOfflineMessages = async () => {
  const offlineMessages = await getOfflineMessages();
  
  for (const msg of offlineMessages) {
    try {
      // Use REST API for reliable background sync
      await sendViaREST(msg.conversationId, msg.text);
      await removeOfflineMessage(msg.id);
    } catch (error) {
      console.error('Failed to sync message:', error);
    }
  }
};
```

### **⚡ Performance Comparison**

| Feature | Socket.IO | REST API |
|---------|-----------|----------|
| **Speed** | ⚡ Instant (real-time) | 🐌 HTTP latency |
| **Reliability** | ⚠️ Requires connection | ✅ Always works |
| **Battery Usage** | 🔋 Persistent connection | 🔋 Request-based |
| **Data Usage** | 📊 Minimal overhead | 📊 HTTP headers |
| **Offline Support** | ❌ Needs connection | ✅ Can queue |
| **File Uploads** | ❌ Not ideal | ✅ Perfect |
| **Error Recovery** | 🔄 Auto-reconnect | 🔄 Manual retry |

### **🎯 Simple Rule of Thumb**

```javascript
// 🚀 FOR REAL-TIME FEATURES: Use Socket.IO
if (userExpectsInstantResponse) {
  return sendViaSocket(); // Live chat, typing, presence
}

// 📡 FOR RELIABILITY: Use REST API  
if (needsToWorkOffline || isFileUpload) {
  return sendViaREST(); // Files, offline queue, background sync
}

// 🔄 HYBRID: Try Socket, fallback to REST
return sendMessage(); // Smart automatic choice
```

### **🔧 Implementation in Your App**

```javascript
// In your ChatWindow component
const ChatWindow = ({ conversationId }) => {
  const { sendMessage, isConnected } = useChat();
  
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    
    const text = newMessage.trim();
    setNewMessage('');
    
    // 🎯 SMART SENDING: Socket first, REST fallback
    const result = await sendMessage(conversationId, text);
    
    if (!result.success) {
      // Restore message if both methods failed
      setNewMessage(text);
      alert('Message failed to send. Please try again.');
    }
  };
  
  return (
    <div>
      {/* Show connection status */}
      <div className={isConnected ? 'connected' : 'disconnected'}>
        {isConnected ? '🟢 Live Chat' : '📡 Offline Mode'}
      </div>
      
      {/* Input */}
      <input 
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
        placeholder={isConnected ? 'Type a message...' : 'Offline mode - will send when connected'}
      />
      
      <button onClick={handleSend} disabled={!newMessage.trim()}>
        {isConnected ? 'Send Live' : 'Send Later'}
      </button>
    </div>
  );
};
```

### **📱 Mobile App Considerations**

```javascript
// React Native / Mobile Apps
const sendMessageMobile = async (conversationId, text) => {
  // 📱 Mobile: Prefer REST API to save battery
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    return sendViaREST(conversationId, text); // Battery efficient
  }
  
  // 💻 Web: Use Socket.IO for real-time
  return sendViaSocket(conversationId, text);
};
```

## **🎉 Summary**

### **Primary Choice: Socket.IO**
- ✅ **Live chat** - instant messaging
- ✅ **Real-time features** - typing, presence, read receipts
- ✅ **Better UX** - immediate feedback

### **Fallback Choice: REST API**
- ✅ **Reliability** - works without WebSocket
- ✅ **File uploads** - handles large data
- ✅ **Offline support** - can queue messages
- ✅ **Background sync** - app can sync later

### **Smart Hybrid Approach**
```javascript
// 🎯 RECOMMENDED: Try Socket.IO, fallback to REST API
const sendMessage = async (conversationId, text) => {
  try {
    return await sendViaSocket(conversationId, text); // 🚀 Primary
  } catch (error) {
    return await sendViaREST(conversationId, text);  // 🔄 Fallback
  }
};
```

**Your chat system is designed for Socket.IO as primary with REST API fallback - this gives you the best of both worlds!** 🎉

This comprehensive guide covers everything needed to integrate the TalentBridge chat and notification systems. Follow the steps in order, implement error handling, and use the examples as starting points for your frontend integration.</content>
<parameter name="filePath">/home/hanzala/workspace/Talnet-Bridge/SOCKET_INTEGRATION_README.md
