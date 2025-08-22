import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    fullLegalName: {
        type: String,
        required: true,
        trim: true
    },
    dateOfBirth: {
        type: Date,
        required: true
    },
    nationalInsuranceNumber: {
        type: String,
        trim: true
    },
    documents: [
        {
            docType: {
                type: String,
                required: true,
                enum: ['addressProof', 'govtId', 'electricityBill', 'bankStatement', 'educationalCertificates', 'other']
            },
            docUrl: {
                type: String,
                required: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    educationalQualifications: [
        {
            level: {
                type: String,
                required: true,
                enum: [
                    "High School Diploma/Gcse",
                    "A-Levels",
                    "Bachelors Degree",
                    "Masters Degree",
                    "Professional Diploma",
                    "Trade Certificate",
                    "Other"
                ]
            }
        }
    ],
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
kycSchema.index({ status: 1 });
kycSchema.index({ verifiedBy: 1 });
kycSchema.index({ createdAt: -1 });
kycSchema.index({ status: 1, createdAt: -1 });

export const KYC = mongoose.model("KYC", kycSchema);
