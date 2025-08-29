import { body, query, param, validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";
import mongoose from "mongoose";

// Validation for starting a conversation
export const startConversationSchema = [
  body("targetUserId")
    .notEmpty()
    .withMessage("Target user ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid target user ID format");
      }
      return true;
    }),
  
  body("isGroup")
    .optional()
    .isBoolean()
    .withMessage("isGroup must be a boolean"),
  
  body("name")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Group name must be between 1 and 100 characters")
    .custom((value, { req }) => {
      // If isGroup is true, name is required
      if (req.body.isGroup && (!value || value.length === 0)) {
        throw new Error("Group name is required for group conversations");
      }
      return true;
    }),
];

// Validation for sending a message
export const sendMessageSchema = [
  body("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid conversation ID format");
      }
      return true;
    }),
  
  body("text")
    .notEmpty()
    .withMessage("Message text is required")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message text must be between 1 and 5000 characters"),
  
  body("replyTo")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid reply message ID format");
      }
      return true;
    }),
];

// Validation for getting messages
export const getMessagesSchema = [
  param("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid conversation ID format");
      }
      return true;
    }),
  
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),
  
  query("cursor")
    .optional()
    .trim()
    .custom((value) => {
      // Cursor can be either a valid ObjectId or ISO date string
      if (value) {
        const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
        const isValidDate = !isNaN(Date.parse(value));
        
        if (!isValidObjectId && !isValidDate) {
          throw new Error("Cursor must be a valid ObjectId or ISO date string");
        }
      }
      return true;
    }),
];

// Validation for getting conversations
export const getConversationsSchema = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage("Limit must be between 1 and 50")
    .toInt(),
  
  query("cursor")
    .optional()
    .trim()
    .custom((value) => {
      if (value) {
        const isValidObjectId = mongoose.Types.ObjectId.isValid(value);
        const isValidDate = !isNaN(Date.parse(value));
        
        if (!isValidObjectId && !isValidDate) {
          throw new Error("Cursor must be a valid ObjectId or ISO date string");
        }
      }
      return true;
    }),
  
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage("Search query must be between 1 and 100 characters"),
];

// Validation for marking messages as read
export const markReadSchema = [
  param("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid conversation ID format");
      }
      return true;
    }),
  
  body("upToMessageId")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid message ID format");
      }
      return true;
    }),
];

// Validation for typing indicators
export const typingSchema = [
  body("conversationId")
    .notEmpty()
    .withMessage("Conversation ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid conversation ID format");
      }
      return true;
    }),
  
  body("isTyping")
    .isBoolean()
    .withMessage("isTyping must be a boolean"),
];

// Validation for editing messages
export const editMessageSchema = [
  param("messageId")
    .notEmpty()
    .withMessage("Message ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid message ID format");
      }
      return true;
    }),
  
  body("text")
    .notEmpty()
    .withMessage("Message text is required")
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message text must be between 1 and 5000 characters"),
];

// Validation for deleting messages
export const deleteMessageSchema = [
  param("messageId")
    .notEmpty()
    .withMessage("Message ID is required")
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid message ID format");
      }
      return true;
    }),
];

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  try {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(error => error.msg);
      throw new ApiError(400, `Validation failed: ${errorMessages.join(", ")}`);
    }
    
    next();
  } catch (error) {
    next(error);
  }
};
