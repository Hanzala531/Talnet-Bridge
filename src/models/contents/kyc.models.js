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
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        rejectionReason: String
    }],
    status: {
        type: String,
        enum: ["pending", "verified", "rejected"],
        default: "pending"
    }
}, {
    timestamps: true
});

export const KYC = mongoose.model("KYC", kycSchema);
