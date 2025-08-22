import mongoose from "mongoose";

const studentSchema = new mongoose.Schema({
    userId : {
        type: mongoose.Schema.Types.ObjectId,
        ref : "User",
        required: true, 
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
        match: [/^https?:\/\/.+/, "Invalid URL"], 
    },
    certifications:[{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Certification' 
    }],
    kycVerification:{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'KYC'
    },
    skills:[{
        type :String,
        required : true,
        trim : true,
     }],
    experience:[{
        type : mongoose.Schema.Types.ObjectId,
        ref: 'Experience'
    }],
    gsceResult:[{
        subject: { type: String, required: true },
        marks: { type: String, required: true },
        grade: { type: String, required: true },
    }],
    enrollments:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Enrollment'
    }]
}, { timestamps: true });

// ===== Indexes for Performance =====
studentSchema.index({ userId: 1 });
studentSchema.index({ location: 1 });
studentSchema.index({ skills: 1 });
studentSchema.index({ createdAt: -1 });
studentSchema.index({ location: 1, createdAt: -1 });

export const Student = mongoose.model('Student' , studentSchema)
