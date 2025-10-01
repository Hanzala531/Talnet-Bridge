import { asyncHandler } from "../utils/asyncHandler.js";
import { successResponse } from "../utils/ApiResponse.js";
import { runCleanupNow } from "../cronJobs/subscriptionCleanup.js";
import { internalServer } from "../utils/ApiError.js";

// Manual subscription cleanup (Admin only)
const triggerSubscriptionCleanup = asyncHandler(async (req, res) => {
    try {
        await runCleanupNow();
        
        return res.json(
            successResponse(
                null,
                "Subscription cleanup triggered successfully"
            )
        );
    } catch (error) {
        console.error("Error triggering subscription cleanup:", error);
        throw internalServer("Failed to trigger subscription cleanup");
    }
});

export {
    triggerSubscriptionCleanup
};