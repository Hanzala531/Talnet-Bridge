import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatConversation",
      required: true,
      index: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000, // Reasonable limit for message length
      required: true, // Now text is required since we removed attachments
      validate: {
        validator: function (text) {
          return text && text.trim().length > 0;
        },
        message: "Message text is required and cannot be empty",
      },
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    edited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient pagination and conversation queries
chatMessageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
chatMessageSchema.index({ sender: 1, createdAt: -1 });
chatMessageSchema.index({ createdAt: -1 });

// Method to check if user has read this message
chatMessageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((readerId) => readerId.toString() === userId.toString());
};

// Method to mark as read by user
chatMessageSchema.methods.markReadBy = function (userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push(userId);
  }
};

// Method to get sanitized text (remove potential XSS)
chatMessageSchema.methods.getSanitizedText = function () {
  if (!this.text) return "";
  
  // Basic sanitization - remove potential script tags and control characters
  return this.text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
};

// Method to get message preview for notifications
chatMessageSchema.methods.getPreview = function (maxLength = 100) {
  const sanitized = this.getSanitizedText();
  return sanitized.length > maxLength
    ? sanitized.substring(0, maxLength) + "..."
    : sanitized;
};

// Static method to sanitize text input
chatMessageSchema.statics.sanitizeText = function (text) {
  if (!text) return "";
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
};

// Transform output to include virtuals
chatMessageSchema.set("toJSON", { virtuals: true });
chatMessageSchema.set("toObject", { virtuals: true });

export const ChatMessage = mongoose.model("ChatMessage", chatMessageSchema);
