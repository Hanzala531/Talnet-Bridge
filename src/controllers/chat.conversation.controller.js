import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { notFoundResponse, serverErrorResponse, successResponse } from "../utils/ApiResponse.js";
import { User } from "../models/index.js";
import { 
  findOrCreateDm, 
  listConversationsForUser, 
  getConversationWithAccess,
  getOnlineUsersInConversation
} from "../services/chat.service.js";

/**
 * @swagger
 * /api/v1/chat/conversations/start:
 *   post:
 *     summary: Start or fetch a DM conversation
 *     description: Create a new direct message conversation or return existing one between two users
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
 *               - targetUserId
 *             properties:
 *               targetUserId:
 *                 type: string
 *                 description: ID of the user to start conversation with
 *                 example: "64f123abc456def789012345"
 *     responses:
 *       200:
 *         description: Conversation retrieved or created successfully
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
 *                     conversation:
 *                       $ref: '#/components/schemas/ChatConversation'
 *                 message:
 *                   type: string
 *                   example: "Conversation retrieved successfully"
 *       400:
 *         description: Invalid user ID or cannot start conversation with self
 *       403:
 *         description: Role permissions don't allow this conversation
 *       404:
 *         description: Target user not found
 *       500:
 *         description: Internal server error
 */
export const startConversation = asyncHandler(async (req, res) => {
  const { targetUserId, isGroup = false, name } = req.body;
  const initiatorId = req.user._id;
  const initiatorRole = req.user.role;
  
  // For now, only support DM conversations
  if (isGroup) {
    return res.json(serverErrorResponse("Group conversations are not implemented yet"));
  }
  
  // Validate that initiator is not trying to message themselves
  if (initiatorId.toString() === targetUserId.toString()) {
    return res.json(notFoundResponse("Cannot start conversation with yourself"));
  }
  
  // Find target user and verify they exist
  const targetUser = await User.findById(targetUserId).select("fullName email role");
  if (!targetUser) {
    return res.json(notFoundResponse("Target user not found"));
  }
  
  // Create or find existing conversation
  const conversation = await findOrCreateDm({
    userA: initiatorId,
    roleA: initiatorRole,
    userB: targetUserId,
    roleB: targetUser.role,
  });
  
  // Get preview for the current user
  const conversationPreview = conversation.getPreviewForUser(initiatorId);
  
  res.json(
    successResponse(
      { conversation: conversationPreview },
      "Conversation retrieved successfully"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get user's conversations
 *     description: Retrieve paginated list of conversations for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     tags: [Chat]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of conversations to retrieve
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: Cursor for pagination (ISO date string or ObjectId)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Search query for conversation names or participant names
 *     responses:
 *       200:
 *         description: Conversations retrieved successfully
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
 *                   example: "Conversations retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChatConversationPreview'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
export const listConversations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { limit = 20, cursor, search } = req.query;
  
  const result = await listConversationsForUser({
    userId,
    limit: parseInt(limit),
    cursor,
    search,
  });
  
  res.json(
    successResponse(
      result,
      "Conversations retrieved successfully"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/conversations/{conversationId}:
 *   get:
 *     summary: Get conversation details
 *     description: Retrieve detailed information about a specific conversation
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
 *     responses:
 *       200:
 *         description: Conversation details retrieved successfully
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
 *                   example: "Conversation details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation:
 *                       $ref: '#/components/schemas/ChatConversation'
 *       400:
 *         description: Invalid conversation ID
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export const getConversationDetails = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  
  const conversation = await getConversationWithAccess(conversationId, userId);
  const conversationPreview = conversation.getPreviewForUser(userId);
  
  res.json(
    successResponse(
      { conversation: conversationPreview },
      "Conversation details retrieved successfully"
    )
  );
});

/**
 * @swagger
 * /api/v1/chat/conversations/{conversationId}/online:
 *   get:
 *     summary: Get online users in conversation
 *     description: Get list of users currently online in a specific conversation
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
 *     responses:
 *       200:
 *         description: Online users retrieved successfully
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
 *                     onlineUsers:
 *                       type: array
 *                       items:
 *                         type: string
 *                         description: User IDs of online users
 *                     count:
 *                       type: integer
 *                       description: Number of online users
 *                 message:
 *                   type: string
 *                   example: "Online users retrieved successfully"
 *       403:
 *         description: Access denied to this conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */
export const getOnlineUsers = asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user._id;
  
  // Verify access to conversation
  await getConversationWithAccess(conversationId, userId);
  
  // Get socket.io instance
  const io = req.app.get("io");
  if (!io) {
    return res.json(
      successResponse(
        { onlineUsers: [], count: 0 },
        "Socket.io not available, no online users detected"
      )
    );
  }
  
  // Get online users from socket rooms
  const onlineUsers = getOnlineUsersInConversation(conversationId, io);
  
  res.json(
    successResponse(
      { 
        onlineUsers,
        count: onlineUsers.length 
      },
      "Online users retrieved successfully"
    )
  );
});

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatConversation:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Conversation ID
 *         type:
 *           type: string
 *           enum: [dm, group]
 *           description: Type of conversation
 *         name:
 *           type: string
 *           description: Conversation name (for groups)
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 $ref: '#/components/schemas/UserBasic'
 *               role:
 *                 type: string
 *                 enum: [admin, student, school, employer]
 *         lastMessage:
 *           $ref: '#/components/schemas/ChatMessage'
 *         unreadCount:
 *           type: integer
 *           description: Number of unread messages for the current user
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *     
 *     ChatConversationPreview:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         type:
 *           type: string
 *           enum: [dm, group]
 *         name:
 *           type: string
 *         participantUsers:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserBasic'
 *         lastMessage:
 *           $ref: '#/components/schemas/ChatMessageBasic'
 *         unreadCount:
 *           type: integer
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     PaginationInfo:
 *       type: object
 *       properties:
 *         hasMore:
 *           type: boolean
 *           description: Whether there are more results available
 *         nextCursor:
 *           type: string
 *           description: Cursor for the next page
 *         limit:
 *           type: integer
 *           description: Current page limit
 *     
 *     UserBasic:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         fullName:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [admin, student, school, employer]
 */
