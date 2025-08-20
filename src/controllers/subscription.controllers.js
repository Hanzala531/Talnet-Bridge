import stripe from "../config/stripe.config.js";
import mongoose from "mongoose";
import { Subscription, SubscriptionPlan, User } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { 
    ApiError, 
    badRequest, 
    unauthorized, 
    forbidden, 
    notFound, 
    conflict, 
    validationError, 
    internalServer 
} from "../utils/ApiError.js";
import { successResponse } from "../utils/ApiResponse.js";

// ===========================================
// SUBSCRIPTION PLAN CONTROLLERS
// ===========================================

// Create subscription plan (Admin only)
const createPlan = asyncHandler(async (req, res) => {
    try {
        const { 
            name, 
            displayName, 
            description, 
            price, 
            billingCycle, 
            features,
            stripePriceId,
            stripeProductId 
        } = req.body;

        // Validate required fields
        if (!name) {
            throw badRequest("Plan name is required", "MISSING_PLAN_NAME");
        }
        if (!displayName) {
            throw badRequest("Plan display name is required", "MISSING_DISPLAY_NAME");
        }
        if (!description) {
            throw badRequest("Plan description is required", "MISSING_DESCRIPTION");
        }
        
        if (!billingCycle || !['onetime', 'monthly'].includes(billingCycle)) {
            throw badRequest("Valid billing cycle is required (onetime, monthly)", "INVALID_BILLING_CYCLE");
        }
        if (!stripePriceId) {
            throw badRequest("Stripe price ID is required", "MISSING_STRIPE_PRICE_ID");
        }
        if (!stripeProductId) {
            throw badRequest("Stripe product ID is required", "MISSING_STRIPE_PRODUCT_ID");
        }

        // Validate plan name format
        if (!['learner', 'employer', 'trainingInstitue'].includes(name)) {
            throw badRequest("Plan name must be one of: learner, employer, trainingInstitue", "INVALID_PLAN_NAME");
        }

        // Check if plan already exists
        const existingPlan = await SubscriptionPlan.findOne({ name });
        if (existingPlan) {
            throw conflict(`Subscription plan '${name}' already exists`, "PLAN_ALREADY_EXISTS");
        }

        // Check if Stripe IDs are already in use
        const existingStripePrice = await SubscriptionPlan.findOne({ stripePriceId });
        if (existingStripePrice) {
            throw conflict("Stripe price ID is already in use", "STRIPE_PRICE_ID_EXISTS");
        }

        const existingStripeProduct = await SubscriptionPlan.findOne({ stripeProductId });
        if (existingStripeProduct) {
            throw conflict("Stripe product ID is already in use", "STRIPE_PRODUCT_ID_EXISTS");
        }

        // Validate features (required, must be array of strings)
        if (!features || !Array.isArray(features) || !features.every(f => typeof f === 'string')) {
            throw badRequest("Features must be a non-empty array of strings", "INVALID_FEATURES_TYPE");
        }

        // Create the plan
        const plan = await SubscriptionPlan.create({
            name,
            displayName,
            description,
            price,
            billingCycle,
            features,
            stripePriceId,
            stripeProductId
        });

        res.status(201).json(
    successResponse(201, plan, "Subscription plan created successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        
        // Handle MongoDB validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            throw validationError(validationErrors, "Plan validation failed", "PLAN_VALIDATION_ERROR");
        }

        // Handle MongoDB duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw conflict(`A plan with this ${field} already exists`, "DUPLICATE_PLAN_FIELD");
        }

        console.error("Create subscription plan error:", error);
        throw internalServer("Failed to create subscription plan", "PLAN_CREATION_ERROR");
    }
});

// Get all subscription plans
const getAllPlans = asyncHandler(async (req, res) => {
    try {
        const { active = true } = req.query;
        
        // const filter = {};
        // if (active !== undefined) {
        //     if (active !== 'true' && active !== 'false') {
        //         throw badRequest("Active parameter must be 'true' or 'false'", "INVALID_ACTIVE_PARAMETER");
        //     }
        //     filter.isActive = active === 'true';
        // }

        // const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, createdAt: 1 });
        const plans = await SubscriptionPlan.find({}).sort({ sortOrder: 1, createdAt: 1 });

        if (!plans || plans.length === 0) {
            return res.status(404).json(
                successResponse(404, [], "No subscription plans found")
            );
        }

        res.status(200).json(
            successResponse(200, plans, "Subscription plans retrieved successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Get all plans error:", error);
        throw internalServer("Failed to fetch subscription plans", "PLANS_FETCH_ERROR");
    }
});

// Get subscription plan by ID
const getPlanById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate plan ID format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            throw badRequest("Invalid plan ID format", "INVALID_PLAN_ID");
        }
        
        const plan = await SubscriptionPlan.findById(id);
        
        if (!plan) {
            throw notFound("Subscription plan not found", "PLAN_NOT_FOUND");
        }

        res.status(200).json(
            successResponse(200, plan, "Subscription plan retrieved successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Get plan by ID error:", error);
        throw internalServer("Failed to fetch subscription plan", "PLAN_FETCH_ERROR");
    }
});

// Update subscription plan (Admin only)
const updatePlan = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate plan ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            throw badRequest("Invalid plan ID format", "INVALID_PLAN_ID");
        }

        // Remove fields that shouldn't be updated
        delete updates._id;
        delete updates.__v;
        delete updates.createdAt;
        // Don't allow updating certain critical fields
        delete updates.stripePriceId;
        delete updates.stripeProductId;

        // Validate updates if provided
        if (updates.name && !['learner', 'employer', 'trainingInstitue'].includes(updates.name)) {
            throw badRequest("Plan name must be one of: learner, employer, trainingInstitue", "INVALID_PLAN_NAME");
        }

        if (updates.price !== undefined && updates.price < 0) {
            throw badRequest("Price must be a positive number", "INVALID_PRICE");
        }

        if (updates.billingCycle && !['onetime', 'monthly'].includes(updates.billingCycle)) {
            throw badRequest("Billing cycle must be: onetime or monthly", "INVALID_BILLING_CYCLE");
        }

        if (updates.features && (!Array.isArray(updates.features) || !updates.features.every(f => typeof f === 'string'))) {
            throw badRequest("Features must be an array of strings", "INVALID_FEATURES_TYPE");
        }

        // Check if plan exists
        const existingPlan = await SubscriptionPlan.findById(id);
        if (!existingPlan) {
            throw notFound("Subscription plan not found", "PLAN_NOT_FOUND");
        }

        // Check for conflicts if updating unique fields
        if (updates.name && updates.name !== existingPlan.name) {
            const nameConflict = await SubscriptionPlan.findOne({ name: updates.name });
            if (nameConflict) {
                throw conflict(`Plan name '${updates.name}' is already in use`, "PLAN_NAME_EXISTS");
            }
        }

        const plan = await SubscriptionPlan.findByIdAndUpdate(
            id, 
            updates, 
            { new: true, runValidators: true }
        );

        res.status(200).json(
            successResponse(200, plan, "Subscription plan updated successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;

        // Handle MongoDB validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            throw validationError(validationErrors, "Plan validation failed", "PLAN_VALIDATION_ERROR");
        }

        // Handle MongoDB duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            throw conflict(`A plan with this ${field} already exists`, "DUPLICATE_PLAN_FIELD");
        }

        console.error("Update subscription plan error:", error);
        throw internalServer("Failed to update subscription plan", "PLAN_UPDATE_ERROR");
    }
});

// Delete subscription plan (Admin only)
const deletePlan = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate plan ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            throw badRequest("Invalid plan ID format", "INVALID_PLAN_ID");
        }

        // Check if plan exists
        const plan = await SubscriptionPlan.findById(id);
        if (!plan) {
            throw notFound("Subscription plan not found", "PLAN_NOT_FOUND");
        }

        // Check if any active subscriptions use this plan
        const activeSubscriptions = await Subscription.countDocuments({
            'plan._id': id,
            status: 'active'
        });

        if (activeSubscriptions > 0) {
            throw conflict(
                `Cannot delete plan with ${activeSubscriptions} active subscription(s). Cancel or transfer subscriptions first.`, 
                "PLAN_HAS_ACTIVE_SUBSCRIPTIONS"
            );
        }

        await SubscriptionPlan.findByIdAndDelete(id);

        res.status(200).json(
            successResponse(200, null, "Subscription plan deleted successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Delete subscription plan error:", error);
        throw internalServer("Failed to delete subscription plan", "PLAN_DELETE_ERROR");
    }
});

// ===========================================
// SUBSCRIPTION CONTROLLERS
// ===========================================

// Create subscription
const createSubscription = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { planId } = req.body;

        // Validate required fields
        if (!planId) {
            throw badRequest("Plan ID is required", "MISSING_PLAN_ID");
        }

        // Validate plan ID format
        if (!planId.match(/^[0-9a-fA-F]{24}$/)) {
            throw badRequest("Invalid plan ID format", "INVALID_PLAN_ID");
        }

        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            userId,
            status: { $in: ['active', 'pending'] }
        });

        if (existingSubscription) {
            throw conflict("User already has an active or pending subscription", "SUBSCRIPTION_ALREADY_EXISTS");
        }

        // Get the subscription plan
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            throw notFound("Subscription plan not found", "PLAN_NOT_FOUND");
        }

        if (!plan.isActive) {
            throw badRequest("Subscription plan is not active", "PLAN_NOT_ACTIVE");
        }

        // Calculate billing dates
        const startDate = new Date();
        let endDate = null;
        let nextBillingDate = null;
        if (plan.billingCycle === 'monthly') {
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            nextBillingDate = endDate;
        }
        // For 'onetime', endDate and nextBillingDate remain null

        // Create subscription
        const subscription = await Subscription.create({
            userId,
            planId: plan._id,
            billing: {
                startDate,
                endDate,
                nextBillingDate,
                autoRenew: true
            },
            features: plan.features,
            status: 'pending'
        });

        res.status(201).json(
            successResponse(201, subscription, "Subscription created successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;

        // Handle MongoDB validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.values(error.errors).map(e => ({
                field: e.path,
                message: e.message
            }));
            throw validationError(validationErrors, "Subscription validation failed", "SUBSCRIPTION_VALIDATION_ERROR");
        }

        console.error("Create subscription error:", error);
        throw internalServer("Failed to create subscription", "SUBSCRIPTION_CREATION_ERROR");
    }
});

// Get user's current subscription
const getUserSubscription = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const subscription = await Subscription.findOne({ userId })
            .sort({ createdAt: -1 });

        if (!subscription) {
            return res.status(404).json(
                successResponse(404, null, "No subscription found for user")
            );
        }

        res.status(200).json(
            successResponse(200, subscription, "Subscription retrieved successfully")
        );
    } catch (error) {
        console.error("Get user subscription error:", error);
        throw internalServer("Failed to fetch user subscription", "USER_SUBSCRIPTION_FETCH_ERROR");
    }
});

// Get all subscriptions (Admin only)
const getAllSubscriptions = asyncHandler(async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Validate pagination parameters
        if (page < 1) {
            throw badRequest("Page number must be greater than 0", "INVALID_PAGE_NUMBER");
        }
        if (limit < 1 || limit > 100) {
            throw badRequest("Limit must be between 1 and 100", "INVALID_LIMIT");
        }

        const filter = {};
        if (status) {
            const validStatuses = ["active", "inactive", "cancelled", "expired", "pending"];
            if (!validStatuses.includes(status)) {
                throw badRequest(`Status must be one of: ${validStatuses.join(', ')}`, "INVALID_STATUS");
            }
            filter.status = status;
        }

        const skip = (page - 1) * limit;
        const subscriptions = await Subscription.find(filter)
            .populate('userId', 'fullName email role')
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });

        const total = await Subscription.countDocuments(filter);

        res.status(200).json(
            successResponse(200, {
                subscriptions,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }, "Subscriptions retrieved successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Get all subscriptions error:", error);
        throw internalServer("Failed to fetch subscriptions", "SUBSCRIPTIONS_FETCH_ERROR");
    }
});

// Update subscription status (Admin only)
const updateSubscriptionStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate subscription ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            throw badRequest("Invalid subscription ID format", "INVALID_SUBSCRIPTION_ID");
        }

        // Validate status
        if (!status) {
            throw badRequest("Status is required", "MISSING_STATUS");
        }

        const validStatuses = ["active", "inactive", "cancelled", "expired", "pending"];
        if (!validStatuses.includes(status)) {
            throw badRequest(`Status must be one of: ${validStatuses.join(', ')}`, "INVALID_STATUS");
        }

        // Check if subscription exists
        const existingSubscription = await Subscription.findById(id);
        if (!existingSubscription) {
            throw notFound("Subscription not found", "SUBSCRIPTION_NOT_FOUND");
        }

        // Validate status transition
        if (existingSubscription.status === status) {
            throw conflict(`Subscription is already ${status}`, "STATUS_UNCHANGED");
        }

        const subscription = await Subscription.findByIdAndUpdate(
            id,
            { status, updatedAt: new Date() },
            { new: true }
        );

        res.status(200).json(
            successResponse(200, subscription, "Subscription status updated successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Update subscription status error:", error);
        throw internalServer("Failed to update subscription status", "SUBSCRIPTION_STATUS_UPDATE_ERROR");
    }
});

// Cancel subscription
const cancelSubscription = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { reason } = req.body;

        const subscription = await Subscription.findOne({
            userId,
            status: 'active'
        });

        if (!subscription) {
            throw notFound("No active subscription found for this user", "ACTIVE_SUBSCRIPTION_NOT_FOUND");
        }

        // Check if subscription is already being cancelled
        if (subscription.status === 'cancelled') {
            throw conflict("Subscription is already cancelled", "SUBSCRIPTION_ALREADY_CANCELLED");
        }

        // Validate reason if provided
        if (reason && typeof reason !== 'string') {
            throw badRequest("Cancellation reason must be a string", "INVALID_REASON_FORMAT");
        }

        // Update subscription with cancellation info
        subscription.status = 'cancelled';
        subscription.cancellation = {
            cancelledAt: new Date(),
            cancelledBy: userId,
            reason: reason || 'User requested cancellation'
        };

        await subscription.save();

        res.status(200).json(
            successResponse(200, subscription, "Subscription cancelled successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Cancel subscription error:", error);
        throw internalServer("Failed to cancel subscription", "SUBSCRIPTION_CANCEL_ERROR");
    }
});

// ===========================================
// PAYMENT CONTROLLERS
// ===========================================

// Create payment intent
const createPaymentIntent = asyncHandler(async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        const userId = req.user._id;

        if (!subscriptionId) {
            throw badRequest("Subscription ID is required", "MISSING_SUBSCRIPTION_ID");
        }

        if (!subscriptionId.match(/^[0-9a-fA-F]{24}$/)) {
            throw badRequest("Invalid subscription ID format", "INVALID_SUBSCRIPTION_ID");
        }

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId,
            status: 'pending'
        });

        if (!subscription) {
            throw notFound("Subscription not found or not pending", "SUBSCRIPTION_NOT_FOUND_OR_NOT_PENDING");
        }

        
        const plan = await SubscriptionPlan.findById(subscription.planId);
        if (!plan || plan.price === undefined || plan.price === null) {
            throw badRequest(`Invalid subscription plan data for planId: ${subscription.planId}`, "INVALID_PLAN_DATA");
        }
        if (plan.name === "learner") {
            await User.findByIdAndUpdate(userId, { role: "student" });
        } else if (plan.name === "employer") {
            await User.findByIdAndUpdate(userId, { role: "employer" });
        } else if (plan.name === "trainingInstitue") {
            await User.findByIdAndUpdate(userId, { role: "school" });
        }
        if (plan.price === undefined || plan.price === null || plan.price < 0) {
            throw badRequest("Invalid subscription price", "INVALID_PRICE");
        }

        // Handle free plans: skip Stripe, activate subscription immediately
        if (plan.price === 0) {
            subscription.status = 'active';
            await subscription.save();
            return res.status(200).json(
                successResponse(200, {
                    message: "Free plan: subscription activated without payment",
                    subscriptionId: subscription._id
                }, "Subscription activated for free plan")
            );
        }

        try {
            // Create Stripe payment intent with only 'card' to avoid redirects
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(plan.price * 100), // cents
                currency: (plan.currency || 'usd').toLowerCase(),
                payment_method_types: ['card'], // ✅ Force only card payments
                metadata: {
                    subscriptionId: subscription._id.toString(),
                    userId: userId.toString()
                }
                // OR alternative to avoid redirects:
                // automatic_payment_methods: { enabled: true, allow_redirects: 'never' }
            });

            res.status(200).json(
                successResponse(200, {
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id
                }, "Payment intent created successfully")
            );
        } catch (stripeError) {
            console.error("Stripe payment intent creation error:", stripeError);
            throw badRequest(`Stripe error: ${stripeError.message}", "STRIPE_PAYMENT_INTENT_ERROR"`);
        }
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Create payment intent error:", error);
        throw internalServer("Failed to create payment intent", "PAYMENT_INTENT_CREATION_ERROR");
    }
});

// Confirm payment intent
const confirmPayment = asyncHandler(async (req, res) => {
    try {
        const { paymentIntentId, subscriptionId } = req.body;
        const userId = req.user._id;

        if (!paymentIntentId) {
            throw badRequest("PaymentIntent ID is required", "MISSING_PAYMENT_INTENT_ID");
        }
        if (!subscriptionId) {
            throw badRequest("Subscription ID is required", "MISSING_SUBSCRIPTION_ID");
        }

        // Verify subscription ownership & status
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId,
            status: 'pending'
        });

        if (!subscription) {
            throw notFound("Subscription not found or not pending", "SUBSCRIPTION_NOT_FOUND_OR_NOT_PENDING");
        }

        try {
            // Confirm payment with Stripe test card (Postman-friendly)
            const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
                payment_method: 'pm_card_visa'
            });

            if (paymentIntent.status === 'succeeded') {
                // Update subscription to active
                subscription.status = 'active';
                await subscription.save();

                return res.status(200).json(
                    successResponse(200, {
                        message: "Payment successful and subscription activated",
                        paymentIntent
                    })
                );
            }

            return res.status(400).json({
                status: 400,
                success: false,
                message: `Payment not successful. Status: ${paymentIntent.status}`,
                errorCode: "PAYMENT_FAILED"
            });

        } catch (stripeError) {
            console.error("Stripe payment confirmation error:", stripeError);
            throw badRequest(`Stripe error: ${stripeError.message}`, "STRIPE_PAYMENT_CONFIRMATION_ERROR");
        }

    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Confirm payment intent error:", error);
        throw internalServer("Failed to confirm payment", "PAYMENT_INTENT_CONFIRMATION_ERROR");
    }
});

// Get subscription usage/stats
const getSubscriptionStats = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const subscription = await Subscription.findOne({
            userId,
            status: 'active'
        });

        if (!subscription) {
            throw notFound("No active subscription found for this user", "ACTIVE_SUBSCRIPTION_NOT_FOUND");
        }

        // Validate subscription data
        if (!subscription.features) {
            throw badRequest("Subscription features not configured", "SUBSCRIPTION_FEATURES_MISSING");
        }

        try {
            // Get usage stats from other collections
            const [coursesCount, studentsCount] = await Promise.all([
                // Count courses created by this training provider
                mongoose.model('Course').countDocuments({ trainingProvider: userId }),
                // Count students enrolled in this provider's courses
                mongoose.model('Enrollment').countDocuments({ 
                    courseId: { $in: await mongoose.model('Course').find({ trainingProvider: userId }).distinct('_id') }
                })
            ]);

            // Update usage in subscription
            subscription.usage.coursesCreated = coursesCount;
            subscription.usage.studentsEnrolled = studentsCount;
            subscription.usage.lastActivity = new Date();
            await subscription.save();

            const stats = {
                subscription: {
                    plan: subscription.plan,
                    status: subscription.status,
                    daysRemaining: subscription.daysRemaining,
                    features: subscription.features
                },
                usage: {
                    coursesCreated: coursesCount,
                    maxCourses: subscription.features.maxCourses,
                    studentsEnrolled: studentsCount,
                    maxStudents: subscription.features.maxStudents,
                    coursesPercentage: subscription.features.maxCourses > 0 
                        ? Math.round((coursesCount / subscription.features.maxCourses) * 100) 
                        : 0,
                    studentsPercentage: subscription.features.maxStudents > 0 
                        ? Math.round((studentsCount / subscription.features.maxStudents) * 100) 
                        : 0
                }
            };

            res.status(200).json(
                successResponse(200, stats, "Subscription stats retrieved successfully")
            );
        } catch (dbError) {
            console.error("Database query error in subscription stats:", dbError);
            throw internalServer("Failed to calculate usage statistics", "USAGE_CALCULATION_ERROR");
        }
    } catch (error) {
        if (error instanceof ApiError) throw error;
        console.error("Get subscription stats error:", error);
        throw internalServer("Failed to fetch subscription stats", "SUBSCRIPTION_STATS_ERROR");
    }
});

export {
    // Plan controllers
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    
    // Subscription controllers
    createSubscription,
    getUserSubscription,
    getAllSubscriptions,
    updateSubscriptionStatus,
    cancelSubscription,
    
    // Payment controllers
    createPaymentIntent,
    confirmPayment,
    getSubscriptionStats
};
