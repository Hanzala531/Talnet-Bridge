import mongoose from "mongoose";

const certificationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
}, 
  issuedBy: { 
    type: String, 
    required: true, 
    trim: true 
}, 
  issueDate: { 
    type: Date 
}, 
  certificateFile: {
     type: String 
    },
  extracted: { 
    type: Boolean, 
    default: false 
},
}, { timestamps: true });

// ===== Indexes for Performance =====
certificationSchema.index({ name: 1 });
certificationSchema.index({ issuedBy: 1 });
certificationSchema.index({ name: 1, issuedBy: 1 }); // Compound for uniqueness check
certificationSchema.index({ extracted: 1 });
certificationSchema.index({ createdAt: -1 });

export const Certification = mongoose.model("Certification", certificationSchema);
