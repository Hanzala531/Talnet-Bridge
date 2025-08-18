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

// Send a message (with optional file attachments)
router.post(
  "/messages", 
  upload.array("attachments", 5), // Allow up to 5 attachments
  validateFileUploads,
  sendMessageSchema, 
  handleValidationErrors,
  sendMessage
);

// Get messages from a conversation
router.get(
  "/messages/:conversationId", 
  getMessagesSchema, 
  handleValidationErrors,
  getMessages
);

// Mark messages as read
router.patch(
  "/messages/:conversationId/read", 
  markReadSchema, 
  handleValidationErrors,
  markMessagesAsRead
);

// Send typing indicator
router.post(
  "/typing", 
  typingSchema, 
  handleValidationErrors,
  sendTypingIndicator
);

export default router;
