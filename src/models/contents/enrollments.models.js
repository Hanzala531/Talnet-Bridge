import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course", 
        required: true
    },
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["enrolled", "in-progress", "completed", "withdrawn", "suspended"],
        default: "enrolled"
    },
    progress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    completionDate: {
        type: Date
    },
    certificateUrl: {
        type: String 
    },
    
    // Payment Information
    paymentStatus: {
        type: String,
        enum: ["pending", "paid", "failed", "refunded"],
        default: "pending"
    },
    
    paymentId: {
        type: String
    },
    
    // Learning Analytics
    timeSpent: {
        type: Number, // in minutes
        default: 0
    },
    
    lastAccessedAt: {
        type: Date,
        default: Date.now
    },
    
    // Assessment Results
    assessments: [{
        name: String,
        score: Number,
        maxScore: Number,
        completedAt: Date
    }]
}, { 
    timestamps: true 
});

// Compound indexes for efficient querying
enrollmentSchema.index({ learner: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ enrollmentDate: -1 });

export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
