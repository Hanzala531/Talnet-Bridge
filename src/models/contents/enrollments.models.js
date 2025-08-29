import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course", 
        required: true
    },
    enrollmentDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ["enrolled", "completed", "withdrawn", "suspended"],
        default: "enrolled"
    },    
    
}, { 
    timestamps: true 
});


export const Enrollment = mongoose.model("Enrollment", enrollmentSchema);
