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
import { Employer } from "../models/index.js";
import { badRequest, notFound, internalServer, ApiError, unauthorized } from "../utils/ApiError.js";
import { Subscription } from "../models/index.js";
import { successResponse, createdResponse, badRequestResponse, notFoundResponse, serverErrorResponse } from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from '../utils/cloudinary.js'
import jwt from "jsonwebtoken";
import { sendWelcomeEmail } from "../services/welcomeEmail.service.js";
import { Student } from "../models/student models/students.models.js"; // Add this import for Student model
import { TrainingInstitute } from "../models/index.js";



// Format number to human-readable string (e.g., 1.2K, 3.5M)
function formatRevenue(num) {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}


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
    const { fullName, email, phone, role, password } = req.body;

    // Check for required fields
    if (!fullName || !email || !phone || !password) {
      return res.json(badRequestResponse("All fields are required"));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.json(badRequestResponse("Invalid email format"));
    }

    // Validate phone number 
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      return res.json(badRequestResponse("Invalid phone number"));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json(badRequestResponse("User with this email already exists"));
    }

    if (role === 'employer'){

       // Create new user
    const user = await User.create({
      fullName,
      email,
      phone,
      role,
      password,
      status : 'approved'
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Remove sensitive data from response
    const createdUser = user.toObject();
    delete createdUser.password;
    delete createdUser.refreshToken;

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail({ 
        email: createdUser.email, 
        name: createdUser.fullName 
      });
      console.log("Welcome email sent successfully to:", createdUser.email);
    } catch (emailError) {
      console.error("Error sending welcome email to", createdUser.email, ":", emailError.message);
      // Don't fail registration if email fails - just log the error
    }

    return res
      .json(createdResponse({ user: createdUser, accessToken }, "User registered successfully"));

  }

    

    // Create new user
    const user = await User.create({
      fullName,
      email,
      phone,
      role,
      password,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    // Remove sensitive data from response
    const createdUser = user.toObject();
    delete createdUser.password;
    delete createdUser.refreshToken;

    // Send welcome email (non-blocking)
    try {
      await sendWelcomeEmail({ 
        email: createdUser.email, 
        name: createdUser.fullName 
      });
      console.log("Welcome email sent successfully to:", createdUser.email);
    } catch (emailError) {
      console.error("Error sending welcome email to", createdUser.email, ":", emailError.message);
      // Don't fail registration if email fails - just log the error
    }

    return res
      .json(createdResponse({ user: createdUser, accessToken }, "User registered successfully"));

  } catch (error) {
    console.error("Registration error:", error);
    throw internalServer("Failed to register user");
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
            return res.json( badRequestResponse("Email and password are required"));
    }

    // Find user and select password
    const user = await User.findOne({ email });
    if (!user) {
            return res.json( notFoundResponse("User not found"));
    }

    // Validate password
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
            return res.json( badRequestResponse("Invalid login credentials"));
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
          { user: loggedInUser, accessToken , refreshToken},
          "User logged in successfully"
        )
      );

  } catch (error) {
    throw  internalServer("Failed to login");
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
                  return res.json( badRequestResponse("User Not Found"));
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
           return res.json( badRequestResponse("Image is not provided to upload"));

    }

    // Upload to cloudinary
    const imageUrl = await uploadOnCloudinary(imageLocalPath);

    if (!imageUrl) {
            return res.json( serverErrorResponse("Failed to upload image"));
    }

    // Update user profile with image URL
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { profilePicture: imageUrl.secure_url } },
      { new: true, projection: { password: 0, refreshToken: 0 } }
    );

    if (!updatedUser) {
            return res.json( notFoundResponse("user not updated"));
    }

    return res.json(
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
    throw internalServer("Failed to update the user")
  }
});

// Refresh Access token
const refreshAccessToken = asyncHandler(async (req, res) => {
    
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (!refreshToken) {
        throw unauthorized("Unauthorized request - No refresh token provided");
    }

    // // Clean the token - remove any cookie attributes if present
    // if (typeof refreshToken === 'string') {
    //     refreshToken = refreshToken.split(';')[0].trim();
    // }
    

    try {
        
        const decodedToken = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        
        const user = await User.findById(decodedToken?._id);
    
        if (!user) {
            console.error("User not found for token");
            throw unauthorized("Invalid refresh token - User not found");
        }
        
        if (refreshToken !== user?.refreshToken) {
            throw unauthorized("Refresh token is expired or used");
        }
    
        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        };
        
        // ✅ FIX: Use different variable names to avoid redeclaration conflict
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user._id);
        
        return res
            .status(200)
            .cookie("accessToken", newAccessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                successResponse(
                  { refreshToken:newRefreshToken },
                    { accessToken: newAccessToken },  // ✅ FIX: Use the new access token
                    "Access token refreshed"
                )
            );
    } catch (error) {
        // console.error("Error in refreshAccessToken:", error.message);
        throw unauthorized("Invalid refresh token provided");  // ✅ FIX: Corrected typo "reffresh" to "refresh"
    }
});

// Get all students for admin panel (fixed: only populate if kyc exists, and handle errors gracefully)
const getAllStudents = asyncHandler(async (req, res) => {
  try {
    // Fetch students with role "student"
    const students = await User.find({ role: "student" })
      .select("-password -refreshToken")

    // If no students found, return empty array
    if (!students || students.length === 0) {
      return res.json(successResponse([], "No students found"));
    }

    return res.json(successResponse(students, "Students fetched successfully"));
  } catch (error) {
    console.error("Error in getAllStudents:", error.message);
    throw internalServer("Failed to fetch students");
  }
});

// get all employers for admin pannel 
const getAllEmployers = asyncHandler(async (req, res) => {
  try {
    const employers = await User.find({ role: "employer" }).select("-password -refreshToken");
    return res.json(successResponse(employers, "Employers fetched successfully"));
  } catch (error) {
    throw internalServer("Failed to fetch employers");
  }
});

// get all schools for admin panel
const getAllSchools = asyncHandler(async (req, res) => {
  try {
    // Use aggregation to fetch schools and their course counts
    const schools = await User.aggregate([
      // Match users with role "school"
      { $match: { role: "school" } },
      // Lookup TrainingInstitute to get course data
      {
        $lookup: {
          from: "traininginstitutes", // Collection name for TrainingInstitute (adjust if different)
          localField: "_id",
          foreignField: "userId",
          as: "institute"
        }
      },
      // Unwind the institute array (optional, but ensures one document per school)
      { $unwind: { path: "$institute", preserveNullAndEmptyArrays: true } },
      // Add totalCourses field
      {
        $addFields: {
          totalCourses: { $size: { $ifNull: ["$institute.courses", []] } } // Count courses, default to 0 if no institute
        }
      },
      // Project fields to exclude sensitive data
      {
        $project: {
          password: 0,
          refreshToken: 0,
          institute: 0 // Exclude the full institute object to keep response clean
        }
      }
    ]);

    return res.json(successResponse(schools, "Schools with course counts fetched successfully"));
  } catch (error) {
    console.error("Error in getAllSchools:", error.message);
    throw internalServer("Failed to fetch schools");
  }
});
// Get analytics for admin pannel  in which we will have total number of students employers schools and revenue which will be calculated through subscriptions
const adminAnalytics = asyncHandler(async (req, res) => {
  try {
    // Count users by role
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalEmployers = await User.countDocuments({ role: "employer" });
    const totalSchools = await User.countDocuments({ role: "school" });
    const totalUsers = totalStudents + totalEmployers + totalSchools;

    // Calculate total revenue from subscriptions
    let totalRevenue = 0;
    try {
        const revenueResult = await Subscription.aggregate([
          // Filter for active or completed subscriptions only
          { $match: { status: { $in: ["active", "completed"] } } },
          // Join with SubscriptionPlan to get the price
          {
            $lookup: {
              from: "subscriptionplans", // Collection name for SubscriptionPlan (adjust if different)
              localField: "planId",
              foreignField: "_id",
              as: "plan"
            }
          },
          // Unwind the plan array (assuming one plan per subscription)
          { $unwind: "$plan" },
          // Group and sum the price from the plan
          {
            $group: {
              _id: null,
              total: { $sum: "$plan.price" } // Sum the price field from SubscriptionPlan
            }
          }
        ]);
        totalRevenue = revenueResult[0]?.total || 0;
      
    } catch (aggError) {
      console.warn("Subscription aggregation failed, defaulting revenue to 0:", aggError.message);
      // If Subscription model is missing or aggregation fails, revenue defaults to 0
    }

    // Optional: Add more metrics, e.g., revenue this month
    const currentMonth = new Date();
    currentMonth.setDate(1); // Start of current month
   
    return res.json(successResponse({
  totalUsers,
  totalStudents,
  totalEmployers,
  totalSchools,
  totalRevenue: formatRevenue(totalRevenue), 
    }, "Admin analytics fetched successfully"));
  } catch (error) {
    throw internalServer("Failed to fetch admin analytics");
  }
});

// Controller to show pending actions to admin it will be calculated by this way that admin have to approve users or not like in user status field will be approved by admin
const getPendingActions = asyncHandler(async (req, res) => {
  try {
    const pendingUsers = await User.find({ status: "pending" }).select("-password -refreshToken");
    return res.json(successResponse(pendingUsers, "Pending approvals fetched successfully"));
  } catch (error) {
    throw internalServer("Failed to fetch pending approvals");
  }
});

// Controller to update user status for admin
const updateUserStatus = asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  const { status } = req.body;

  if (!userId || !status) {
    return res.status(400).json({ message: "User ID and status are required" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.status = status;
    await user.save();

    return res.json(successResponse(user, "User status updated successfully"));
  } catch (error) {
    throw internalServer("Failed to update user status");
  }
});

// Get students by region for admin analytics (Top 4 regions only)
const getStudentsByRegion = asyncHandler(async (req, res) => {
  try {
    // Fetch all students with location data
    const students = await Student.find({}).select("location").lean();

    // Process locations to extract regions and count
    const regionCounts = {};
    let totalStudents = students.length;

    students.forEach(student => {
      let region = "Unknown"; // Default for invalid/null locations

      if (student.location && typeof student.location === "string") {
        const parts = student.location.split(",").map(part => part.trim());
        if (parts.length >= 2) {
          // Second last part is the region
          region = parts[parts.length - 2].toLowerCase(); // Normalize to lowercase for grouping
        } else if (parts.length === 1) {
          // If only one part, use it as region
          region = parts[0].toLowerCase();
        }
      }

      // Capitalize first letter for display
      region = region.charAt(0).toUpperCase() + region.slice(1);

      // Count occurrences
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });

    // Convert to sorted array for analytics
    const regions = Object.entries(regionCounts)
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count); // Sort by count descending

    // Limit to top 4 regions
    const topRegions = regions.slice(0, 4);

    return res.json(successResponse({
      totalStudents,
      topRegions
    }, "Top 4 students by region analytics fetched successfully"));
  } catch (error) {
    console.error("Error in getStudentsByRegion:", error.message);
    throw internalServer("Failed to fetch students by region");
  }
});

// Get student details for admin
const getStudentProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId;

    // Load student profile with related data
    let studentProfile = await Student.findOne({ userId: userId })
      .populate({ path: "kycVerification" }) // Remove select to get all fields
      .lean();

    if (!studentProfile) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    // Get user details (profile picture + status if available)
    const userDetails = await User.findById(userId)
      .select("profilePicture status")
      .lean();

    // Final profile object, including all kycVerification data
    const completeProfile = {
      studentId: studentProfile._id,
      userId: studentProfile.userId,
      firstName: studentProfile.firstName,
      lastName: studentProfile.lastName,
      email: studentProfile.email,
      phone: studentProfile.phone,
      profilePicture: userDetails?.profilePicture || null,
      status: userDetails?.status || null,
      role: "student",
      location: studentProfile.location,
      website: studentProfile.website,
      createdAt: studentProfile.createdAt,
      updatedAt: studentProfile.updatedAt,
      kycVerification: studentProfile.kycVerification || null // All KYC fields
    };

    return res.json(
      successResponse(completeProfile, "Student profile retrieved successfully")
    );
  } catch (error) {
    console.error("Error in getStudentProfile:", error);
    throw internalServer(error.message || "Failed to retrieve student profile");
  }
});

// Controller for platform usage
const platformUsage = asyncHandler(async (req, res) => {
  try {
    // Count users by role
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalSchools = await User.countDocuments({ role: "school" });
    const totalEmployers = await User.countDocuments({ role: "employer" });
    
    
    return res.json(successResponse({
      totalStudents,
      totalSchools,
      totalEmployers,
    
    }, "Platform usage statistics fetched successfully"));
  } catch (error) {
    console.error("Error in platformUsage:", error.message);
    throw internalServer("Failed to fetch platform usage statistics");
  }
});

//  company details
const companyDetails = asyncHandler(async (req, res) => {
    try {
        const userId  = req.params.userId;

        if (!userId) {
            return res.json(badRequestResponse("User ID is required."));
        }

        // Find company profile by userId
        const company = await Employer.findOne({ userId : userId })
           

        if (!company) {
            return res.json(notFoundResponse("Company not found for this user."));
        }

        // Structure the response data properly
        const companyData = {
            _id: company._id,
            name: company.name,
            description: company.description,
            companySize: company.companySize,
            industry: company.industry,
            websiteLink: company.websiteLink,
            location: company.location,
            establishedYear: company.establishedYear,
            verified: company.verified,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        };

        return res.json(successResponse(companyData, "Company profile fetched successfully by user ID."));
    } catch (error) {
        console.error("Error in companyDetails:", error);
        throw internalServer("Failed to fetch company profile.");
    }
});

// Get school profile
const getSchoolProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.params.userId;

    if (!userId) {
      return res.json(badRequestResponse("User ID is required"));
    }

    const profile = await TrainingInstitute.findOne({ userId: userId })
    .select('_id userId name about location website ');

    if (!profile) { 
      return res.json(notFoundResponse("Profile of training provider not found"));
    }
    return res.status(200).json(successResponse({profile},"Training provider profile found successfully"));
  } catch (error) {
    throw internalServer("Failed to fetch profile");
  }
});

// Get all admin user accounts for chat
const getAllAdminUsers = asyncHandler(async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id fullName email role");

    if (!admins || admins.length === 0) {
      return res.json(notFoundResponse("No admin users found"));
    }

    return res.json(successResponse(admins, "Admin users retrieved successfully"));
  } catch (error) {
    console.error("Error in getAllAdminUsers:", error);
    throw internalServer("Failed to fetch admin users");
  }
});


// Export all controllers
export {
  registerUser,
  loginUser,
  logoutUser,
  getAllUsers,
  addPicture,
  getPendingActions,
  updateUserStatus,
  getAllStudents,
  getAllEmployers,
  getAllSchools, 
  adminAnalytics,
  refreshAccessToken,
  getStudentsByRegion,
  getStudentProfile,
  platformUsage,
  companyDetails,
  getSchoolProfile,
  getAllAdminUsers
};


