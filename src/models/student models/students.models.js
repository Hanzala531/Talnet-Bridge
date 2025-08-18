import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref : "User",
        required: true, // student MUST be linked to a user
    },
    bio : {
        type : String,
        trim: true,
    },
    location: {
             type: String
    },
    website : {
        type: String,
        match: [/^https?:\/\/.+/, "Invalid URL"], // ensure valid URLs
    },
    certifications:[{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Certification' // singular name is convention
    }],
    kycVerification:[{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'KYC'
    }],
    skills:[{
        type :String,
        required : true,
        trim : true
    }],
    experience:[{
        type : mongoose.Schema.Types.ObjectId,
        ref: 'Experience'
    }],
    gsceResult:[{
        subject: { type: String, required: true },
        grade: { type: String, required: true },
    }]
}, { timestamps: true }); // adds createdAt, updatedAt

// ===== Indexes for Performance =====
studentSchema.index({ userId: 1 }); // For quick user lookup
studentSchema.index({ location: 1 }); // For location-based searches
studentSchema.index({ skills: 1 }); // For skill-based searches
studentSchema.index({ createdAt: -1 });
studentSchema.index({ location: 1, createdAt: -1 }); // Compound for filtering

export const Student = mongoose.model('Student' , studentSchema)
