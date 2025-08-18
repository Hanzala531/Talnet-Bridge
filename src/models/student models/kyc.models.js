import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    documents: [{
        docType: {
            type: String,
            required: true,
            enum: ['CNIC', 'studentId', 'transcript', 'degree', 'other']
        },
        docUrl: {
            type: String,
            required: true
        }
    }],
    status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending"
    },
    verifiedAt: Date,
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    rejectionReason: String
}, {
    timestamps: true
});

// ===== Indexes for Performance =====
// Note: userId already has unique: true
kycSchema.index({ status: 1 });
kycSchema.index({ verifiedBy: 1 });
kycSchema.index({ createdAt: -1 });
kycSchema.index({ status: 1, createdAt: -1 }); // Compound for admin filtering

export const KYC = mongoose.model("KYC", kycSchema);
