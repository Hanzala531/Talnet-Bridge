import { Router } from "express";
import { verifyJWT } from "../middlewares/Auth.middlewares.js";
import { upload } from "../middlewares/Multer.middlewares.js";
import { 
  sendMessage, 
  getMessages, 
  markMessagesAsRead, 
  sendTypingIndicator 
} from "../controllers/chat.message.controller.js";
import { 
  sendMessageSchema, 
  getMessagesSchema, 
  markReadSchema, 
  typingSchema,
  validateFileUploads,
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
 *     description: Send a text message with optional file attachments to a conversation
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *                 description: ID of the conversation to send message to
 *                 example: "64f456def789abc123456789"
 *               content:
 *                 type: string
 *                 description: Message content/text
 *                 example: "Hello, how are you?"
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Optional file attachments (max 5 files, 10MB each)
 *                 maxItems: 5
 *     responses:
 *       201:
 *         description: Message sent successfully
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
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "64f789abc123def456789012"
 *                         content:
 *                           type: string
 *                           example: "Hello, how are you?"
 *                         sender:
 *                           type: string
 *                           example: "64f123abc456def789012345"
 *                         conversationId:
 *                           type: string
 *                           example: "64f456def789abc123456789"
 *                         attachments:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               filename:
 *                                 type: string
 *                               url:
 *                                 type: string
 *                               fileType:
 *                                 type: string
 *                               fileSize:
 *                                 type: number
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *                         isRead:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Invalid request - missing required fields or file validation error
 *       403:
 *         description: Access denied - not a conversation participant
 *       404:
 *         description: Conversation not found
 *       413:
 *         description: File too large or too many attachments
 *       401:
 *         description: Unauthorized
 */
// Send a message (with optional file attachments)
router.post(
  "/messages", 
  upload.array("attachments", 5), // Allow up to 5 attachments
  validateFileUploads,
  sendMessageSchema, 
  handleValidationErrors,
  sendMessage
);

/**
 * @swagger
 * /api/v1/chat/messages/{conversationId}:
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
  "/messages/:conversationId", 
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

export default router;
