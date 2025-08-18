import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["image", "pdf", "doc", "file"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    mimeType: {
      type: String,
      required: true,
    },
  },
  {
    _id: false, // Disable _id for subdocuments
  }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
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
      // Custom validator to ensure either text or attachments exist
      validate: {
        validator: function (text) {
          // Either text should exist or attachments should exist
          return (
            (text && text.trim().length > 0) ||
            (this.attachments && this.attachments.length > 0)
          );
        },
        message: "Message must have either text content or attachments",
      },
    },
    attachments: [attachmentSchema],
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
      ref: "Message",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient pagination and conversation queries
messageSchema.index({ conversationId: 1, createdAt: -1, _id: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ createdAt: -1 });

// Virtual to check if message has attachments
messageSchema.virtual("hasAttachments").get(function () {
  return this.attachments && this.attachments.length > 0;
});

// Virtual to get message type
messageSchema.virtual("type").get(function () {
  if (this.hasAttachments && !this.text) {
    return "media";
  } else if (this.hasAttachments && this.text) {
    return "mixed";
  } else {
    return "text";
  }
});

// Method to check if user has read this message
messageSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((readerId) => readerId.toString() === userId.toString());
};

// Method to mark as read by user
messageSchema.methods.markReadBy = function (userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push(userId);
  }
};

// Method to get sanitized text (remove potential XSS)
messageSchema.methods.getSanitizedText = function () {
  if (!this.text) return "";
  
  // Basic sanitization - remove potential script tags and control characters
  return this.text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
};

// Method to get message preview for notifications
messageSchema.methods.getPreview = function (maxLength = 100) {
  if (this.text) {
    const sanitized = this.getSanitizedText();
    return sanitized.length > maxLength
      ? sanitized.substring(0, maxLength) + "..."
      : sanitized;
  } else if (this.hasAttachments) {
    const attachmentCount = this.attachments.length;
    const firstAttachment = this.attachments[0];
    
    if (attachmentCount === 1) {
      return `📎 ${firstAttachment.name}`;
    } else {
      return `📎 ${firstAttachment.name} and ${attachmentCount - 1} more`;
    }
  }
  
  return "Message";
};

// Static method to sanitize text input
messageSchema.statics.sanitizeText = function (text) {
  if (!text) return "";
  
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim();
};

// Transform output to include virtuals
messageSchema.set("toJSON", { virtuals: true });
messageSchema.set("toObject", { virtuals: true });

export const Message = mongoose.model("Message", messageSchema);
