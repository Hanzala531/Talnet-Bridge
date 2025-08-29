import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    jobTitle: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    employmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract" ],
      required: true,
    },
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number },
      currency: { type: String, default: "usd" },
    },
    jobDescription: {
      type: String,
      required: true,
      maxLength: 2000
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    benefits: 
      {
        type: String,
        trim: true,
      },
    
    // Skills Required
    skillsRequired: [{
      skill: {
        type: String,
        required: true
      },
      proficiency: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced"],
        default: "Intermediate"
      }
    }],
    
    // Experience Requirements
    experienceRequired: {
      min: { type: Number, default: 0 },
      max: { type: Number }
    },
    
    // Education Requirements
    educationRequired: {
      type: String,
      enum: ["Matric", "Intermediate", "Bachelors", "Masters", "PhD", "Diploma", "Certificate", "Any"],
      default: "Any"
    },
    
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer", // Reference to Employer profile, not User directly
      required: true,
    },
    
    // Job Status
    status: {
      type: String,
      enum: ["draft", "active", "paused", "closed", "filled"],
      default: "draft"
    },
    
    // Job Category
    category: {
      type: String,
      enum: ["Technology", "Healthcare", "Business", "Arts", "Science", "Engineering", "Other"],
      required: true
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Matched candidates for this job (≥95% skill match)
    matchedCandidates: [{
      student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student"
      },
      matchPercentage: {
        type: Number,
        min: 0,
        max: 100
      },
      matchedAt: {
        type: Date,
        default: Date.now
      }
    }],
  },
  { timestamps: true }
);


export const Job = mongoose.model("Job", jobSchema);
