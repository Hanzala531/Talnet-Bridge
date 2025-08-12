import mongoose from "mongoose";

const enrollmentSchema = new mongoose.Schema({
    learner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    course: {
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
        enum: ["enrolled", "in-progress", "completed", "withdrawn"],
        default: "enrolled"
    },
    progress: {
        type: Number,
        default: 0
    },
    completionDate: {
        type: Date
    },
    certificateUrl: {
        type: String 
    }
}, { timestamps: true });

export default mongoose.model("Enrollment", enrollmentSchema);
