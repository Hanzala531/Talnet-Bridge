import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, internalServer } from "../utils/ApiError.js";
import { serverErrorResponse, successResponse, notFoundResponse } from "../utils/ApiResponse.js";
import { ChatMessage } from "../models/contents/chat.message.models.js";
import { 
  appendMessage, 
  listMessages, 
  markRead, 
  getConversationWithAccess 
} from "../services/chat.service.js";

/**
 * @swagger
 * /api/v1/chat/messages:
 *   post:
 *     summary: Send a message
 *     description: Send a text message to a conversation
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - text
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation to send message to
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *               text:
 *                 type: string
 *                 maxLength: 5000
 *                 description: Message text content
 *                 example: "Hello, how are you?"
 *               replyTo:
 *                 type: string
 *                 description: ID of message being replied to
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b4"
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message sent successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       $ref: '#/components/schemas/ChatMessage'
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied to conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, text, replyTo } = req.body;
  const senderId = req.user._id;
  
  // Verify access to conversation
  await getConversationWithAccess(conversationId, senderId);
  
  // Validate that text is provided
  if (!text || !text.trim()) {
    return res.json(serverErrorResponse("Message text is required"));
  }
  
  // Get socket.io instance
  const io = req.app.get("io");
  
  // Create message
  const message = await appendMessage({
    conversationId,
    senderId,
    text: text.trim(),
    replyTo,
    io, // Pass Socket.IO instance for notifications
  });
  
  // Emit socket events if socket.io is available
  if (io) {
    // Emit to conversation room
    io.to(`conv:${conversationId}`).emit("message:new", {
      message,
      conversationId,
    });
    
    // Emit conversation update to participants' personal rooms
    const conversation = await getConversationWithAccess(conversationId, senderId);
    conversation.participants.forEach((participant) => {
      if (participant.user._id.toString() !== senderId.toString()) {
        io.to(`user:${participant.user._id}`).emit("conversation:update", {
          conversationId,
          lastMessage: message,
          unreadCount: conversation.getUnreadCount(participant.user._id),
        });
      }
    });
  }
  
  res.json(
    successResponse(
      { message },
      "Message sent successfully"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/messages/{conversationId}:
 *   get:
 *     summary: Get messages from a conversation
 *     description: Retrieve paginated messages from a specific conversation
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of messages to retrieve
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ISO date string or ObjectId)
 *     responses:
 *       200:
 *         description: Messages retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Messages retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     messages:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChatMessage'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       400:
 *         description: Invalid conversation ID or pagination parameters
 *       403:
 *         description: Access denied to conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export const getMessages = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { limit = 20, cursor } = req.query;
  const userId = req.user._id;
  
  // Verify access to conversation
  await getConversationWithAccess(conversationId, userId);
  
  const result = await listMessages({
    conversationId,
    limit: parseInt(limit),
    cursor,
  });
  
  res.json(
    successResponse(
      result,
      "Messages retrieved successfully"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/messages/{conversationId}/read:
 *   patch:
 *     summary: Mark messages as read
 *     description: Mark all or specific messages in a conversation as read
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               upToMessageId:
 *                 type: string
 *                 description: Mark messages as read up to this message ID (optional)
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b4"
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Messages marked as read"
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversationId:
 *                       type: string
 *                     unreadCount:
 *                       type: integer
 *                       description: New unread count for the user
 *       400:
 *         description: Invalid conversation ID or message ID
 *       403:
 *         description: Access denied to conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export const markMessagesAsRead = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { upToMessageId } = req.body;
  const userId = req.user._id;
  
  // Verify access to conversation
  await getConversationWithAccess(conversationId, userId);
  
  const conversation = await markRead({
    conversationId,
    userId,
    upToMessageId,
  });
  
  // Emit read receipt via socket if available
  const io = req.app.get("io");
  if (io) {
    io.to(`conv:${conversationId}`).emit("message:read", {
      conversationId,
      userId,
      upToMessageId,
    });
  }
  
  res.json(
    successResponse(
      {
        conversationId,
        unreadCount: conversation.getUnreadCount(userId),
      },
      "Messages marked as read"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/typing:
 *   post:
 *     summary: Send typing indicator
 *     description: Send typing start/stop indicator to other participants in a conversation
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - isTyping
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation
 *                 example: "60f7b3b3b3b3b3b3b3b3b3b3"
 *               isTyping:
 *                 type: boolean
 *                 description: Whether user is typing (true) or stopped typing (false)
 *                 example: true
 *     responses:
 *       200:
 *         description: Typing indicator sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Typing indicator sent"
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied to conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * /api/v1/chat/typing:
 *   post:
 *     summary: Send typing indicator
 *     description: Send real-time typing indicator to other conversation participants
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - isTyping
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Conversation ID where typing indicator should be sent
 *                 example: "64f456def789abc123456789"
 *               isTyping:
 *                 type: boolean
 *                 description: Whether user is currently typing
 *                 example: true
 *     responses:
 *       200:
 *         description: Typing indicator sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Typing indicator sent"
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied to conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export const sendTypingIndicator = asyncHandler(async (req, res) => {
  const { conversationId, isTyping } = req.body;
  const userId = req.user._id;
  const userInfo = {
    _id: userId,
    fullName: req.user.fullName,
    role: req.user.role,
  };
  
  // Verify access to conversation
  await getConversationWithAccess(conversationId, userId);
  
  // Emit typing indicator via socket if available
  const io = req.app.get("io");
  if (io) {
    io.to(`conv:${conversationId}`).emit("typing:indicator", {
      conversationId,
      user: userInfo,
      isTyping,
      timestamp: new Date(),
    });
  }
  
  res.json(
    successResponse(
      { isTyping },
      "Typing indicator sent"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/messages/{messageId}:
 *   patch:
 *     summary: Edit a message
 *     description: Edit the text content of an existing message
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to edit
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: New message text
 *                 maxLength: 5000
 *                 example: "Updated message content"
 *     responses:
 *       200:
 *         description: Message edited successfully
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
 *                     message:
 *                       $ref: '#/components/schemas/ChatMessage'
 *                 message:
 *                   type: string
 *                   example: "Message edited successfully"
 *       400:
 *         description: Validation error or message cannot be edited
 *       403:
 *         description: Not authorized to edit this message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
export const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { text } = req.body;
  const userId = req.user._id;
  
  // Validate text
  if (!text || !text.trim()) {
    return res.json(serverErrorResponse("Message text is required"));
  }
  
  // Find the message
  const message = await ChatMessage.findById(messageId).populate("sender", "fullName email role");
  
  if (!message) {
    return res.json(notFoundResponse("Message not found"));
  }
  
  // Check if user is the sender
  if (message.sender._id.toString() !== userId.toString()) {
    return res.json(serverErrorResponse("You can only edit your own messages"));
  }
  
  // Verify access to conversation
  await getConversationWithAccess(message.conversationId, userId);
  
  // Update message
  const sanitizedText = ChatMessage.sanitizeText(text);
  message.text = sanitizedText;
  message.edited = true;
  message.editedAt = new Date();
  
  await message.save();
  
  // Emit socket event for real-time update
  const io = req.app.get("io");
  if (io) {
    io.to(`conv:${message.conversationId}`).emit("message:edited", {
      messageId: message._id,
      text: sanitizedText,
      editedAt: message.editedAt,
      conversationId: message.conversationId,
    });
  }
  
  res.json(
    successResponse(
      { message },
      "Message edited successfully"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/messages/{messageId}:
 *   delete:
 *     summary: Delete a message
 *     description: Delete a message (soft delete - marks as deleted)
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     parameters:
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *         description: Message ID to delete
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Message deleted successfully"
 *       403:
 *         description: Not authorized to delete this message
 *       404:
 *         description: Message not found
 *       500:
 *         description: Internal server error
 */
export const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;
  const userRole = req.user.role;
  
  // Find the message
  const message = await ChatMessage.findById(messageId).populate("sender", "fullName email role");
  
  if (!message) {
    return res.json(notFoundResponse("Message not found"));
  }
  
  // Check if user is the sender or admin
  if (message.sender._id.toString() !== userId.toString() && userRole !== "admin") {
    return res.json(serverErrorResponse("You can only delete your own messages"));
  }
  
  // Verify access to conversation
  await getConversationWithAccess(message.conversationId, userId);
  
  // Soft delete - replace text with deleted message
  message.text = "[This message was deleted]";
  message.edited = true;
  message.editedAt = new Date();
  
  await message.save();
  
  // Emit socket event for real-time update
  const io = req.app.get("io");
  if (io) {
    io.to(`conv:${message.conversationId}`).emit("message:deleted", {
      messageId: message._id,
      conversationId: message.conversationId,
      deletedBy: userId,
    });
  }
  
  res.json(
    successResponse(
      null,
      "Message deleted successfully"
    )
  );
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Message ID
 *         conversationId:
 *           type: string
 *           description: ID of the conversation this message belongs to
 *         sender:
 *           $ref: '#/components/schemas/UserBasic'
 *         text:
 *           type: string
 *           description: Message text content
 *           maxLength: 5000
 *         readBy:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who have read this message
 *         edited:
 *           type: boolean
 *           description: Whether the message has been edited
 *         editedAt:
 *           type: string
 *           format: date-time
 *           description: When the message was last edited
 *         replyTo:
 *           type: string
 *           description: ID of the message this is replying to
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     ChatMessageBasic:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         text:
 *           type: string
 *         sender:
 *           $ref: '#/components/schemas/UserBasic'
 *         timestamp:
 *           type: string
 *           format: date-time
 *         edited:
 *           type: boolean
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatMessage:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Message ID
 *         conversationId:
 *           type: string
 *           description: ID of the conversation this message belongs to
 *         sender:
 *           $ref: '#/components/schemas/UserBasic'
 *         text:
 *           type: string
 *           description: Message text content
 *         readBy:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of user IDs who have read this message
 *         edited:
 *           type: boolean
 *           description: Whether the message has been edited
 *         editedAt:
 *           type: string
 *           format: date-time
 *           description: When the message was last edited
 *         replyTo:
 *           $ref: '#/components/schemas/ChatMessageBasic'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     ChatMessageBasic:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         text:
 *           type: string
 *         sender:
 *           $ref: '#/components/schemas/UserBasic'
 *         createdAt:
 *           type: string
 *           format: date-time
 */
