import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    company: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date
    },
    isCurrentlyWorking: {
        type: Boolean,
        default: false
    },
    description: String
});

const certificateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    issuingOrganization: {
        type: String,
        required: true
    },
    issueDate: {
        type: Date,
        required: true
    },
    expiryDate: Date,
    credentialUrl: String,
    credentialId: String
});

const educationSchema = new mongoose.Schema({
    institutionName: {
        type: String,
        required: true
    },
    qualification: {
        type: String,
        required: true,
        enum: ['Matric', 'Intermediate', 'Bachelors', 'Masters', 'PhD', 'Diploma', 'Certificate', 'Other']
    },
    fieldOfStudy: {
        type: String,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        // Allow null for ongoing education
    },
    grade: {
        type: String,
        required: true
    },
    isOngoing: {
        type: Boolean,
        default: false
    }
});

const kycDocumentSchema = new mongoose.Schema({
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
});

const studentSchema = new mongoose.Schema({
    // Basic Profile
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    profileVisibility: {
        type: Boolean,
        default: true
    },
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
    headline: {
        type: String,
        trim: true
    },
    aboutMe: {
        type: String,
        maxLength: 500
    },
    profilePhoto: {
        url: String,
        uploadedAt: Date
    },

    // Contact Information
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        match: [/^\d{10,15}$/, 'Please enter a valid phone number']
    },
    location: {
        city: String,
        country: String
    },

    // Professional Details
    skills: [{
        name: {
            type: String,
            required: true
        },
        proficiency: {
            type: String,
            enum: ['Beginner', 'Intermediate', 'Advanced'],
            default: 'Beginner'
        },
        yearsOfExperience: Number
    }],

    experience: [experienceSchema],
    certificates: [certificateSchema],

    // Educational Background
    education: [educationSchema],

    // Professional Preferences
    jobPreferences: {
        desiredRole: [String],
        preferredLocations: [String],
        expectedSalary: {
            min: Number,
            max: Number,
            currency: {
                type: String,
                default: 'PKR'
            }
        },
        jobType: [{
            type: String,
            enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote']
        }]
    },

    // Social & Portfolio
    socialLinks: {
        linkedin: String,
        github: String,
        portfolio: String
    },
    
    // Documents & Verification
    documents: {
        resume: {
            url: String,
            uploadedAt: Date
        },
        certificates: [{
            name: String,
            url: String,
            uploadedAt: Date
        }]
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
studentSchema.index({ "skills.name": 1 });
studentSchema.index({ "location.city": 1, "location.country": 1 });
studentSchema.index({ email: 1 });

// Virtuals
studentSchema.virtual('fullName').get(function() {
    return `${this.firstName} ${this.lastName}`;
});

// Pre-save middleware
studentSchema.pre('save', function(next) {
    if (this.isModified('education')) {
        for (const edu of this.education) {
            if (edu.endDate && edu.startDate > edu.endDate) {
                next(new Error('Education end date must be after start date'));
            }
        }
    }
    next();
});

export const Student = mongoose.model("Student", studentSchema);