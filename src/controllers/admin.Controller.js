import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/contents/User.models.js";
import { badRequest, notFound, internalServer, ApiError, unauthorized } from "../utils/ApiError.js";
import { successResponse, createdResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import jwt from "jsonwebtoken";


// Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (userid) => {
  try {
    // console.log("Generating tokens for user ID:", userid);
    const user = await User.findById(userid);
    if (!user) {
      // console.error("User not found for ID:", userid);
      throw new ApiError(404, "User not found");
    }

    // Call the methods on the user instance
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    // console.error("Error in generateAccessAndRefreshTokens:", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};


// register user  
const registerAdmin = asyncHandler(async (req, res) => {
  try {
    const { fullName, email, phone, role , password } = req.body;

    // Check for required fields
    if (!fullName || !email || !phone || !password) {
      throw  badRequest("All fields are required");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw  badRequest("Invalid email format");
    }

    // Validate phone number 
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      throw  badRequest("Invalid phone number format");
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw  badRequest("User with this email already exists");
    }

    // Create new user
    const user = await User.create({
      fullName,
      email,
      phone,
      role : role || "admin",
      status : "approved",
      password
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Remove sensitive data from response
    const createdUser = user.toObject();
    delete createdUser.password;
    delete createdUser.refreshToken;

    return res
      .status(201)
      .json(createdResponse({ user: createdUser, accessToken }, "User registered successfully"));

  } catch (error) {throw  internalServer("Failed to register user");
  }
});


export {
    registerAdmin
}