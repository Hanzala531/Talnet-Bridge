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
    enrollmentType: {
      type: String,
      enum: ["Full-time", "Part-time", "Internship", "Contract"],
      required: true,
    },
    salary: {
      min: { type: Number, default: 0 },
      max: { type: Number },
      currency: { type: String, default: "PKR" }, // You can make this configurable
    },
    jobDescription: {
      type: String,
      required: true,
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The company or training provider
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    postedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Job", jobSchema);
