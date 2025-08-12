import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    // Course Title
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 100
    },

    // Instructor Name
    instructor: {
        type: String,
        required: true,
        trim: true
    },

    // Course Duration (e.g., "10 hours", "4 weeks")
    duration: {
        type: String,
        required: true
    },

    // Course Price
    price: {
            type: Number,
            required: true,
            min: 0
        },

    // Language
    language: {
        type: String,
        required: true,
        enum: ["English", "Urdu", "Spanish", "French", "German", "Other"]
    },

    // Course Type 
    type: {
        type: String,
        required: true,
        enum: ["Online", "Offline", "Hybrid"]
    },

    // Course Objectives
    objectives: {
        type: [String], // Array of objectives
        required: true,
        validate: {
            validator: function (value) {
                return value.length > 0;
            },
            message: "At least one objective is required"
        }
    },

    // Course Description
    description: {
        type: String,
        required: true,
        maxLength: 1000
    },

    // Skills to Learn
    skills: {
        type: [String], // Array of skills
        required: true,
        validate: {
            validator: function (value) {
                return value.length > 0;
            },
            message: "At least one skill is required"
        }
    },
    
    // Enrollment Information
    enrollments:{
        type : mongoose.Schema.Types.ObjectId,
        ref : enrollments
    }

    // Timestamps
}, {
    timestamps: true
});

// Indexes for optimized queries
courseSchema.index({ title: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ language: 1 });

export const Course = mongoose.model("Course", courseSchema);