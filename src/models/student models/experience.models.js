import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true }, // e.g. "Software Intern"
    company: { type: String, required: true }, // e.g. "Google"
    startDate: { type: Date, required: true },
    endDate: { type: Date }, // null => still working
    description: { type: String },
  },
  { timestamps: true }
);

// ===== Indexes for Performance =====
experienceSchema.index({ company: 1 });
experienceSchema.index({ title: 1 });
experienceSchema.index({ startDate: -1 });
experienceSchema.index({ endDate: 1 }); // For current job queries
experienceSchema.index({ company: 1, startDate: -1 }); // Compound for company timeline

export const Experience = mongoose.model("Experience", experienceSchema);
