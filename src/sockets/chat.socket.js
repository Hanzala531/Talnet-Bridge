import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

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
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Authentication error: Invalid token"));
    }
  });
  
  // Handle socket connections
  io.on("connection", (socket) => {
    console.log(`User ${socket.userInfo.fullName} connected via socket: ${socket.id}`);
    
    // Join user to their personal room
    socket.join(`user:${socket.userId}`);
    
    // Emit user online status
    socket.broadcast.emit("user:online", {
      userId: socket.userId,
      userInfo: socket.userInfo,
    });
    
    // Handle joining conversation rooms
    socket.on("conversation:join", (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }
        
        socket.join(`conv:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation: ${conversationId}`);
        
        // Notify others in the conversation that user is online
        socket.to(`conv:${conversationId}`).emit("user:joined", {
          conversationId,
          user: socket.userInfo,
        });
      } catch (error) {
        console.error("Error joining conversation:", error);
        socket.emit("error", { message: "Failed to join conversation" });
      }
    });
    
    // Handle leaving conversation rooms
    socket.on("conversation:leave", (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }
        
        socket.leave(`conv:${conversationId}`);
        console.log(`User ${socket.userId} left conversation: ${conversationId}`);
        
        // Notify others in the conversation that user left
        socket.to(`conv:${conversationId}`).emit("user:left", {
          conversationId,
          user: socket.userInfo,
        });
      } catch (error) {
        console.error("Error leaving conversation:", error);
        socket.emit("error", { message: "Failed to leave conversation" });
      }
    });
    
    // Handle typing indicators
    socket.on("typing:start", (data) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }
        
        // Broadcast typing indicator to others in the conversation
        socket.to(`conv:${conversationId}`).emit("typing:start", {
          conversationId,
          user: socket.userInfo,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error handling typing start:", error);
        socket.emit("error", { message: "Failed to send typing indicator" });
      }
    });
    
    socket.on("typing:stop", (data) => {
      try {
        const { conversationId } = data;
        
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }
        
        // Broadcast typing stop to others in the conversation
        socket.to(`conv:${conversationId}`).emit("typing:stop", {
          conversationId,
          user: socket.userInfo,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("Error handling typing stop:", error);
        socket.emit("error", { message: "Failed to send typing indicator" });
      }
    });
    
    // Handle direct message sending via socket (optional - messages can also be sent via HTTP)
    socket.on("message:send", async (data) => {
      try {
        const { conversationId, text, replyTo } = data;
        
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }
        
        if (!text || text.trim().length === 0) {
          socket.emit("error", { message: "Message text is required" });
          return;
        }
        
        // Note: In a production app, you'd validate access to the conversation
        // and save the message to the database here. For now, we'll just emit it.
        
        const messageData = {
          conversationId,
          text: text.trim(),
          sender: socket.userInfo,
          replyTo,
          timestamp: new Date(),
          _id: new Date().getTime().toString(), // Temporary ID
        };
        
        // Emit to conversation room
        io.to(`conv:${conversationId}`).emit("message:new", messageData);
        
        // Acknowledge to sender
        socket.emit("message:sent", {
          success: true,
          messageId: messageData._id,
        });
        
      } catch (error) {
        console.error("Error handling message send:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });
    
    // Handle message read receipts
    socket.on("message:read", (data) => {
      try {
        const { conversationId, messageIds } = data;
        
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
          return;
        }
        
        // Broadcast read receipt to conversation
        socket.to(`conv:${conversationId}`).emit("message:read", {
          conversationId,
          messageIds,
          userId: socket.userId,
          readAt: new Date(),
        });
      } catch (error) {
        console.error("Error handling message read:", error);
        socket.emit("error", { message: "Failed to mark messages as read" });
      }
    });
    
    // Handle getting online users in a conversation
    socket.on("conversation:getOnlineUsers", async (conversationId) => {
      try {
        if (!conversationId) {
          socket.emit("error", { message: "Conversation ID is required" });
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
        
        socket.emit("conversation:onlineUsers", {
          conversationId,
          onlineUsers: onlineUsers.filter((user, index, self) => 
            index === self.findIndex(u => u._id.toString() === user._id.toString())
          ), // Remove duplicates
        });
      } catch (error) {
        console.error("Error getting online users:", error);
        socket.emit("error", { message: "Failed to get online users" });
      }
    });
    
    // Handle disconnect
    socket.on("disconnect", (reason) => {
      console.log(`User ${socket.userInfo?.fullName} disconnected: ${reason}`);
      
      // Emit user offline status
      socket.broadcast.emit("user:offline", {
        userId: socket.userId,
        userInfo: socket.userInfo,
        reason,
      });
    });
    
    // Handle connection errors
    socket.on("error", (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });
  
  // Handle socket server errors
  io.on("error", (error) => {
    console.error("Socket.io server error:", error);
  });
  
  console.log("Chat socket handlers registered successfully");
}
