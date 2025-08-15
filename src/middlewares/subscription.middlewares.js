import { Subscription, Course } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";

// Middleware to check if user has an active subscription
export const requireActiveSubscription = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user._id;
        
        const subscription = await Subscription.findOne({
            userId,
            status: 'active'
        });

        if (!subscription) {
            throw new ApiError(403, "Active subscription required to access this feature");
        }

        // Check if subscription is expired
        if (subscription.billing.endDate < new Date()) {
            // Update subscription status to expired
            subscription.status = 'expired';
            await subscription.save();
            throw new ApiError(403, "Subscription has expired. Please renew to continue.");
        }

        // Attach subscription to request for use in controllers
        req.subscription = subscription;
        next();
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to verify subscription status");
    }
});

// Middleware to check course creation limits
export const checkCourseLimit = asyncHandler(async (req, res, next) => {
    try {
        const userId = req.user._id;
        const subscription = req.subscription;

        if (!subscription) {
            throw new ApiError(403, "Active subscription required");
        }

        // Count current courses
        const currentCourses = await Course.countDocuments({
            trainingProvider: userId
        });

        if (currentCourses >= subscription.features.maxCourses) {
            throw new ApiError(403, `Course limit reached. Your plan allows ${subscription.features.maxCourses} courses. Upgrade your plan to create more courses.`);
        }

        next();
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(500, "Failed to check course limit");
    }
});

// Middleware to check if feature is available in subscription
export const checkFeatureAccess = (feature) => {
    return asyncHandler(async (req, res, next) => {
        try {
            const subscription = req.subscription;

            if (!subscription) {
                throw new ApiError(403, "Active subscription required");
            }

            if (!subscription.features[feature]) {
                throw new ApiError(403, `This feature is not available in your current plan. Please upgrade to access ${feature}.`);
            }

            next();
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError(500, "Failed to check feature access");
        }
    });
};
