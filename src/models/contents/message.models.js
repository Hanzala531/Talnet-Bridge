import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    // Conversation participants
    participants: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        role: {
            type: String,
            enum: ["student", "training_provider", "employer", "admin"],
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        lastSeen: Date
    }],
    
    // Message Type
    conversationType: {
        type: String,
        enum: ["direct", "group", "support", "course_inquiry"],
        default: "direct"
    },
    
    // Related Entity (if applicable)
    relatedEntity: {
        entityType: {
            type: String,
            enum: ["course", "job", "application", "support_ticket"]
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    
    // Messages
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        content: {
            text: String,
            attachments: [{
                type: {
                    type: String,
                    enum: ["image", "document", "video", "audio"]
                },
                url: String,
                filename: String,
                size: Number
            }]
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        readBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            },
            readAt: {
                type: Date,
                default: Date.now
            }
        }],
        messageType: {
            type: String,
            enum: ["text", "image", "document", "system"],
            default: "text"
        },
        isEdited: {
            type: Boolean,
            default: false
        },
        editedAt: Date
    }],
    
    // Conversation Status
    status: {
        type: String,
        enum: ["active", "archived", "blocked"],
        default: "active"
    },
    
    // Last Activity
    lastActivity: {
        type: Date,
        default: Date.now
    },
    
    // Subject/Title (for support tickets, course inquiries)
    subject: String,
    
    // Priority (for support conversations)
    priority: {
        type: String,
        enum: ["low", "normal", "high", "urgent"],
        default: "normal"
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
// messageSchema.index({ "participants.user": 1 });
// messageSchema.index({ conversationType: 1 });
// messageSchema.index({ lastActivity: -1 });
// messageSchema.index({ "relatedEntity.entityType": 1, "relatedEntity.entityId": 1 });

// Virtual for unread message count per user
messageSchema.virtual('unreadCount').get(function() {
    // This would be calculated based on user context in the controller
    return 0;
});

// Method to mark messages as read
messageSchema.methods.markAsRead = function(userId) {
    this.messages.forEach(message => {
        const readEntry = message.readBy.find(r => r.user.toString() === userId.toString());
        if (!readEntry) {
            message.readBy.push({ user: userId, readAt: new Date() });
        }
    });
    return this.save();
};

export const Message = mongoose.model("Message", messageSchema);
