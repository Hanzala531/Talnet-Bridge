import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema({
    // Basic Information
    name: { 
        type: String,
        required: true,
        trim: true,
        index: true,
        maxLength: 100
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        index: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email']
    },
    contact: {
        type: String,
        required: true,
        trim: true,
        match: [/^\d{10,15}$/, 'Please enter a valid phone number']
    },
    about: {
        type: String,
        required: true,
        trim: true,
        maxLength: 1000
    },
    established: {
        type: Date,
        required: true
    },
    focusAreas: [{
        type: String,
        trim: true,
        enum: ['Technology', 'Healthcare', 'Business', 'Arts', 'Science', 'Engineering', 'Other']
    }],
    
    // Location Information
    location: {
        address: {
            type: String,
            required: true,
            trim: true
        },
        city: {
            type: String,
            required: true,
            trim: true
        },
        country: {
            type: String,
            required: true,
            trim: true,
            default: 'Pakistan'
        },
        coordinates: {
            latitude: Number,
            longitude: Number
        }
    },
    
    // Accreditation & Verification
    accreditation: {
        status: {
            type: String,
            enum: ['pending', 'verified', 'rejected'],
            default: 'pending'
        },
        certificates: [{
            name: String,
            issuedBy: String,
            validUntil: Date,
            documentUrl: String
        }],
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    
    // Owner/Admin Reference
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Statistics
    stats: {
        totalStudents: {
            type: Number,
            default: 0
        },
        totalCourses: {
            type: Number,
            default: 0
        },
        completionRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        }
    },
    
    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'suspended'],
        default: 'active'
    },
    
    // Social Links
    socialLinks: {
        website: String,
        linkedin: String,
        facebook: String
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
instituteSchema.index({ name: 1, location: 1 });
instituteSchema.index({ 'accreditation.status': 1 });
instituteSchema.index({ status: 1 });

export const TrainingInstitute = mongoose.model("TrainingInstitute", instituteSchema);

