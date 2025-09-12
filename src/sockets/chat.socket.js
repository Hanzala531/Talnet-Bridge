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
  console.log(`[${new Date().toISOString()}] 🔌 Initializing Chat Socket Handlers`);

  // Middleware for socket authentication
  io.use(async (socket, next) => {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] 🔐 Socket authentication attempt - Socket ID: ${socket.id}`);

    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        console.warn(`[${new Date().toISOString()}] ❌ No authentication token provided - Socket ID: ${socket.id}`);
        return next(new Error("No authentication token provided"));
      }

      console.log(`[${new Date().toISOString()}] 🔍 Verifying JWT token - Socket ID: ${socket.id}`);
      const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

      console.log(`[${new Date().toISOString()}] 👤 Looking up user: ${decoded._id} - Socket ID: ${socket.id}`);
      const user = await User.findById(decoded._id).select("_id fullName email role profilePicture");

      if (!user) {
        console.warn(`[${new Date().toISOString()}] ❌ User not found: ${decoded._id} - Socket ID: ${socket.id}`);
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

      const authTime = Date.now() - startTime;
      console.log(`[${new Date().toISOString()}] ✅ User authenticated successfully: ${user.fullName} (${user._id}) - Socket ID: ${socket.id} - Auth Time: ${authTime}ms`);
      next();
    } catch (error) {
      const authTime = Date.now() - startTime;
      console.error(`[${new Date().toISOString()}] ❌ Socket authentication failed - Socket ID: ${socket.id} - Error: ${error.message} - Time: ${authTime}ms`);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    const connectionTime = new Date().toISOString();
    console.log(`[${connectionTime}] 🔗 Socket connected: ${socket.id} for user ${socket.userInfo.fullName} (${socket.userId})`);

    // Join user to their personal room for notifications
    socket.join(`user:${socket.userId}`);
    console.log(`[${connectionTime}] 🏠 User ${socket.userInfo.fullName} joined personal room: user:${socket.userId}`);

    // Handle joining conversation rooms
    socket.on("conversation:join", async (conversationId, callback) => {
      const startTime = Date.now();
      const eventTime = new Date().toISOString();
      console.log(`[${eventTime}] 📥 conversation:join - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Socket: ${socket.id}`);

      try {
        // Validate conversation ID
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn(`[${eventTime}] ❌ Invalid conversation ID: ${conversationId} - User: ${socket.userInfo.fullName}`);
          if (callback) callback({ success: false, error: "Invalid conversation ID" });
          return;
        }

        console.log(`[${eventTime}] 🔍 Verifying access to conversation: ${conversationId} - User: ${socket.userInfo.fullName}`);
        // Verify user has access to this conversation
        await getConversationWithAccess(conversationId, socket.userId);

        socket.join(`conv:${conversationId}`);
        console.log(`[${eventTime}] ✅ User ${socket.userInfo.fullName} joined conversation room: conv:${conversationId}`);

        // Notify others in the conversation that user is online
        socket.to(`conv:${conversationId}`).emit("user:online", {
          userId: socket.userId,
          userInfo: socket.userInfo,
          conversationId,
        });
        console.log(`[${eventTime}] 📢 Notified other users that ${socket.userInfo.fullName} is online in conversation: ${conversationId}`);

        const joinTime = Date.now() - startTime;
        console.log(`[${eventTime}] ✅ conversation:join completed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Time: ${joinTime}ms`);

        if (callback) {
          callback({
            success: true,
            message: "Joined conversation successfully"
          });
        }

      } catch (error) {
        const joinTime = Date.now() - startTime;
        console.error(`[${eventTime}] ❌ conversation:join failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message} - Time: ${joinTime}ms`);
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
      const eventTime = new Date().toISOString();
      console.log(`[${eventTime}] 📤 conversation:leave - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Socket: ${socket.id}`);

      try {
        socket.leave(`conv:${conversationId}`);
        console.log(`[${eventTime}] ✅ User ${socket.userInfo.fullName} left conversation room: conv:${conversationId}`);

        // Notify others that user left
        socket.to(`conv:${conversationId}`).emit("user:offline", {
          userId: socket.userId,
          userInfo: socket.userInfo,
          conversationId,
        });
        console.log(`[${eventTime}] 📢 Notified other users that ${socket.userInfo.fullName} went offline in conversation: ${conversationId}`);

        if (callback) {
          callback({
            success: true,
            message: "Left conversation successfully"
          });
        }

      } catch (error) {
        console.error(`[${eventTime}] ❌ conversation:leave failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message}`);
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
      const startTime = Date.now();
      const eventTime = new Date().toISOString();
      const { conversationId, text, replyTo } = messageData;

      console.log(`[${eventTime}] 💬 message:send - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Text Length: ${text?.length || 0} - Reply To: ${replyTo || 'none'} - Socket: ${socket.id}`);

      try {
        // Validate required fields
        if (!conversationId || !text?.trim()) {
          console.warn(`[${eventTime}] ❌ Missing required fields - Conversation: ${conversationId}, Text: ${!!text?.trim()}`);
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
          console.warn(`[${eventTime}] ❌ Invalid conversation ID: ${conversationId}`);
          if (callback) {
            callback({
              success: false,
              error: "Invalid conversation ID"
            });
          }
          return;
        }

        console.log(`[${eventTime}] 🔍 Verifying access to conversation: ${conversationId} for message send`);
        // Verify access to conversation
        await getConversationWithAccess(conversationId, socket.userId);

        console.log(`[${eventTime}] 📝 Creating message in database - User: ${socket.userInfo.fullName} - Conversation: ${conversationId}`);
        // Create the message
        const message = await appendMessage({
          conversationId,
          senderId: socket.userId,
          text: text.trim(),
          replyTo,
          io, // Pass io instance for notifications
        });

        console.log(`[${eventTime}] 📤 Broadcasting message to conversation room: conv:${conversationId} - Message ID: ${message._id}`);
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

        const sendTime = Date.now() - startTime;
        console.log(`[${eventTime}] ✅ Message sent successfully - User: ${socket.userInfo.fullName} - Message ID: ${message._id} - Conversation: ${conversationId} - Time: ${sendTime}ms`);

        // Acknowledge to sender
        if (callback) {
          callback({
            success: true,
            messageId: message._id,
            message: 'Message sent successfully'
          });
        }

      } catch (error) {
        const sendTime = Date.now() - startTime;
        console.error(`[${eventTime}] ❌ message:send failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message} - Time: ${sendTime}ms`);

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
      const eventTime = new Date().toISOString();
      console.log(`[${eventTime}] ⌨️ typing:start - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Socket: ${socket.id}`);

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn(`[${eventTime}] ❌ Invalid conversation ID for typing: ${conversationId}`);
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

        console.log(`[${eventTime}] ✅ Typing indicator broadcasted - User: ${socket.userInfo.fullName} - Conversation: ${conversationId}`);

      } catch (error) {
        console.error(`[${eventTime}] ❌ typing:start failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message}`);
      }
    });

    socket.on("typing:stop", async (conversationId) => {
      const eventTime = new Date().toISOString();
      console.log(`[${eventTime}] ⌨️ typing:stop - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Socket: ${socket.id}`);

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn(`[${eventTime}] ❌ Invalid conversation ID for typing stop: ${conversationId}`);
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

        console.log(`[${eventTime}] ✅ Typing stop indicator broadcasted - User: ${socket.userInfo.fullName} - Conversation: ${conversationId}`);

      } catch (error) {
        console.error(`[${eventTime}] ❌ typing:stop failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message}`);
      }
    });

    // Handle marking messages as read
    socket.on("messages:mark_read", async (data, callback) => {
      const startTime = Date.now();
      const eventTime = new Date().toISOString();
      const { conversationId, upToMessageId } = data;

      console.log(`[${eventTime}] 👁️ messages:mark_read - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Up To Message: ${upToMessageId || 'latest'} - Socket: ${socket.id}`);

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn(`[${eventTime}] ❌ Invalid conversation ID: ${conversationId}`);
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

        console.log(`[${eventTime}] 📢 Broadcasting read receipt to conversation: ${conversationId}`);
        // Emit read receipt to others in conversation
        socket.to(`conv:${conversationId}`).emit("messages:read", {
          conversationId,
          userId: socket.userId,
          upToMessageId,
          timestamp: new Date(),
        });

        const readTime = Date.now() - startTime;
        console.log(`[${eventTime}] ✅ Messages marked as read - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Time: ${readTime}ms`);

        if (callback) {
          callback({
            success: true,
            message: "Messages marked as read"
          });
        }

      } catch (error) {
        const readTime = Date.now() - startTime;
        console.error(`[${eventTime}] ❌ messages:mark_read failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message} - Time: ${readTime}ms`);
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
      const startTime = Date.now();
      const eventTime = new Date().toISOString();

      console.log(`[${eventTime}] 👥 conversation:get_online_users - User: ${socket.userInfo.fullName} (${socket.userId}) - Conversation: ${conversationId} - Socket: ${socket.id}`);

      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          console.warn(`[${eventTime}] ❌ Invalid conversation ID: ${conversationId}`);
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

        const onlineCount = onlineUsers.length;
        const onlineTime = Date.now() - startTime;
        console.log(`[${eventTime}] ✅ Online users retrieved - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Online Count: ${onlineCount} - Time: ${onlineTime}ms`);

        if (callback) {
          callback({
            success: true,
            onlineUsers,
            count: onlineCount
          });
        }

      } catch (error) {
        const onlineTime = Date.now() - startTime;
        console.error(`[${eventTime}] ❌ conversation:get_online_users failed - User: ${socket.userInfo.fullName} - Conversation: ${conversationId} - Error: ${error.message} - Time: ${onlineTime}ms`);
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
      const disconnectTime = new Date().toISOString();
      console.log(`[${disconnectTime}] 🔌 User disconnected: ${socket.userInfo?.fullName} (${socket.userId}) - Reason: ${reason} - Socket: ${socket.id}`);

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
          console.log(`[${disconnectTime}] 📢 Notified conversation ${room.replace("conv:", "")} that ${socket.userInfo?.fullName} went offline`);
        }
      });
    });

    // Handle errors
    socket.on("error", (error) => {
      const errorTime = new Date().toISOString();
      console.error(`[${errorTime}] ⚠️ Socket error for user ${socket.userId}:`, error);
    });
  });

  console.log(`[${new Date().toISOString()}] 🎉 Chat Socket Handlers Registered Successfully`);
}
