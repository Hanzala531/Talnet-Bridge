import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/index.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    // 1. Extract token from cookies or Authorization header
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized: No token provided");
    }

    // 2. Verify token
    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      const isExpired = err.name === "TokenExpiredError";
      const message = isExpired
        ? "Token expired, please login again"
        : "Invalid token";

      throw new ApiError(401, `Unauthorized: ${message}`);
    }

    // 3. Optional: Check token version if you're using token versioning
    // Example: if (decodedToken.tokenVersion !== user.tokenVersion) ...

    // 4. Find user by ID (sanitize sensitive data)
    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Unauthorized: User no longer exists");
    }

    // 5. Attach user to request
    req.user = user;

    // 6. Proceed to next middleware
    next();
  } catch (error) {
    console.error("🔐 JWT Middleware Error:", error.message);
    throw new ApiError(401, error.message || "Unauthorized");
  }
});
