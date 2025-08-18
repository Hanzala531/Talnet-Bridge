import { body, query, param } from "express-validator";
import { ApiError } from "../../utils/ApiError.js";
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
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage("Message text cannot exceed 5000 characters"),
  
  body("replyTo")
    .optional()
    .custom((value) => {
      if (value && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error("Invalid reply message ID format");
      }
      return true;
    }),
  
  // Custom validation to ensure either text or attachments exist
  body().custom((body, { req }) => {
    const hasText = body.text && body.text.trim().length > 0;
    const hasFiles = req.files && req.files.length > 0;
    
    if (!hasText && !hasFiles) {
      throw new Error("Message must have either text content or attachments");
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

// File upload validation helper
export const validateFileUploads = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }
  
  const maxFileSize = parseInt(process.env.MAX_MESSAGE_SIZE_MB || "10") * 1024 * 1024; // Convert MB to bytes
  const allowedTypes = [
    "image/jpeg",
    "image/jpg", 
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain"
  ];
  
  // Check each file
  for (const file of req.files) {
    // Check file size
    if (file.size > maxFileSize) {
      return next(new ApiError(400, `File ${file.originalname} exceeds maximum size of ${process.env.MAX_MESSAGE_SIZE_MB || 10}MB`));
    }
    
    // Check file type
    if (!allowedTypes.includes(file.mimetype)) {
      return next(new ApiError(400, `File type ${file.mimetype} is not allowed for ${file.originalname}`));
    }
  }
  
  next();
};

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require("express-validator");
  
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
