import { Router } from "express";
import { verifyJWT } from "../middlewares/Auth.middlewares.js";
import { 
  sendMessage, 
  getMessages, 
  markMessagesAsRead, 
  sendTypingIndicator,
  editMessage,
  deleteMessage
} from "../controllers/chat.message.controller.js";
import { 
  sendMessageSchema, 
  getMessagesSchema, 
  markReadSchema, 
  typingSchema,
  editMessageSchema,
  deleteMessageSchema,
  handleValidationErrors 
} from "../validators/chat.validators.js";

const router = Router();

// Apply JWT verification to all chat routes
router.use(verifyJWT);

/**
 * @swagger
 * /api/v1/chat/messages:
 *   post:
 *     summary: Send a message
 *     description: Send a text message to a conversation
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
 *               - conversationId
 *               - text
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation to send message to
 *                 example: "64f456def789abc123456789"
 *               text:
 *                 type: string
 *                 description: Message text content
 *                 maxLength: 5000
 *                 example: "Hello, how are you?"
 *               replyTo:
 *                 type: string
 *                 description: ID of message being replied to (optional)
 *                 example: "64f456def789abc123456790"
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
 *         description: Invalid request - missing required fields
 *       403:
 *         description: Access denied to conversation
 *       404:
 *         description: Conversation not found
 *       500:
 *         description: Internal server error
 */

// Send a message
router.post(
  "/",
  sendMessageSchema,
  handleValidationErrors,
  sendMessage
);

/**
 * @swagger
 * /api/v1/chat/all/{conversationId}:
 *   get:
 *     summary: Get messages from a conversation
 *     description: Retrieve paginated messages from a specific conversation
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
 *         example: "64f456def789abc123456789"
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
 *           maximum: 100
 *           default: 50
 *         description: Number of messages per page
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp (for infinite scroll)
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
 *                 data:
 *                   type: object
 *                   properties:
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
 *                               avatar:
 *                                 type: string
 *                           attachments:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 filename:
 *                                   type: string
 *                                 url:
 *                                   type: string
 *                                 fileType:
 *                                   type: string
 *                                 fileSize:
 *                                   type: number
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *                           isRead:
 *                             type: boolean
 *                           editedAt:
 *                             type: string
 *                             format: date-time
 *                             nullable: true
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
 *                         hasMore:
 *                           type: boolean
 *       403:
 *         description: Access denied - not a conversation participant
 *       404:
 *         description: Conversation not found
 *       401:
 *         description: Unauthorized
 */
// Get messages from a conversation
router.get(
  "/all/:conversationId", 
  getMessagesSchema, 
  handleValidationErrors,
  getMessages
);

/**
 * @swagger
 * /api/v1/chat/messages/{conversationId}/read:
 *   patch:
 *     summary: Mark messages as read
 *     description: Mark all or specific messages in a conversation as read
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
 *         example: "64f456def789abc123456789"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific message IDs to mark as read (optional - if not provided, marks all unread messages)
 *                 example: ["64f789abc123def456789012", "64f890abc123def456789013"]
 *               upToMessageId:
 *                 type: string
 *                 description: Mark all messages up to this message ID as read
 *                 example: "64f789abc123def456789012"
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     markedCount:
 *                       type: integer
 *                       description: Number of messages marked as read
 *                       example: 5
 *                 message:
 *                   type: string
 *                   example: "Messages marked as read successfully"
 *       403:
 *         description: Access denied - not a conversation participant
 *       404:
 *         description: Conversation not found
 *       401:
 *         description: Unauthorized
 */
// Mark messages as read
router.patch(
  "/messages/:conversationId/read", 
  markReadSchema, 
  handleValidationErrors,
  markMessagesAsRead
);

/**
 * @swagger
 * /api/v1/chat/typing:
 *   post:
 *     summary: Send typing indicator
 *     description: Send real-time typing indicator to other conversation participants
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
 *               - conversationId
 *               - isTyping
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: Conversation ID where typing indicator should be sent
 *                 example: "64f456def789abc123456789"
 *               isTyping:
 *                 type: boolean
 *                 description: Whether user is currently typing (true) or stopped typing (false)
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
 *       403:
 *         description: Access denied - not a conversation participant
 *       404:
 *         description: Conversation not found
 *       401:
 *         description: Unauthorized
 */
// Send typing indicator
router.post(
  "/typing", 
  typingSchema, 
  handleValidationErrors,
  sendTypingIndicator
);

// Edit a message
router.patch(
  "/messages/:messageId",
  editMessageSchema,
  handleValidationErrors,
  editMessage
);

// Delete a message
router.delete(
  "/messages/:messageId",
  deleteMessageSchema,
  handleValidationErrors,
  deleteMessage
);

export default router;
