import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
    // Recipient
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    // Notification Content
    title: {
        type: String,
        required: true,
        maxLength: 100
    },
    
    message: {
        type: String,
        required: true,
        maxLength: 500
    },
    
    // Notification Type
    type: {
        type: String,
        enum: [
            "course_enrollment",
            "course_completion",
            "certificate_issued",
            "payment_received",
            "payment_failed",
            "job_application",
            "interview_scheduled",
            "profile_verified",
            "message_received",
            "system_update",
            "security_alert",
            "subscription_expiry",
            "course_approved",
            "course_rejected"
        ],
        required: true
    },
    
    // Related Entity
    relatedEntity: {
        entityType: {
            type: String,
            enum: ["course", "job", "application", "payment", "user", "message"]
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId
        }
    },
    
    // Action URL (for clickable notifications)
    actionUrl: String,
    
    // Status
    status: {
        type: String,
        enum: ["unread", "read", "dismissed"],
        default: "unread"
    },
    
    // Priority
    priority: {
        type: String,
        enum: ["low", "normal", "high"],
        default: "normal"
    },
    
    // Delivery Channels
    channels: {
        inApp: {
            type: Boolean,
            default: true
        },
        email: {
            type: Boolean,
            default: false
        },
        sms: {
            type: Boolean,
            default: false
        },
        push: {
            type: Boolean,
            default: false
        }
    },
    
    // Delivery Status
    delivery: {
        inApp: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date
        },
        email: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            opened: { type: Boolean, default: false },
            openedAt: Date
        },
        sms: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date
        },
        push: {
            delivered: { type: Boolean, default: false },
            deliveredAt: Date,
            clicked: { type: Boolean, default: false },
            clickedAt: Date
        }
    },
    
    // Metadata
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    
    // Auto-expire (for temporary notifications)
    expiresAt: Date,
    
    // Read timestamp
    readAt: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ recipient: 1, status: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
notificationSchema.index({ "relatedEntity.entityType": 1, "relatedEntity.entityId": 1 });

// Virtual for checking if notification is expired
notificationSchema.virtual('isExpired').get(function() {
    return this.expiresAt && this.expiresAt < new Date();
});

// Method to mark as read
notificationSchema.methods.markAsRead = function() {
    this.status = 'read';
    this.readAt = new Date();
    return this.save();
};

// Static method to create notification
notificationSchema.statics.createNotification = async function(data) {
    const notification = new this(data);
    await notification.save();
    
    // Here you could trigger real-time notification via socket.io
    // socketIO.to(data.recipient).emit('new-notification', notification);
    
    return notification;
};

export const Notification = mongoose.model("Notification", notificationSchema);
