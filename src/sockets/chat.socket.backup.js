import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
// import { validateSocketEvent } from "../validators/chat.validators.js";
import { 
  findOrCreateDm, 
  getConversationWithAccess, 
  appendMessage 
} from "../services/chat.service.js";
import mongoose from "mongoose";

/**
 * Register chat-related socket events and handle authentication
 * @param {Object} io - Socket.io server instance
 */
export default function registerChatSockets(io) {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      // Extract token from query parameters or auth header
      const token = socket.handshake.auth?.token || 
                   socket.handshake.query?.token ||
                   socket.handshake.headers?.authorization?.replace("Bearer ", "");
      
      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }
      
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      
      // Find user and attach to socket
      const user = await User.findById(decoded._id).select("-password -refreshToken");
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }
      
      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userInfo = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      };
      
      next();
    } catch (error) {next(new Error("Authentication error: Invalid token"));
    }
  });
  
  // Handle socket connections
  io.on("connection", (socket) => {// Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Emit user online status
    socket.broadcast.emit("user:online", {
      userId: socket.userId,
      userInfo: socket.userInfo,
    });
    
    // Handle joining conversation rooms
    socket.on("conversation:join", async (data, callback) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) {
          const error = "Conversation ID is required";
          socket.emit("error", { 
            message: error,
            event: "conversation:join",
            timestamp: new Date().toISOString()
          });
          if (callback) callback({ success: false, message: error });
          return;
        }
        
        socket.join(`conv:${conversationId}`);// Notify others in the conversation that user is online
        socket.to(`conv:${conversationId}`).emit("user:joined", {
          conversationId,
          user: socket.userInfo,
          timestamp: new Date().toISOString()
        });
        
        // Send acknowledgment to the sender
        if (callback && typeof callback === 'function') {
          callback({ success: true, message: 'Joined conversation successfully' });
        }
      } catch (error) {socket.emit("error", { 
          message: "Failed to join conversation",
          event: "conversation:join",
          timestamp: new Date().toISOString()
        });
        
        if (callback && typeof callback === 'function') {
          callback({ success: false, message: 'Failed to join conversation' });
        }
      }
    });

    // Handle leaving conversation rooms
    socket.on("conversation:leave", async (data, callback) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) {
          const error = "Conversation ID is required";
          socket.emit("error", { 
            message: error,
            event: "conversation:leave",
            timestamp: new Date().toISOString()
          });
          if (callback) callback({ success: false, message: error });
          return;
        }
        
        socket.leave(`conv:${conversationId}`);// Notify others in the conversation that user left
        socket.to(`conv:${conversationId}`).emit("user:left", {
          conversationId,
          user: socket.userInfo,
          timestamp: new Date().toISOString()
        });
        
        // Send acknowledgment to the sender
        if (callback && typeof callback === 'function') {
          callback({ success: true, message: 'Left conversation successfully' });
        }
      } catch (error) {socket.emit("error", { 
          message: "Failed to leave conversation",
          event: "conversation:leave",
          timestamp: new Date().toISOString()
        });
        
        if (callback && typeof callback === 'function') {
          callback({ success: false, message: 'Failed to leave conversation' });
        }
      }
    });

    // Handle typing indicators
    socket.on("typing:start", (data, callback) => {
  // const validator = validateSocketEvent('typing:start');
      validator(data, socket, () => {
        try {
          const { conversationId } = data;
          
          // Broadcast typing indicator to others in the conversation
          socket.to(`conv:${conversationId}`).emit("typing:start", {
            conversationId,
            user: socket.userInfo,
            timestamp: new Date().toISOString(),
          });
          
          // Send acknowledgment to the sender
          if (callback && typeof callback === 'function') {
            callback({ success: true, message: 'Typing indicator sent' });
          }
        } catch (error) {socket.emit("error", { 
            message: "Failed to send typing indicator",
            event: "typing:start",
            timestamp: new Date().toISOString()
          });
          
          if (callback && typeof callback === 'function') {
            callback({ success: false, message: 'Failed to send typing indicator' });
          }
        }
      });
    });

    socket.on("typing:stop", (data, callback) => {
  // const validator = validateSocketEvent('typing:stop');
      validator(data, socket, () => {
        try {
          const { conversationId } = data;
          
          // Broadcast typing stop to others in the conversation
          socket.to(`conv:${conversationId}`).emit("typing:stop", {
            conversationId,
            user: socket.userInfo,
            timestamp: new Date().toISOString(),
          });
          
          // Send acknowledgment to the sender
          if (callback && typeof callback === 'function') {
            callback({ success: true, message: 'Typing indicator stopped' });
          }
        } catch (error) {socket.emit("error", { 
            message: "Failed to send typing indicator",
            event: "typing:stop",
            timestamp: new Date().toISOString()
          });
          
          if (callback && typeof callback === 'function') {
            callback({ success: false, message: 'Failed to send typing indicator' });
          }
        }
      });
    });
    
    // Handle direct message sending via socket (optional - messages can also be sent via HTTP)
    socket.on("message:send", async (data, callback) => {
  // const validator = validateSocketEvent('message:send');
      validator(data, socket, async () => {
        try {
          const { conversationId, text, replyTo } = data;
          
          // Verify conversation access
          const conversation = await getConversationWithAccess(conversationId, socket.userId);
          if (!conversation) {
            socket.emit("error", { 
              message: "Conversation not found or access denied",
              event: "message:send",
              timestamp: new Date().toISOString()
            });
            if (callback) callback({ success: false, message: 'Access denied' });
            return;
          }
          
          // Create message in database
          const messageData = {
            conversationId,
            senderId: socket.userId,
            text: text?.trim(),
            replyTo: replyTo || null
          };
          
          const message = await appendMessage(messageData);
          
          // Emit to conversation room (including sender)
          io.to(`conv:${conversationId}`).emit("message:new", {
            _id: message._id,
            conversationId: message.conversationId,
            senderId: message.senderId,
            text: message.text,
            replyTo: message.replyTo,
            sender: socket.userInfo,
            timestamp: message.createdAt,
            attachments: message.attachments || []
          });
          
          // Acknowledge to sender
          if (callback && typeof callback === 'function') {
            callback({ 
              success: true, 
              messageId: message._id,
              message: 'Message sent successfully'
            });
          }
          
        } catch (error) {socket.emit("error", { 
            message: "Failed to send message",
            event: "message:send", 
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          if (callback && typeof callback === 'function') {
            callback({ success: false, message: 'Failed to send message' });
          }
        }
      });
    });

    // Handle message read receipts
    socket.on("message:read", async (data, callback) => {
  // const validator = validateSocketEvent('message:read');
      validator(data, socket, async () => {
        try {
          const { conversationId, messageId } = data;
          
          // Verify conversation access
          const conversation = await getConversationWithAccess(conversationId, socket.userId);
          if (!conversation) {
            socket.emit("error", { 
              message: "Conversation not found or access denied",
              event: "message:read",
              timestamp: new Date().toISOString()
            });
            if (callback) callback({ success: false, message: 'Access denied' });
            return;
          }
          
          // Update read status in database (implementation would go here)
          // For now, just emit the read receipt
          
          // Notify others in the conversation
          socket.to(`conv:${conversationId}`).emit("message:read", {
            conversationId,
            messageId,
            readBy: socket.userInfo,
            timestamp: new Date().toISOString()
          });
          
          // Acknowledge to sender
          if (callback && typeof callback === 'function') {
            callback({ 
              success: true, 
              message: 'Message marked as read'
            });
          }
          
        } catch (error) {socket.emit("error", { 
            message: "Failed to mark message as read",
            event: "message:read",
            error: error.message,
            timestamp: new Date().toISOString()
          });
          
          if (callback && typeof callback === 'function') {
            callback({ success: false, message: 'Failed to mark message as read' });
          }
        }
      });
    });
    
    // Handle getting online users in a conversation
    socket.on("conversation:getOnlineUsers", async (data, callback) => {
      try {
        const { conversationId } = data || {};
        
        if (!conversationId) {
          socket.emit("error", { 
            message: "Conversation ID is required",
            event: "conversation:getOnlineUsers",
            timestamp: new Date().toISOString()
          });
          if (callback) callback({ success: false, message: 'Conversation ID required' });
          return;
        }
        
        const room = io.sockets.adapter.rooms.get(`conv:${conversationId}`);
        const onlineUsers = [];
        
        if (room) {
          for (const socketId of room) {
            const userSocket = io.sockets.sockets.get(socketId);
            if (userSocket && userSocket.userInfo) {
              onlineUsers.push(userSocket.userInfo);
            }
          }
        }
        
        const uniqueUsers = onlineUsers.filter((user, index, self) => 
          index === self.findIndex(u => u._id.toString() === user._id.toString())
        );
        
        socket.emit("conversation:onlineUsers", {
          conversationId,
          onlineUsers: uniqueUsers,
        });
        
        if (callback && typeof callback === 'function') {
          callback({ 
            success: true, 
            onlineUsers: uniqueUsers 
          });
        }
      } catch (error) {socket.emit("error", { 
          message: "Failed to get online users",
          event: "conversation:getOnlineUsers",
          timestamp: new Date().toISOString()
        });
        
        if (callback && typeof callback === 'function') {
          callback({ success: false, message: 'Failed to get online users' });
        }
      }
    });

    // Handle disconnect
    socket.on("disconnect", (reason) => {// Emit user offline status
      socket.broadcast.emit("user:offline", {
        userId: socket.userId,
        userInfo: socket.userInfo,
        reason,
        timestamp: new Date().toISOString()
      });
    });
    
    // Handle connection errors
    socket.on("error", (error) => {});
  });
  
  // Handle socket server errors
  io.on("error", (error) => {});}



