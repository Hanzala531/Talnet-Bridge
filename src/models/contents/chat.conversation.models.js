import mongoose from "mongoose";

const chatConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        role: {
          type: String,
          required: true,
          enum: ["admin", "student", "school", "employer"],
        },
        _id: false, // Disable _id for subdocuments
      },
    ],
    isGroup: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      trim: true,
      // Required only for group conversations
      validate: {
        validator: function (name) {
          // If it's a group conversation, name is required
          if (this.isGroup && (!name || name.trim().length === 0)) {
            return false;
          }
          return true;
        },
        message: "Group conversations must have a name",
      },
    },
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    // Store unread count per user as a Map
    unread: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
chatConversationSchema.index({ "participants.user": 1, updatedAt: -1 });
chatConversationSchema.index({ updatedAt: -1 });
chatConversationSchema.index({ isGroup: 1 });

// Virtual to get conversation type
chatConversationSchema.virtual("type").get(function () {
  return this.isGroup ? "group" : "dm";
});

// Method to check if user is participant
chatConversationSchema.methods.hasParticipant = function (userId) {
  return this.participants.some(
    (participant) => participant.user.toString() === userId.toString()
  );
};

// Method to get unread count for a specific user
chatConversationSchema.methods.getUnreadCount = function (userId) {
  return this.unread.get(userId.toString()) || 0;
};

// Method to set unread count for a specific user
chatConversationSchema.methods.setUnreadCount = function (userId, count) {
  this.unread.set(userId.toString(), count);
};

// Method to increment unread count for all participants except sender
chatConversationSchema.methods.incrementUnreadForOthers = function (senderId) {
  this.participants.forEach((participant) => {
    if (participant.user.toString() !== senderId.toString()) {
      const currentCount = this.getUnreadCount(participant.user);
      this.setUnreadCount(participant.user, currentCount + 1);
    }
  });
};

// Method to get conversation preview for a specific user
chatConversationSchema.methods.getPreviewForUser = function (userId) {
  const unreadCount = this.getUnreadCount(userId);
  const otherParticipants = this.participants.filter(
    (p) => p.user.toString() !== userId.toString()
  );

  return {
    _id: this._id,
    type: this.type,
    name: this.name,
    participants: this.participants,
    otherParticipants,
    lastMessage: this.lastMessage,
    unreadCount,
    updatedAt: this.updatedAt,
    createdAt: this.createdAt,
  };
};

// Transform output to include virtuals
chatConversationSchema.set("toJSON", { virtuals: true });
chatConversationSchema.set("toObject", { virtuals: true });

export const ChatConversation = mongoose.model("ChatConversation", chatConversationSchema);
