import { Router } from "express";
import { verifyJWT } from "../middlewares/Auth.middlewares.js";
import { 
  startConversation, 
  listConversations, 
  getConversationDetails 
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

// Start or get existing conversation
router.post(
  "/conversations/start", 
  startConversationSchema, 
  handleValidationErrors,
  startConversation
);

// Get user's conversations list
router.get(
  "/conversations", 
  getConversationsSchema, 
  handleValidationErrors,
  listConversations
);

// Get specific conversation details
router.get(
  "/conversations/:conversationId", 
  getConversationDetails
);

export default router;
