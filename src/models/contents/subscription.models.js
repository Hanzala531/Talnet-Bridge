import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubscriptionPlan",
        required: true
    },
    status: {
        type: String,
        enum: ["pending", "active", "expired", "cancelled"],
        default: "pending"
    },
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
        },
        // Add these fields for Stripe integrationz
        stripeCustomerId: String,
        stripePaymentMethodId: String,
        stripeSubscriptionId: String // Optional: for future Stripe Subscription API migration
    },
    payments: [{
        amount: Number,
        currency: String,
        paymentDate: Date,
        paymentMethod: String,
        transactionId: String,
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"]
        }
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1 });
subscriptionSchema.index({ "billing.nextBillingDate": 1 });
subscriptionSchema.index({ "billing.autoRenew": 1 });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
