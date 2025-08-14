import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    
    // Personal Information
    personalInfo: {
        firstName: {
            type: String,
            required: true,
            trim: true
        },
        lastName: {
            type: String,
            required: true,
            trim: true
        },
        dateOfBirth: {
            type: Date,
            required: true
        },
        nationality: {
            type: String,
            required: true,
            trim: true
        },
        cnicNumber: {
            type: String,
            required: true,
            unique: true,
            match: [/^\d{5}-\d{7}-\d{1}$/, 'Please enter a valid CNIC number (XXXXX-XXXXXXX-X)']
        }
    },
    
    // Address Information
    address: {
        street: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        province: {
            type: String,
            required: true,
            trim: true
        },
        postalCode: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'Pakistan'
        }
    },
    
    // Document Uploads
    documents: {
        cnicFront: {
            url: {
                type: String,
                required: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            },
            verified: {
                type: Boolean,
                default: false
            }
        },
        cnicBack: {
            url: {
                type: String,
                required: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            },
            verified: {
                type: Boolean,
                default: false
            }
        },
        selfie: {
            url: {
                type: String,
                required: true
            },
            uploadedAt: {
                type: Date,
                default: Date.now
            },
            verified: {
                type: Boolean,
                default: false
            }
        },
        additionalDocuments: [{
            type: {
                type: String,
                enum: ['passport', 'driving_license', 'utility_bill', 'bank_statement', 'other']
            },
            url: String,
            uploadedAt: {
                type: Date,
                default: Date.now
            },
            verified: {
                type: Boolean,
                default: false
            }
        }]
    },
    
    // Verification Status
    verificationStatus: {
        type: String,
        enum: ['pending', 'in_review', 'approved', 'rejected', 'requires_resubmission'],
        default: 'pending'
    },
    
    // Verification Details
    verificationDetails: {
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reviewedAt: Date,
        rejectionReason: String,
        notes: String
    },
    
    // Auto-verification Results (OCR/AI)
    autoVerification: {
        cnicDataExtracted: {
            name: String,
            fatherName: String,
            cnicNumber: String,
            dateOfBirth: Date,
            issueDate: Date,
            expiryDate: Date
        },
        faceMatch: {
            score: Number,
            passed: Boolean
        },
        documentQuality: {
            score: Number,
            passed: Boolean
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
kycSchema.virtual('fullName').get(function() {
    return `${this.personalInfo.firstName} ${this.personalInfo.lastName}`;
});

export const KYC = mongoose.model("KYC", kycSchema);
