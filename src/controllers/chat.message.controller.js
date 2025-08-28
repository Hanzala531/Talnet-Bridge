import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, internalServer } from "../utils/ApiError.js";
import { serverErrorResponse, successResponse } from "../utils/ApiResponse.js";
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
  
  // Create message
  const message = await appendMessage({
    conversationId,
    senderId,
    text: text.trim(),
    replyTo,
  });
  
  // Emit socket events if socket.io is available
  const io = req.app.get("io");
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
      {result}
      ,
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
    const eventName = isTyping ? "typing:start" : "typing:stop";
    io.to(`conv:${conversationId}`).emit(eventName, {
      conversationId,
      user: userInfo,
      timestamp: new Date(),
    });
  }
  
  res.json(
    successResponse(
      {
        conversationId,
        isTyping,
        user: userInfo,
      },
      "Typing indicator sent"
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
