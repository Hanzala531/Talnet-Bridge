import { Router } from "express";
import { verifyJWT } from "../middlewares/Auth.middlewares.js";
import { 
  startConversation, 
  listConversations, 
  getConversationDetails,
  getOnlineUsers
} from "../controllers/chat.conversation.controller.js";
import { 
  startConversationSchema, 
  getConversationsSchema, 
  handleValidationErrors 
} from "../validators/chat.validators.js";

const router = Router();

// Apply JWT verification to all chat routes
router.use(verifyJWT);

/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Real-time chat functionality for direct messages between users
 */

/**
 * @swagger
 * /api/v1/chat/conversations/start:
 *   post:
 *     summary: Start or get existing conversation
 *     description: Creates a new conversation or returns existing conversation between two users
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
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
 *                 description: ID of the other user to start conversation with
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
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "64f456def789abc123456789"
 *                         participants:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["64f123abc456def789012345", "64f456def789abc123456789"]
 *                         lastMessage:
 *                           type: object
 *                           properties:
 *                             content:
 *                               type: string
 *                             timestamp:
 *                               type: string
 *                               format: date-time
 *                         isActive:
 *                           type: boolean
 *                           example: true
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Invalid participant ID or cannot start conversation with self
 *       401:
 *         description: Unauthorized
 */
// Start or get existing conversation
router.post(
  "/conversations/start", 
  startConversationSchema, 
  handleValidationErrors,
  startConversation
);

/**
 * @swagger
 * /api/v1/chat/conversations:
 *   get:
 *     summary: Get user's conversations list
 *     description: Retrieve paginated list of user's conversations with last message details
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of conversations per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by participant name
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversations:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           participant:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               fullName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                           lastMessage:
 *                             type: object
 *                             properties:
 *                               content:
 *                                 type: string
 *                               timestamp:
 *                                 type: string
 *                                 format: date-time
 *                               isRead:
 *                                 type: boolean
 *                           unreadCount:
 *                             type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
// Get user's conversations list
router.get(
  "/conversations", 
  getConversationsSchema, 
  handleValidationErrors,
  listConversations
);

/**
 * @swagger
 * /api/v1/chat/conversations/{conversationId}:
 *   get:
 *     summary: Get specific conversation details
 *     description: Retrieve conversation details with message history
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Conversation ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for message pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages per page
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     conversation:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                         participants:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               fullName:
 *                                 type: string
 *                               avatar:
 *                                 type: string
 *                     messages:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           content:
 *                             type: string
 *                           sender:
 *                             type: object
 *                             properties:
 *                               _id:
 *                                 type: string
 *                               fullName:
 *                                 type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           isRead:
 *                             type: boolean
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *       404:
 *         description: Conversation not found
 *       403:
 *         description: Access denied - not a participant
 *       401:
 *         description: Unauthorized
 */
// Get specific conversation details
router.get(
  "/conversations/:conversationId", 
  getConversationDetails
);

// Get online users in conversation
router.get(
  "/conversations/:conversationId/online",
  getOnlineUsers
);

export default router;
