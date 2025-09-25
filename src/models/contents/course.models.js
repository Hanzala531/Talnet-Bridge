import mongoose from "mongoose";

const courseSchema = new mongoose.Schema({
    // course image
    coverImage :{
        type : String,
        required : true
    },
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

    instructorPicture :{
        type : String,
        required :true
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
    },

    // Course Type 
    type: {
        type: String,
        required: true,
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
    
    // Training Provider Reference
    trainingProvider: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "TrainingInstitute",
    }, 

    // category
    category:{
        type:String,
        required:true
    },    
    
    // Course Status
    status: {
        type: String,
        enum: ["draft", "pending_approval", "approved", "rejected"],
        default: "active"
    },
    
    // Enrollment Limits
    maxEnrollments: {
        type: Number,
        // default: 50
    },
    
    currentEnrollments: {
        type: Number,
        default: 0
    },
    
    
    // Timestamps
}, {
    timestamps: true
});


export const Course = mongoose.model("Course", courseSchema);