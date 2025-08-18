import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    fullName: { 
      type: String, 
      required: true, 
      trim: true, 
      index: true 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { 
      type: String, 
      required: true, 
      minlength: 6 
    },
    phone: {
      type : String ,
      required : true,
    },

    role: {
      type: String,
      enum: ["user","student", "school", "employer", "admin"],
      default : "user"
    },

    onboardingStage: {
      type: String,
      enum: [
        "basic_info",
        "payment_pending",
        "kyc_pending",
        "awaiting_approval",
        "active",
      ],
      default: "basic_info",
    },
    
    // Payment Tracking
    subscription: {
      type : mongoose.Schema.Types.ObjectId,
      ref : "Subscription"
    },

    // Account Approval
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// ===== Password Hash =====
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ===== Compare Password =====
userSchema.methods.isPasswordCorrect = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ===== JWT Tokens =====
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      fullName: this.fullName,
      email: this.email,
      role: this.role,
      status: this.status,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ _id: this._id }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
  });
};

// ===== Indexes for Performance =====
// Note: email already has unique: true, fullName already has index: true
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, status: 1 }); // Compound index for filtering

export const User = mongoose.model("User", userSchema);
