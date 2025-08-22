import mongoose from "mongoose";

const instituteSchema = new mongoose.Schema({
    // Basic Information
   userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
   },
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        required: true,
        trim: true
    },
    picture : {
      type: String,
      default: "https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg",
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
    }],
    
    // Location Information
    location: {
            type: String,
            required: true,
            trim: true
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
    
    courses:[{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Course"
    }]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

export const TrainingInstitute = mongoose.model("TrainingInstitute", instituteSchema);

