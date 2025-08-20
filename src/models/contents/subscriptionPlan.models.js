import mongoose from "mongoose";

const subscriptionPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        enum: ["learner", "employer", "trainingInstitue"]
    },
    
    displayName: {
        type: String,
        required: true
    },
    
    description: {
        type: String,
        required: true
    },
    
    price: {
        type: Number,
        required: true,
        min: 0
    },
    
    currency: {
        type: String,
        default: "usd"
    },
    
    billingCycle: {
        type: String,
        enum: ["onetime", "monthly"],
        required: true
    },

    features:{
        type: [String],
        required:true,

    },
    
    isAmountPayed:{
        type:Boolean,
        default:false
    },

    stripePriceId: {
        type: String,
        required: true
    },
    
    stripeProductId: {
        type: String,
        required: true
    },
    
    isActive: {
        type: Boolean,
        default: true
    },
    
    sortOrder: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
// subscriptionPlanSchema.index({ name: 1 });
subscriptionPlanSchema.index({ isActive: 1 });
subscriptionPlanSchema.index({ sortOrder: 1 });

export const SubscriptionPlan = mongoose.model("SubscriptionPlan", subscriptionPlanSchema);
