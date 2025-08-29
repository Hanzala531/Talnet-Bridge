import jwt from "jsonwebtoken";
import { User } from "../models/index.js";
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
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");
      
      if (!token) {
        return next(new Error("No authentication token provided"));
      }
      
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      const user = await User.findById(decoded._id).select("_id fullName email role profilePicture");
      
      if (!user) {
        return next(new Error("User not found"));
      }
      
      socket.userId = user._id.toString();
      socket.userInfo = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
      };
      
      console.log(`User connected: ${user.fullName} (${user._id})`);
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });
  
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id} for user ${socket.userInfo.fullName}`);
    
    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);
    
    // Handle joining conversation rooms
    socket.on("conversation:join", async (conversationId, callback) => {
      try {
        // Validate conversation ID
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          if (callback) callback({ success: false, error: "Invalid conversation ID" });
          return;
        }
        
        // Verify user has access to this conversation
        await getConversationWithAccess(conversationId, socket.userId);
        
        socket.join(`conv:${conversationId}`);
        
        // Notify others in the conversation that user is online
        socket.to(`conv:${conversationId}`).emit("user:online", {
          userId: socket.userId,
          userInfo: socket.userInfo,
          conversationId,
        });
        
        if (callback) {
          callback({ 
            success: true, 
            message: "Joined conversation successfully" 
          });
        }
        
      } catch (error) {
        console.error("Error joining conversation:", error);
        if (callback) {
          callback({ 
            success: false, 
            error: error.message || "Failed to join conversation"
          });
        }
      }
    });
    
    // Handle leaving conversation rooms
    socket.on("conversation:leave", (conversationId, callback) => {
      try {
        socket.leave(`conv:${conversationId}`);
        
        // Notify others that user left
        socket.to(`conv:${conversationId}`).emit("user:offline", {
          userId: socket.userId,
          userInfo: socket.userInfo,
          conversationId,
        });
        
        if (callback) {
          callback({ 
            success: true, 
            message: "Left conversation successfully" 
          });
        }
        
      } catch (error) {
        console.error("Error leaving conversation:", error);
        if (callback) {
          callback({ 
            success: false, 
            error: "Failed to leave conversation"
          });
        }
      }
    });
    
    // Handle sending messages via socket
    socket.on("message:send", async (messageData, callback) => {
      try {
        const { conversationId, text, replyTo } = messageData;
        
        // Validate required fields
        if (!conversationId || !text?.trim()) {
          if (callback) {
            callback({ 
              success: false, 
              error: "Conversation ID and message text are required" 
            });
          }
          return;
        }
        
        // Validate conversation ID
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          if (callback) {
            callback({ 
              success: false, 
              error: "Invalid conversation ID" 
            });
          }
          return;
        }
        
        // Verify access to conversation
        await getConversationWithAccess(conversationId, socket.userId);
        
        // Create the message
        const message = await appendMessage({
          conversationId,
          senderId: socket.userId,
          text: text.trim(),
          replyTo,
          io, // Pass io instance for notifications
        });
        
        // Emit to conversation room (including sender)
        io.to(`conv:${conversationId}`).emit("message:new", {
          _id: message._id,
          conversationId: message.conversationId,
          senderId: message.sender._id,
          text: message.text,
          replyTo: message.replyTo,
          sender: message.sender,
          timestamp: message.createdAt,
          edited: message.edited,
          editedAt: message.editedAt,
        });
        
        // Acknowledge to sender
        if (callback) {
          callback({ 
            success: true, 
            messageId: message._id,
            message: 'Message sent successfully'
          });
        }
        
      } catch (error) {
        console.error("Error sending message:", error);
        socket.emit("error", { 
          message: "Failed to send message",
          event: "message:send", 
          error: error.message,
        });
        
        if (callback) {
          callback({ 
            success: false, 
            error: error.message || "Failed to send message"
          });
        }
      }
    });
    
    // Handle typing indicators
    socket.on("typing:start", async (conversationId) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          return;
        }
        
        // Verify access to conversation
        await getConversationWithAccess(conversationId, socket.userId);
        
        // Emit to others in the conversation
        socket.to(`conv:${conversationId}`).emit("typing:start", {
          userId: socket.userId,
          userInfo: socket.userInfo,
          conversationId,
          timestamp: new Date(),
        });
        
      } catch (error) {
        console.error("Error handling typing start:", error);
      }
    });
    
    socket.on("typing:stop", async (conversationId) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          return;
        }
        
        // Verify access to conversation
        await getConversationWithAccess(conversationId, socket.userId);
        
        // Emit to others in the conversation
        socket.to(`conv:${conversationId}`).emit("typing:stop", {
          userId: socket.userId,
          userInfo: socket.userInfo,
          conversationId,
          timestamp: new Date(),
        });
        
      } catch (error) {
        console.error("Error handling typing stop:", error);
      }
    });
    
    // Handle marking messages as read
    socket.on("messages:mark_read", async (data, callback) => {
      try {
        const { conversationId, upToMessageId } = data;
        
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          if (callback) {
            callback({ 
              success: false, 
              error: "Invalid conversation ID" 
            });
          }
          return;
        }
        
        // Verify access to conversation
        await getConversationWithAccess(conversationId, socket.userId);
        
        // Emit read receipt to others in conversation
        socket.to(`conv:${conversationId}`).emit("messages:read", {
          conversationId,
          userId: socket.userId,
          upToMessageId,
          timestamp: new Date(),
        });
        
        if (callback) {
          callback({ 
            success: true, 
            message: "Messages marked as read" 
          });
        }
        
      } catch (error) {
        console.error("Error marking messages as read:", error);
        if (callback) {
          callback({ 
            success: false, 
            error: error.message || "Failed to mark messages as read"
          });
        }
      }
    });
    
    // Handle getting online users in conversation
    socket.on("conversation:get_online_users", async (conversationId, callback) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          if (callback) {
            callback({ 
              success: false, 
              error: "Invalid conversation ID" 
            });
          }
          return;
        }
        
        // Verify access to conversation
        await getConversationWithAccess(conversationId, socket.userId);
        
        // Get users in the conversation room
        const room = io.sockets.adapter.rooms.get(`conv:${conversationId}`);
        const onlineUsers = [];
        
        if (room) {
          for (const socketId of room) {
            const userSocket = io.sockets.sockets.get(socketId);
            if (userSocket && userSocket.userId) {
              onlineUsers.push({
                userId: userSocket.userId,
                userInfo: userSocket.userInfo,
              });
            }
          }
        }
        
        if (callback) {
          callback({ 
            success: true, 
            onlineUsers,
            count: onlineUsers.length 
          });
        }
        
      } catch (error) {
        console.error("Error getting online users:", error);
        if (callback) {
          callback({ 
            success: false, 
            error: error.message || "Failed to get online users"
          });
        }
      }
    });
    
    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`User disconnected: ${socket.userInfo?.fullName} (${socket.userId}) - ${reason}`);
      
      // Notify all conversations that user went offline
      const rooms = Array.from(socket.rooms);
      rooms.forEach(room => {
        if (room.startsWith("conv:")) {
          socket.to(room).emit("user:offline", {
            userId: socket.userId,
            userInfo: socket.userInfo,
            conversationId: room.replace("conv:", ""),
            timestamp: new Date(),
          });
        }
      });
    });
    
    // Handle errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
}
