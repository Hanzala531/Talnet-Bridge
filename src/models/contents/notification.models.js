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
            "course_rejected",
            "course_created",
            "kyc_update",
            "job_posted"
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
    
    // Delivery Status (Web App Only)
    delivery: {
        inApp: {
            delivered: { type: Boolean, default: true },
            deliveredAt: { type: Date, default: Date.now }
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

// Static method to create notification (Web App Only)
notificationSchema.statics.createNotification = async function(data) {
    const notification = new this({
        ...data,
        delivery: {
            inApp: {
                delivered: true,
                deliveredAt: new Date()
            }
        }
    });
    await notification.save();
    
    // Real-time notification delivery via socket.io for web app
    // socketIO.to(data.recipient).emit('new-notification', notification);
    
    return notification;
};

export const Notification = mongoose.model("Notification", notificationSchema);
