import mongoose from "mongoose";

const accreditationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    
    trainingInstituteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TrainingInstitute",
        required: true
    },
    
    // Accreditation Details
    accreditationType: {
        type: String,
        enum: ["national", "international", "professional", "industry_specific"],
        required: true
    },
    
    accreditingBody: {
        name: {
            type: String,
            required: true
        },
        country: {
            type: String,
            required: true
        },
        website: String,
        contactEmail: String
    },
    
    // Certificate Information
    certificate: {
        certificateNumber: {
            type: String,
            required: true,
            unique: true
        },
        issuedDate: {
            type: Date,
            required: true
        },
        expiryDate: {
            type: Date,
            required: true
        },
        scope: {
            type: String,
            required: true 
        },
        documentUrl: {
            type: String,
            required: true
        }
    },
    
    // Verification Status
    verificationStatus: {
        type: String,
        enum: ["pending", "in_review", "verified", "rejected", "expired"],
        default: "pending"
    },
    
    // Verification Process
    verification: {
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        verifiedAt: Date,
        verificationMethod: {
            type: String,
            enum: ["manual", "automated", "third_party"],
            default: "admin"
        },
        verificationNotes: String,
        rejectionReason: String
    },
    
    // Auto-verification attempts
    autoVerification: {
        attempts: [{
            attemptedAt: {
                type: Date,
                default: Date.now
            },
            result: {
                type: String,
                enum: ["success", "failed", "pending"]
            },
            details: String
        }],
        lastAttempt: Date,
        nextRetry: Date
    },
    
    // Compliance and Standards
    compliance: {
        standards: [{
            name: String,
            version: String,
            compliantSince: Date
        }],
        audits: [{
            auditDate: Date,
            auditor: String,
            result: {
                type: String,
                enum: ["passed", "failed", "conditional"]
            },
            reportUrl: String,
            nextAuditDate: Date
        }]
    },
    
    // Associated Programs/Courses
    authorizedPrograms: [{
        programName: String,
        level: {
            type: String,
            enum: ["certificate", "diploma", "degree", "professional"]
        },
        validUntil: Date
    }],
    
    // Status tracking
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Renewal Information
    renewal: {
        isRenewable: {
            type: Boolean,
            default: true
        },
        renewalDue: Date,
        renewalFee: Number,
        renewalStatus: {
            type: String,
            enum: ["not_due", "due", "in_progress", "completed", "overdue"]
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
accreditationSchema.index({ userId: 1 });
accreditationSchema.index({ trainingInstituteId: 1 });
accreditationSchema.index({ verificationStatus: 1 });
accreditationSchema.index({ 'certificate.expiryDate': 1 });
accreditationSchema.index({ 'certificate.certificateNumber': 1 });

// Virtual for checking if accreditation is expired
accreditationSchema.virtual('isExpired').get(function() {
    return this.certificate.expiryDate < new Date();
});

// Virtual for days until expiry
accreditationSchema.virtual('daysUntilExpiry').get(function() {
    const now = new Date();
    const expiryDate = new Date(this.certificate.expiryDate);
    const diffTime = expiryDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to check if accreditation is valid
accreditationSchema.methods.isValid = function() {
    return this.verificationStatus === 'verified' && 
           this.isActive && 
           !this.isExpired;
};

// Pre-save middleware to update renewal status
accreditationSchema.pre('save', function(next) {
    const now = new Date();
    const expiryDate = new Date(this.certificate.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) {
        this.renewal.renewalStatus = 'overdue';
    } else if (daysUntilExpiry <= 30) {
        this.renewal.renewalStatus = 'due';
    } else {
        this.renewal.renewalStatus = 'not_due';
    }
    
    next();
});

export const Accreditation = mongoose.model("Accreditation", accreditationSchema);
