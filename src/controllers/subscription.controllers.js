import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError , internalServer } from "../utils/ApiError.js";
import { Subscription, SubscriptionPlan, User } from "../models/index.js";
import { successResponse, badRequestResponse } from "../utils/ApiResponse.js";
import stripe from "../config/stripe.config.js";

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
            return res.json(badRequestResponse("Plan name is required", "MISSING_PLAN_NAME"));
        }
        if (!displayName) {
            return res.json(badRequestResponse("Plan display name is required", "MISSING_DISPLAY_NAME"));
        }
        if (!description) {
            return res.json(badRequestResponse("Plan description is required", "MISSING_DESCRIPTION"));
        }
        
        if (!billingCycle || !['onetime', 'monthly'].includes(billingCycle)) {
            return res.json(badRequestResponse("Valid billing cycle is required (onetime, monthly)", "INVALID_BILLING_CYCLE"));
        }
        if (!stripePriceId) {
            return res.json(badRequestResponse("Stripe price ID is required", "MISSING_STRIPE_PRICE_ID"));
        }
        if (!stripeProductId) {
            return res.json(badRequestResponse("Stripe product ID is required", "MISSING_STRIPE_PRODUCT_ID"));
        }

        // Validate plan name format
        if (!['learner', 'employer', 'trainingInstitue'].includes(name)) {
            return res.json(badRequestResponse("Plan name must be one of: learner, employer, trainingInstitue", "INVALID_PLAN_NAME"));
        }

        // Check if plan already exists
        const existingPlan = await SubscriptionPlan.findOne({ name });
        if (existingPlan) {
            return res.json(conflictResponse(`Subscription plan '${name}' already exists`, "PLAN_ALREADY_EXISTS"));
        }

        // Check if Stripe IDs are already in use
        const existingStripePrice = await SubscriptionPlan.findOne({ stripePriceId });
        if (existingStripePrice) {
            return res.json(conflictResponse("Stripe price ID is already in use", "STRIPE_PRICE_ID_EXISTS"));
        }

        const existingStripeProduct = await SubscriptionPlan.findOne({ stripeProductId });
        if (existingStripeProduct) {
            return res.json(conflictResponse("Stripe product ID is already in use", "STRIPE_PRODUCT_ID_EXISTS"));
        }

        // Validate features (required, must be array of strings)
        if (!features || !Array.isArray(features) || !features.every(f => typeof f === 'string')) {
            return res.json(badRequestResponse("Features must be a non-empty array of strings", "INVALID_FEATURES_TYPE"));
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
            stripeProductIdinternalServer
        });

        res.json(
    successResponse({plan}, "Subscription plan created successfully")
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
            return res.json(conflictResponse(`A plan with this ${field} already exists`, "DUPLICATE_PLAN_FIELD"));
        }throw internalServer("Failed to create subscription plan", "PLAN_CREATION_ERROR");
    }
});

// Get all subscription plans
const getAllPlans = asyncHandler(async (req, res) => {
    try {
        const { active = true } = req.query;
        
        // const filter = {};
        // if (active !== undefined) {
        //     if (active !== 'true' && active !== 'false') {
        //         return res.json(badRequestResponse("Active parameter must be 'true' or 'false'", "INVALID_ACTIVE_PARAMETER");
        //     }
        //     filter.isActive = active === 'true';
        // }

        // const plans = await SubscriptionPlan.find(filter).sort({ sortOrder: 1, createdAt: 1 });
        const plans = await SubscriptionPlan.find({}).sort({ sortOrder: 1, createdAt: 1 });

        if (!plans || plans.length === 0) {
            return res.json(
                successResponse( "No subscription plans found")
            );
        }

        res.json(
            successResponse({plans}, "Subscription plans retrieved successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to fetch subscription plans", "PLANS_FETCH_ERROR");
    }
});

// Get subscription plan by ID
const getPlanById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        // Validate plan ID format
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.json(badRequestResponse("Invalid plan ID format", "INVALID_PLAN_ID"));
        }
        
        const plan = await SubscriptionPlan.findById(id);
        
        if (!plan) {
            return res.json(noContentResponse("Subscription plan not found", "PLAN_NOT_FOUND"));
        }

        res.json(
            successResponse({ plan}, "Subscription plan retrieved successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to fetch subscription plan", "PLAN_FETCH_ERROR");
    }
});

// Update subscription plan (Admin only)
const updatePlan = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Validate plan ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.json(badRequestResponse("Invalid plan ID format", "INVALID_PLAN_ID"));
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
            return res.json(badRequestResponse("Plan name must be one of: learner, employer, trainingInstitue", "INVALID_PLAN_NAME"));
        }

        if (updates.price !== undefined && updates.price < 0) {
            return res.json(badRequestResponse("Price must be a positive number", "INVALID_PRICE"));
        }

        if (updates.billingCycle && !['onetime', 'monthly'].includes(updates.billingCycle)) {
            return res.json(badRequestResponse("Billing cycle must be: onetime or monthly", "INVALID_BILLING_CYCLE"));
        }

        if (updates.features && (!Array.isArray(updates.features) || !updates.features.every(f => typeof f === 'string'))) {
            return res.json(badRequestResponse("Features must be an array of strings", "INVALID_FEATURES_TYPE"));
        }

        // Check if plan exists
        const existingPlan = await SubscriptionPlan.findById(id);
        if (!existingPlan) {
            return res.json(noContentResponse("Subscription plan not found", "PLAN_NOT_FOUND"));
        }

        // Check for conflicts if updating unique fields
        if (updates.name && updates.name !== existingPlan.name) {
            const nameConflict = await SubscriptionPlan.findOne({ name: updates.name });
            if (nameConflict) {
                return res.json(conflictResponse(`Plan name '${updates.name}' is already in use`, "PLAN_NAME_EXISTS"));
            }
        }

        const plan = await SubscriptionPlan.findByIdAndUpdate(
            id, 
            updates, 
            { new: true, runValidators: true }
        );

        res.json(
            successResponse({plan}, "Subscription plan updated successfully")
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
            return res.json(conflictResponse(`A plan with this ${field} already exists`, "DUPLICATE_PLAN_FIELD"));
        }throw internalServer("Failed to update subscription plan", "PLAN_UPDATE_ERROR");
    }
});

// Delete subscription plan (Admin only)
const deletePlan = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        // Validate plan ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.json(badRequestResponse("Invalid plan ID format", "INVALID_PLAN_ID"));
        }

        // Check if plan exists
        const plan = await SubscriptionPlan.findById(id);
        if (!plan) {
            return res.json(noContentResponse("Subscription plan not found", "PLAN_NOT_FOUND"));
        }

        // Check if any active subscriptions use this plan
        const activeSubscriptions = await Subscription.countDocuments({
            'plan._id': id,
            status: 'active'
        });

        if (activeSubscriptions > 0) {
            return res.json(conflictResponse(
                `Cannot delete plan with ${activeSubscriptions} active subscription(s). Cancel or transfer subscriptions first.`, 
                "PLAN_HAS_ACTIVE_SUBSCRIPTIONS"
            ));
        }

        await SubscriptionPlan.findByIdAndDelete(id);

        res.json(
            successResponse( "Subscription plan deleted successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to delete subscription plan", "PLAN_DELETE_ERROR");
    }
});

// ===========================================
// SUBSCRIPTION CONTROLLERS
// ===========================================

// Create subscription (SIMPLIFIED - no paymentMethodId needed)
const createSubscription = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { planId } = req.body; // ✅ Only planId needed

        // Check if plan exists and is active
        const plan = await SubscriptionPlan.findById(planId);
        if (!plan) {
            return res.json(badRequestResponse("Subscription plan not found", "PLAN_NOT_FOUND"));
        }

        if (!plan.isActive) {
            return res.json(badRequestResponse("Subscription plan is not active", "PLAN_INACTIVE"));
        }

        // Check if user already has an active subscription
        const existingSubscription = await Subscription.findOne({
            userId,
            status: { $in: ['active', 'pending'] }
        });

        if (existingSubscription) {
            return res.json(badRequestResponse("User already has an active subscription", "ACTIVE_SUBSCRIPTION_EXISTS"));
        }

        // Calculate billing dates
        const startDate = new Date();
        let endDate = null;
        let nextBillingDate = null;

        if (plan.billingCycle === 'monthly') {
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            nextBillingDate = endDate;
        } else {
            // For one-time plans, set end date far in the future
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 10);
        }

        // ✅ REMOVED: All Stripe customer creation logic from here
        // It now happens in createPaymentIntent

        // Check if user clicked on free plan
        if (plan.price === 0) {
            // For free plans, ensure billingCycle is 'onetime'
            if (plan.billingCycle !== 'onetime') {
                return res.json(badRequestResponse("Free plans must have a one-time billing cycle", "INVALID_FREE_PLAN_BILLING_CYCLE"));
            }

            const subscription = await Subscription.create({
                userId,
                planId: plan._id,
                billing: {
                    startDate,
                    endDate,
                    nextBillingDate: null, // Free plans don't renew
                    autoRenew: false
                },
                status: 'active'
            });

            // Update user role based on plan
            if (plan.name === "learner") {
                await User.findByIdAndUpdate(userId, { role: "student", status: 'approved' });
            } else if (plan.name === "employer") {
                await User.findByIdAndUpdate(userId, { role: "employer", status: 'approved' });
            } else if (plan.name === "trainingInstitue") {
                await User.findByIdAndUpdate(userId, { role: "school", status: 'approved' });
            }

            return res.json(
                successResponse({subscription}, "Free subscription activated successfully")
            );
        }

        // Create subscription (simplified - no Stripe logic)
        const subscription = await Subscription.create({
            userId,
            planId: plan._id,
            billing: {
                startDate,
                endDate,
                nextBillingDate,
                autoRenew: plan.billingCycle === 'monthly'
                // ✅ No stripeCustomerId or stripePaymentMethodId
            },
            status: 'pending'
        });

        res.json(
            successResponse({subscription}, "Subscription created successfully")
        );

    } catch (error) {
        console.error('Subscription creation error:', error);
        
        if (error instanceof ApiError) {
            throw error;
        }

        // Handle MongoDB validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.json(badRequestResponse(`Validation error: ${errors.join(', ')}`, "VALIDATION_ERROR"));
        }

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
            return res.json(
                successResponse("No subscription found for user")
            );
        }

        res.json(
            successResponse( {subscription}, "Subscription retrieved successfully")
        );
    } catch (error) {throw internalServer("Failed to fetch user subscription", "USER_SUBSCRIPTION_FETCH_ERROR");
    }
});

// Get all subscriptions (Admin only)
const getAllSubscriptions = asyncHandler(async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;

        // Validate pagination parameters
        if (page < 1) {
            return res.json(badRequestResponse("Page number must be greater than 0", "INVALID_PAGE_NUMBER"));
        }
        if (limit < 1 || limit > 100) {
            return res.json(badRequestResponse("Limit must be between 1 and 100", "INVALID_LIMIT"));
        }

        const filter = {};
        if (status) {
            const validStatuses = ["active", "inactive", "cancelled", "expired", "pending"];
            if (!validStatuses.includes(status)) {
                return res.json(badRequestResponse(`Status must be one of: ${validStatuses.join(', ')}`, "INVALID_STATUS"));
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

        res.json(
            successResponse( {
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
        if (error instanceof ApiError) throw error;throw internalServer("Failed to fetch subscriptions", "SUBSCRIPTIONS_FETCH_ERROR");
    }
});

// Update subscription status (Admin only)
const updateSubscriptionStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate subscription ID
        if (!id.match(/^[0-9a-fA-F]{24}$/)) {
            return res.json(badRequestResponse("Invalid subscription ID format", "INVALID_SUBSCRIPTION_ID"));
        }

        // Validate status
        if (!status) {
            return res.json(badRequestResponse("Status is required", "MISSING_STATUS"));
        }

        const validStatuses = ["active", "inactive", "cancelled", "expired", "pending"];
        if (!validStatuses.includes(status)) {
            return res.json(badRequestResponse(`Status must be one of: ${validStatuses.join(', ')}`, "INVALID_STATUS"));
        }

        // Check if subscription exists
        const existingSubscription = await Subscription.findById(id);
        if (!existingSubscription) {
            return res.json(noContentResponse("Subscription not found", "SUBSCRIPTION_NOT_FOUND"));
        }

        // Validate status transition
        if (existingSubscription.status === status) {
            return res.json(conflictResponse(`Subscription is already ${status}`, "STATUS_UNCHANGED"));
        }

        const subscription = await Subscription.findByIdAndUpdate(
            id,
            { status, updatedAt: new Date() },
            { new: true }
        );

        res.json(
            successResponse({subscription}, "Subscription status updated successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to update subscription status", "SUBSCRIPTION_STATUS_UPDATE_ERROR");
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
            return res.json(noContentResponse("No active subscription found for this user", "ACTIVE_SUBSCRIPTION_NOT_FOUND"));
        }

        // Check if subscription is already being cancelled
        if (subscription.status === 'cancelled') {
            return res.json(conflictResponse("Subscription is already cancelled", "SUBSCRIPTION_ALREADY_CANCELLED"));
        }

        // Validate reason if provided
        if (reason && typeof reason !== 'string') {
            return res.json(badRequestResponse("Cancellation reason must be a string", "INVALID_REASON_FORMAT"));
        }

        // Update subscription with cancellation info
        subscription.status = 'cancelled';
        subscription.cancellation = {
            cancelledAt: new Date(),
            cancelledBy: userId,
            reason: reason || 'User requested cancellation'
        };

        await subscription.save();

        res.json(
            successResponse({ subscription}, "Subscription cancelled successfully")
        );
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to cancel subscription", "SUBSCRIPTION_CANCEL_ERROR");
    }
});

// ===========================================
// PAYMENT CONTROLLERS
// ===========================================

// Create payment intent (ENHANCED - handles Stripe customer & payment method)
const createPaymentIntent = asyncHandler(async (req, res) => {
    try {
        const { subscriptionId } = req.body;
        const userId = req.user._id;

        if (!subscriptionId) {
            return res.json(badRequestResponse("Subscription ID is required", "MISSING_SUBSCRIPTION_ID"));
        }

        if (!subscriptionId.match(/^[0-9a-fA-F]{24}$/)) {
            return res.json(badRequestResponse("Invalid subscription ID format", "INVALID_SUBSCRIPTION_ID"));
        }

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId,
            status: 'pending'
        });

        if (!subscription) {
            return res.json(noContentResponse("Subscription not found or not pending", "SUBSCRIPTION_NOT_FOUND_OR_NOT_PENDING"));
        }

        const plan = await SubscriptionPlan.findById(subscription.planId);
        
        // ...existing plan validation...

        // Handle free plans (unchanged)
        if (plan.price === 0) {
            subscription.status = 'active';
            await subscription.save();
            return res.json(
                successResponse({
                    subscriptionId: subscription._id
                }, "Subscription activated for free plan")
            );
        }

        // ✅ NEW: Create Stripe customer and payment intent together
        try {
            // Create or get existing Stripe customer
            let customer;
            const existingSubscription = await Subscription.findOne({
                userId,
                'billing.stripeCustomerId': { $exists: true }
            });

            if (existingSubscription?.billing?.stripeCustomerId) {
                customer = { id: existingSubscription.billing.stripeCustomerId };
            } else {
                customer = await stripe.customers.create({
                    email: req.user.email,
                    name: req.user.fullName,
                    metadata: { userId: userId.toString() }
                });
            }

            // Create payment intent (customer will provide payment method on frontend)
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(plan.price * 100),
                currency: (plan.currency || 'usd').toLowerCase(),
                customer: customer.id, // ✅ Attach to customer
                payment_method_types: ['card'],
                setup_future_usage: plan.billingCycle === 'monthly' ? 'off_session' : undefined,
                metadata: {
                    subscriptionId: subscription._id.toString(),
                    userId: userId.toString(),
                    planType: plan.billingCycle // For auto-renewal logic
                }
            });

            // ✅ Update subscription with Stripe customer ID
            subscription.billing.stripeCustomerId = customer.id;
            await subscription.save();

            res.json(
                successResponse({
                    clientSecret: paymentIntent.client_secret,
                    paymentIntentId: paymentIntent.id,
                    customerId: customer.id
                }, "Payment intent created successfully")
            );
        } catch (stripeError) {
            return res.json(badRequestResponse(`Stripe error: ${stripeError.message}`, "STRIPE_PAYMENT_INTENT_ERROR"));
        }
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to create payment intent", "PAYMENT_INTENT_CREATION_ERROR");
    }
});

// Confirm payment intent
const confirmPayment = asyncHandler(async (req, res) => {
    try {
        const { paymentIntentId, subscriptionId } = req.body;
        const userId = req.user._id;

        if (!paymentIntentId) {
            return res.json(badRequestResponse("PaymentIntent ID is required", "MISSING_PAYMENT_INTENT_ID"));
        }
        if (!subscriptionId) {
            return res.json(badRequestResponse("Subscription ID is required", "MISSING_SUBSCRIPTION_ID"));
        }

        // Verify subscription ownership & status
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId,
            status: 'pending'
        });

        if (!subscription) {
            return res.json(noContentResponse("Subscription not found or not pending", "SUBSCRIPTION_NOT_FOUND_OR_NOT_PENDING"));
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

                // Update user status to 'approved' after successful payment
                await User.findByIdAndUpdate(userId, { status: 'approved' });

                return res.json(
                    successResponse({
                        message: "Payment successful, subscription activated, and user status updated to approved",
                        paymentIntent
                    })
                );
            }

            

        } catch (stripeError) {return res.json(badRequestResponse(`Stripe error: ${stripeError.message}`, "STRIPE_PAYMENT_CONFIRMATION_ERROR"));
        }

    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to confirm payment", "PAYMENT_INTENT_CONFIRMATION_ERROR");
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
            return res.json(noContentResponse("No active subscription found for this user", "ACTIVE_SUBSCRIPTION_NOT_FOUND"));
        }

        // Validate subscription data
        if (!subscription.features) {
            return res.json(badRequestResponse("Subscription features not configured", "SUBSCRIPTION_FEATURES_MISSING"));
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

            res.json(
                successResponse({stats}, "Subscription stats retrieved successfully")
            );
        } catch (dbError) {throw internalServer("Failed to calculate usage statistics", "USAGE_CALCULATION_ERROR");
        }
    } catch (error) {
        if (error instanceof ApiError) throw error;throw internalServer("Failed to fetch subscription stats", "SUBSCRIPTION_STATS_ERROR");
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
