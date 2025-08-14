import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/contents/User.models.js";
import { badRequest, notFound, internalServer } from "../utils/ApiError.js";
import { successResponse, createdResponse } from "../utils/ApiResponse.js";

// Access and Refresh Tokens
const generateAccessAndRefreshTokens = async (userid) => {
  try {
    const user = await User.findById(userid);
    if (!user) {
      throw new notFound(404, "User not found");
    }

    // Call the methods on the user instance
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error generating tokens:", error); // Log the error
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

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

  } catch (error) {
    console.log("Error in creating user", error);
    throw  internalServer("Failed to register user");
  }
});

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

  } catch (error) {
    console.log("Error in login user", error);
    throw  internalServer("Failed to login");
  }
});

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

    } catch (error) {
        console.log("Error in logout user", error);
        throw  internalServer("Failed to logout");
    }
});

export { registerUser, loginUser, logoutUser };
