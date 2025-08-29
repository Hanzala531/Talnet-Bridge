# TalentBridge Chat System - Complete Guide

## Overview

The TalentBridge Chat System is a real-time messaging platform that enables secure communication between different user roles (admins, students, schools, and employers). The system includes REST APIs, real-time WebSocket communication, and integrated notifications.

## 🌟 Features

### Core Chat Features
- **Real-time messaging** via WebSocket (Socket.IO)
- **Direct message conversations** between authorized users
- **Message history** with pagination
- **Message editing and deletion**
- **Typing indicators**
- **Online/offline user status**
- **Read receipts**
- **Message replies**
- **Role-based conversation permissions**

### Notification System
- **Real-time notifications** for new messages
- **Email notifications** (configurable)
- **Push notifications** (configurable)
- **Notification preferences** per user
- **Bulk notification management**

### Security & Performance
- **JWT-based authentication**
- **Role-based access control**
- **Message sanitization** (XSS prevention)
- **Redis caching** for notifications
- **Rate limiting** protection
- **Input validation** and error handling

## 🏗️ Architecture

### Components
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API    │    │   Database      │
│   (React/Vue)   │◄──►│   (Express.js)   │◄──►│   (MongoDB)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Socket.IO     │    │   Notification   │    │   Redis Cache   │
│   (Real-time)   │    │   Service        │    │   (Performance) │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### File Structure
```
src/
├── controllers/
│   ├── chat.conversation.controller.js  # Conversation management
│   ├── chat.message.controller.js       # Message operations
│   └── notification.controllers.js      # Notification management
├── models/
│   ├── chat.conversation.models.js      # Conversation schema
│   ├── chat.message.models.js          # Message schema
│   └── notification.models.js          # Notification schema
├── routes/
│   ├── chat.conversation.routes.js     # Conversation routes
│   ├── chat.message.routes.js          # Message routes
│   └── notification.routes.js          # Notification routes
├── services/
│   ├── chat.service.js                 # Chat business logic
│   ├── chat.roleRules.js              # Permission rules
│   └── notification.service.js         # Notification logic
├── sockets/
│   └── chat.socket.js                  # Real-time WebSocket handling
└── validators/
    └── chat.validators.js              # Input validation
```

## 🔐 Role-Based Permissions

### Conversation Rules
| From Role | Can Message | 
|-----------|-------------|
| **Admin** | Student, School, Employer |
| **School** | Admin, Student, Employer |
| **Student** | Admin, School |
| **Employer** | Admin, School |

### Notes:
- Students cannot directly message other students
- Employers cannot directly message other employers
- All rules are enforced at both API and Socket.IO levels

## 📡 API Endpoints

### Conversation Management

#### Start/Get Conversation
```http
POST /api/v1/chat/conversations/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "targetUserId": "64f123abc456def789012345"
}
```

#### List User Conversations
```http
GET /api/v1/chat/conversations?limit=20&cursor=2024-01-01T00:00:00Z
Authorization: Bearer <token>
```

#### Get Conversation Details
```http
GET /api/v1/chat/conversations/:conversationId
Authorization: Bearer <token>
```

#### Get Online Users in Conversation
```http
GET /api/v1/chat/conversations/:conversationId/online
Authorization: Bearer <token>
```

### Message Operations

#### Send Message
```http
POST /api/v1/chat/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "64f456def789abc123456789",
  "text": "Hello, how are you?",
  "replyTo": "64f789abc123def456789012" // optional
}
```

#### Get Messages
```http
GET /api/v1/chat/messages/:conversationId?limit=50&cursor=2024-01-01T00:00:00Z
Authorization: Bearer <token>
```

#### Edit Message
```http
PATCH /api/v1/chat/messages/:messageId
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Updated message content"
}
```

#### Delete Message
```http
DELETE /api/v1/chat/messages/:messageId
Authorization: Bearer <token>
```

#### Mark Messages as Read
```http
PATCH /api/v1/chat/messages/:conversationId/read
Authorization: Bearer <token>
Content-Type: application/json

{
  "upToMessageId": "64f789abc123def456789012" // optional
}
```

#### Send Typing Indicator
```http
POST /api/v1/chat/typing
Authorization: Bearer <token>
Content-Type: application/json

{
  "conversationId": "64f456def789abc123456789",
  "isTyping": true
}
```

### Notification Management

#### Get User Notifications
```http
GET /api/v1/notifications?page=1&limit=10&unread=true&type=message_received
Authorization: Bearer <token>
```

#### Mark Notification as Read
```http
PATCH /api/v1/notifications/:id/read
Authorization: Bearer <token>
```

#### Create Notification (Admin Only)
```http
POST /api/v1/notifications
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "recipient": "64f123abc456def789012345",
  "title": "New Message",
  "message": "You have a new message from John Doe",
  "type": "message_received",
  "priority": "normal",
  "channels": {
    "inApp": true,
    "email": false,
    "push": true
  }
}
```

## 🔄 Real-time Communication (Socket.IO)

### Connection Setup
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:8000', {
  auth: {
    token: 'your-jwt-token'
  }
});

socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('connect_error', (error) => {
  console.error('Connection failed:', error.message);
});
```

### Socket Events

#### Client → Server Events

##### Join Conversation
```javascript
socket.emit('conversation:join', conversationId, (response) => {
  if (response.success) {
    console.log('Joined conversation successfully');
  } else {
    console.error('Failed to join:', response.error);
  }
});
```

##### Send Message
```javascript
socket.emit('message:send', {
  conversationId: '64f456def789abc123456789',
  text: 'Hello via socket!',
  replyTo: null // optional
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.messageId);
  }
});
```

##### Typing Indicators
```javascript
// Start typing
socket.emit('typing:start', conversationId);

// Stop typing
socket.emit('typing:stop', conversationId);
```

##### Mark Messages as Read
```javascript
socket.emit('messages:mark_read', {
  conversationId: '64f456def789abc123456789',
  upToMessageId: '64f789abc123def456789012'
}, (response) => {
  console.log('Messages marked as read');
});
```

##### Get Online Users
```javascript
socket.emit('conversation:get_online_users', conversationId, (response) => {
  if (response.success) {
    console.log('Online users:', response.onlineUsers);
  }
});
```

#### Server → Client Events

##### New Message
```javascript
socket.on('message:new', (data) => {
  console.log('New message:', data);
  // data contains: _id, conversationId, senderId, text, sender, timestamp, etc.
});
```

##### User Online/Offline Status
```javascript
socket.on('user:online', (data) => {
  console.log('User came online:', data.userInfo.fullName);
});

socket.on('user:offline', (data) => {
  console.log('User went offline:', data.userInfo.fullName);
});
```

##### Typing Indicators
```javascript
socket.on('typing:start', (data) => {
  console.log(`${data.userInfo.fullName} is typing...`);
});

socket.on('typing:stop', (data) => {
  console.log(`${data.userInfo.fullName} stopped typing`);
});
```

##### Message Read Receipts
```javascript
socket.on('messages:read', (data) => {
  console.log('Messages read by:', data.userId);
});
```

##### Notifications
```javascript
socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Show toast/popup notification
});

socket.on('notification:read', (data) => {
  console.log('Notification marked as read:', data.notificationId);
});
```

##### Message Updates
```javascript
socket.on('message:edited', (data) => {
  console.log('Message edited:', data);
  // Update message in UI
});

socket.on('message:deleted', (data) => {
  console.log('Message deleted:', data.messageId);
  // Remove/hide message in UI
});
```

## 💾 Data Models

### Conversation Model
```javascript
{
  _id: ObjectId,
  participants: [{
    user: ObjectId (ref: User),
    role: String (admin|student|school|employer)
  }],
  isGroup: Boolean (default: false),
  name: String (for group chats),
  lastMessage: ObjectId (ref: ChatMessage),
  unread: Map<String, Number>, // userId -> unread count
  createdAt: Date,
  updatedAt: Date
}
```

### Message Model
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (ref: ChatConversation),
  sender: ObjectId (ref: User),
  text: String (max: 5000, sanitized),
  readBy: [ObjectId] (refs: User),
  edited: Boolean (default: false),
  editedAt: Date,
  replyTo: ObjectId (ref: ChatMessage),
  createdAt: Date,
  updatedAt: Date
}
```

### Notification Model
```javascript
{
  _id: ObjectId,
  recipient: ObjectId (ref: User),
  title: String (max: 100),
  message: String (max: 500),
  type: String (enum: message_received, course_enrollment, etc.),
  relatedEntity: {
    entityType: String (course|job|application|payment|user|message),
    entityId: ObjectId
  },
  actionUrl: String,
  status: String (unread|read|dismissed),
  priority: String (low|normal|high),
  channels: {
    inApp: Boolean,
    email: Boolean,
    sms: Boolean,
    push: Boolean
  },
  delivery: { /* delivery status tracking */ },
  metadata: Map,
  expiresAt: Date,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Frontend Integration Examples

### React Chat Component
```jsx
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

function ChatComponent({ conversationId, authToken }) {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io('http://localhost:8000', {
      auth: { token: authToken }
    });

    // Join conversation
    newSocket.emit('conversation:join', conversationId);

    // Listen for new messages
    newSocket.on('message:new', (message) => {
      setMessages(prev => [...prev, message]);
    });

    // Listen for online users
    newSocket.on('user:online', (user) => {
      setOnlineUsers(prev => [...prev, user]);
    });

    newSocket.on('user:offline', (user) => {
      setOnlineUsers(prev => prev.filter(u => u.userId !== user.userId));
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, [conversationId, authToken]);

  const sendMessage = () => {
    if (socket && newMessage.trim()) {
      socket.emit('message:send', {
        conversationId,
        text: newMessage.trim()
      });
      setNewMessage('');
    }
  };

  return (
    <div className="chat-container">
      <div className="online-users">
        Online: {onlineUsers.length}
      </div>
      
      <div className="messages">
        {messages.map(message => (
          <div key={message._id} className="message">
            <strong>{message.sender.fullName}:</strong> {message.text}
          </div>
        ))}
      </div>
      
      <div className="message-input">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}
```

### Vue.js Chat Integration
```vue
<template>
  <div class="chat">
    <div class="message-list">
      <div v-for="message in messages" :key="message._id" class="message">
        {{ message.sender.fullName }}: {{ message.text }}
      </div>
    </div>
    
    <div class="input-area">
      <input
        v-model="newMessage"
        @keyup.enter="sendMessage"
        placeholder="Type a message..."
      />
      <button @click="sendMessage">Send</button>
    </div>
  </div>
</template>

<script>
import io from 'socket.io-client'

export default {
  name: 'ChatComponent',
  props: ['conversationId', 'authToken'],
  data() {
    return {
      socket: null,
      messages: [],
      newMessage: ''
    }
  },
  
  mounted() {
    this.initializeSocket()
  },
  
  beforeUnmount() {
    if (this.socket) {
      this.socket.disconnect()
    }
  },
  
  methods: {
    initializeSocket() {
      this.socket = io('http://localhost:8000', {
        auth: { token: this.authToken }
      })
      
      this.socket.emit('conversation:join', this.conversationId)
      
      this.socket.on('message:new', (message) => {
        this.messages.push(message)
      })
    },
    
    sendMessage() {
      if (this.newMessage.trim()) {
        this.socket.emit('message:send', {
          conversationId: this.conversationId,
          text: this.newMessage.trim()
        })
        this.newMessage = ''
      }
    }
  }
}
</script>
```

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/talentbridge

# JWT
ACCESS_TOKEN_SECRET=your-secret-key

# Redis
REDIS_URL=redis://localhost:6379

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Server
PORT=8000
NODE_ENV=development
```

### Redis Configuration
The system uses Redis for:
- Notification caching (5 minutes TTL)
- User session management
- Rate limiting
- Performance optimization

## 🛠️ Development Setup

### Prerequisites
- Node.js (v16+)
- MongoDB (v5+)
- Redis (v6+)

### Installation
```bash
# Clone repository
git clone <repository-url>
cd talentbridge

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
```

### Testing Endpoints
```bash
# Start the server
npm run dev

# Test with curl
curl -X POST http://localhost:8000/api/v1/chat/conversations/start \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"targetUserId": "64f123abc456def789012345"}'
```

## 🐛 Troubleshooting

### Common Issues

#### Socket Connection Fails
```javascript
// Ensure token is valid and user exists
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
  // Check if token is expired or invalid
});
```

#### Messages Not Appearing
1. Check if user has joined the conversation room
2. Verify conversation permissions
3. Check database connections
4. Ensure proper error handling

#### Notifications Not Working
1. Verify Redis connection
2. Check notification service configuration
3. Ensure user has notification permissions
4. Check Socket.IO connection

#### Permission Denied Errors
1. Verify user role and permissions
2. Check role rules in `chat.roleRules.js`
3. Ensure proper authentication

### Debug Mode
```javascript
// Enable Socket.IO debugging
localStorage.debug = 'socket.io-client:socket';

// Enable verbose logging
process.env.DEBUG = 'socket.io:*';
```

## 📈 Performance Considerations

### Optimization Tips
1. **Use pagination** for message loading
2. **Implement message caching** for frequently accessed conversations
3. **Limit concurrent connections** per user
4. **Use Redis clustering** for high-scale deployments
5. **Implement rate limiting** on all endpoints
6. **Monitor Socket.IO room sizes**

### Scaling
- Use Socket.IO Redis adapter for multi-server deployments
- Implement horizontal scaling with load balancers
- Consider message queuing for high-volume notifications
- Use CDN for static assets and file uploads

## 🔒 Security Best Practices

1. **Always validate user permissions** before allowing operations
2. **Sanitize all user input** to prevent XSS attacks
3. **Use HTTPS in production**
4. **Implement proper CORS policies**
5. **Regular security audits** and dependency updates
6. **Monitor for suspicious activity**
7. **Implement rate limiting** on all endpoints

## 📝 API Response Formats

### Success Response
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "message": {
      "_id": "64f789abc123def456789012",
      "text": "Hello world",
      "sender": {
        "_id": "64f123abc456def789012345",
        "fullName": "John Doe",
        "role": "student"
      },
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  },
  "message": "Message sent successfully"
}
```

### Error Response
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Message text is required",
  "error": {
    "code": "VALIDATION_ERROR",
    "field": "text"
  }
}
```

## 🎯 Future Enhancements

### Planned Features
- [ ] File/image attachments
- [ ] Voice messages
- [ ] Video calling integration
- [ ] Message search functionality
- [ ] Message reactions/emojis
- [ ] Group conversations
- [ ] Message encryption
- [ ] Desktop/mobile push notifications
- [ ] Message threading
- [ ] Auto-translation support

### Contributing
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit pull request with detailed description

---

**Note**: This documentation covers the complete chat system as implemented in TalentBridge. For specific deployment instructions or customization, refer to the deployment guides or contact the development team.
