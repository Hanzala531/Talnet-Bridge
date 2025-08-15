import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    // Subscription Plan
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubscriptionPlan",
        required: true
    },
    
    // Subscription Status
    status: {
        type: String,
        enum: ["active", "inactive", "cancelled", "expired", "pending"],
        default: "pending"
    },
    
    // Billing Information
    billing: {
        startDate: {
            type: Date,
            required: true
        },
        endDate: {
            type: Date,
            required: true
        },
        nextBillingDate: Date,
        lastBillingDate: Date,
        autoRenew: {
            type: Boolean,
            default: true
        }
    },
    
    // Payment Information
    payments: [{
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: "PKR"
        },
        paymentDate: {
            type: Date,
            default: Date.now
        },
        paymentMethod: {
            type: String,
            enum: ["stripe", "paypal", "bank_transfer", "cash"]
        },
        transactionId: String,
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending"
        }
    }],
    
    // Cancellation Information
    cancellation: {
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reason: String,
        refundAmount: Number,
        refundStatus: {
            type: String,
            enum: ["pending", "processed", "declined"]
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ 'billing.endDate': 1 });
subscriptionSchema.index({ 'billing.nextBillingDate': 1 });

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
    if (this.billing.endDate) {
        const now = new Date();
        const endDate = new Date(this.billing.endDate);
        const diffTime = endDate - now;
        return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }
    return 0;
});

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.billing.endDate > new Date();
};

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
