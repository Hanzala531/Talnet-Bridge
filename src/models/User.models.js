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
      enum: ["learner", "training_provider", "employer", "admin"],
      required: true,
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

    // KYC Fields (multi-document)
    kyc: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "KYC"
    },
    // Accreditation (for training providers)
    accreditation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Accreditation"
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

export const User = mongoose.model("User", userSchema);
