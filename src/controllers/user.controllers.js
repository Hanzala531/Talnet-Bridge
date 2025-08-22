/**
 * USER CONTROLLERS
 * 
 * This module contains all user-related controller functions for authentication
 * and user management in the TalentBridge platform.
 * 
 * Features:
 * - User registration with role-based access
 * - User authentication (login/logout)
 * - JWT token generation and management
 * - Password hashing and validation
 * - Cookie-based authentication
 * 
 * Dependencies:
 * - bcrypt for password hashing
 * - jsonwebtoken for JWT tokens
 * - express-validator for input validation
 */

import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/contents/User.models.js";
import { badRequest, notFound, internalServer, ApiError, unauthorized } from "../utils/ApiError.js";
import { successResponse, createdResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import jwt from "jsonwebtoken";


/**
 * Generate access and refresh tokens for a user
 * 
 * @function generateAccessAndRefreshTokens
 * @param {string} userid - MongoDB ObjectId of the user
 * @returns {Promise<Object>} Object containing accessToken and refreshToken
 * @throws {ApiError} When user not found or token generation fails
 * 
 * @example
 * const tokens = await generateAccessAndRefreshTokens("64f123abc456def789");
 * // Returns: { accessToken: "jwt...", refreshToken: "jwt..." }
 */

// Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (userid) => {
  try {
    console.log("Generating tokens for user ID:", userid);
    const user = await User.findById(userid);
    if (!user) {
      console.error("User not found for ID:", userid);
      throw new ApiError(404, "User not found");
    }

    // Call the methods on the user instance
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    console.log("Generated access token:", accessToken ? "Yes" : "No");
    console.log("Generated refresh token:", refreshToken ? "Yes" : "No");

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error in generateAccessAndRefreshTokens:", error);
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

/**
 * Register a new user
 * 
 * @function registerUser
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.fullName - User's full name (3-50 characters)
 * @param {string} req.body.email - User's email address (must be unique)
 * @param {string} req.body.phone - User's phone number (10-15 digits)
 * @param {string} req.body.password - User's password (min 6 characters)
 * @param {string} req.body.role - User role: "user", "student", "school", "employer", "admin"
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Created user data with access token
 * @throws {ApiError} When validation fails or user already exists
 * 
 * @example
 * POST /api/v1/users/register
 * Body: {
 *   "fullName": "John Doe",
 *   "email": "john@example.com", 
 *   "phone": "1234567890",
 *   "password": "securepass123",
 *   "role": "student"
 * }
 * 
 * Response: {
 *   "success": true,
 *   "statusCode": 201,
 *   "data": {
 *     "user": {
 *       "_id": "64f123...",
 *       "fullName": "John Doe",
 *       "email": "john@example.com",
 *       "phone": "1234567890",
 *       "role": "student",
 *       "onboardingStage": "basic_info",
 *       "status": "pending"
 *     },
 *     "accessToken": "eyJhbGciOiJIUzI1NiIs..."
 *   },
 *   "message": "User registered successfully"
 * }
 */
// register user  
const registerUser = asyncHandler(async (req, res) => {
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
      role,
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

/**
 * Login user with email and password
 * 
 * @function loginUser
 * @param {Object} req - Express request object
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} User data with access token and cookies
 * @throws {ApiError} When credentials are invalid or user not found
 * 
 * @example
 * POST /api/v1/users/login
 * Body: {
 *   "email": "john@example.com",
 *   "password": "securepass123"
 * }
 * 
 * Response: {
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "user": {
 *       "_id": "64f123...",
 *       "fullName": "John Doe",
 *       "email": "john@example.com",
 *       "role": "student"
 *     },
 *     "accessToken": "eyJhbGciOiJIUzI1NiIs..."
 *   },
 *   "message": "User logged in successfully"
 * }
 * 
 * Cookies Set:
 * - accessToken: JWT access token (httpOnly)
 * - refreshToken: JWT refresh token (httpOnly)
 */
// Login User Controller
const loginUser = asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      throw  badRequest("Email and password are required");
    }

    // Find user and select password
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw  notFound("User not found");
    }

    // Validate password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
      throw  badRequest("Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Remove sensitive data
    const loggedInUser = user.toObject();
    delete loggedInUser.password;
    delete loggedInUser.refreshToken;

    // Set cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        successResponse(
          { user: loggedInUser, accessToken },
          "User logged in successfully"
        )
      );

  } catch (error) {throw  internalServer("Failed to login");
  }
});

/**
 * Logout user and clear authentication tokens
 * 
 * @function logoutUser
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated user object (from middleware)
 * @param {string} req.user._id - User's MongoDB ObjectId
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Success message
 * @throws {ApiError} When user not found or logout fails
 * 
 * @example
 * POST /api/v1/users/logout
 * Headers: { Authorization: "Bearer <accessToken>" }
 * 
 * Response: {
 *   "success": true,
 *   "statusCode": 200,
 *   "data": null,
 *   "message": "User logged out successfully"
 * }
 * 
 * Actions:
 * - Removes refreshToken from database
 * - Clears accessToken and refreshToken cookies
 * - Invalidates user session
 */
// logout user
const logoutUser = asyncHandler(async (req, res) => {
    try {
        // Get user from request object 
        const userId = req.user?._id;

        if (!userId) {
            throw  badRequest("User not found");
        }

        // Remove refresh token from database
        await User.findByIdAndUpdate(
            userId,
            {
                $set: {
                    refreshToken: null
                }
            },
            {
                new: true
            }
        );

        // Clear cookies
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };

        // Remove both access and refresh tokens from cookies
        return res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(successResponse(null, "User logged out successfully"));

    } catch (error) {throw  internalServer("Failed to logout");
    }
});

// Get all users controller
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    // Query params: page, limit, search, role
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    const { search, role } = req.query;

    // Build filter
    const filter = {};
    if (role) filter.role = role;
    if (search) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }

    // Projection - exclude sensitive fields
    const projection = { password: 0, refreshToken: 0 };

    // Total count for pagination
    const total = await User.countDocuments(filter);

    // Fetch users
    const users = await User.find(filter, projection)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalPages = Math.ceil(total / limit);

    return res.status(200).json(
      successResponse(
        {
          users,
          pagination: {
            total,
            page,
            limit,
            totalPages,
          },
        },
        'Users fetched successfully'
      )
    );
  } catch (error) {throw internalServer('Failed to fetch users');
  }
});

// Add user profile picture controller
const addPicture = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
     const imageLocalPath = req.file?.path || req.files?.[0]?.path;
    // Check if the image is uploaded
    if (!imageLocalPath) {
      throw badRequest("Image is not uploaded");
    }

    // Upload to cloudinary
    const imageUrl = await uploadOnCloudinary(imageLocalPath);

    if (!imageUrl) {
      throw internalServer(500, "Error in uploading the image");
    }

    // Update user profile with image URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profilePicture: imageUrl.secure_url } },
      { new: true, projection: { password: 0, refreshToken: 0 } }
    );

    if (!updatedUser) {
      throw notFound("User not found");
    }

    return res.status(200).json(
      successResponse(
        { user: updatedUser, imageUrl },
        "Profile picture updated successfully"
      )
    );
  } catch (error) {
    // Handle errors
    if (error instanceof ApiError) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      statusCode: 500,
      message: "Failed to update profile picture",
    });
  }
});

// Refresh Access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    
    let incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw unauthorized("Unauthorized request - No refresh token provided")
    }

    // Clean the token - remove any cookie attributes if present
    if (typeof incomingRefreshToken === 'string') {
        incomingRefreshToken = incomingRefreshToken.split(';')[0].trim();
    }
    

    try {
        
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
        
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            console.error("User not found for token");
            throw unauthorized("Invalid refresh token - User not found")
        }
        
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw unauthorized("Refresh token is expired or used")
        }
    
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }
        
        const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            successResponse(
                {accessToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        // console.error("Error in refreshAccessToken:", error.message);
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})


export { registerUser, loginUser, logoutUser, getAllUsers , addPicture , refreshAccessToken };


