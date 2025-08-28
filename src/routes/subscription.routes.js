import express from "express";
import {
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
} from '../controllers/subscription.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const subscriptionRouter = express.Router();

// ===========================================
// SUBSCRIPTION PLAN ROUTES
// ===========================================

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: Get all subscription plans
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: query
 *         name: active
 *         schema:
 *           type: boolean
 *           default: true
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
 *       404:
 *         description: No subscription plans found
 */
subscriptionRouter.get('/plans', requestLogger, getAllPlans);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{id}:
 *   get:
 *     summary: Get subscription plan by ID
 *     tags: [Subscription Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan retrieved successfully
 *       404:
 *         description: Subscription plan not found
 */
subscriptionRouter.get('/plans/:id', requestLogger, getPlanById);

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   post:
 *     summary: Create a new subscription plan (Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - displayName
 *               - description
 *               - price
 *               - billingCycle
 *               - features
 *               - stripePriceId
 *               - stripeProductId
 *             properties:
 *               name:
 *                 type: string
 *                 enum: ["basic", "premium", "enterprise"]
 *                 example: "premium"
 *               displayName:
 *                 type: string
 *                 example: "Premium Plan"
 *               description:
 *                 type: string
 *                 example: "Advanced features for growing training providers"
 *               price:
 *                 type: number
 *                 example: 2999
 *               billingCycle:
 *                 type: string
 *                 enum: ["monthly", "quarterly", "yearly"]
 *                 example: "monthly"
 *               features:
 *                 type: object
 *                 properties:
 *                   maxCourses:
 *                     type: number
 *                     example: 50
 *                   maxStudents:
 *                     type: number
 *                     example: 1000
 *                   analyticsAccess:
 *                     type: boolean
 *                     example: true
 *               stripePriceId:
 *                 type: string
 *                 example: "price_1234567890"
 *               stripeProductId:
 *                 type: string
 *                 example: "prod_1234567890"
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       409:
 *         description: Plan already exists
 */
subscriptionRouter.post('/plans', requestLogger, verifyJWT, authorizeRoles('admin'), createPlan);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{id}:
 *   put:
 *     summary: Update subscription plan (Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               displayName:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               features:
 *                 type: object
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Subscription plan not found
 */
subscriptionRouter.put('/plans/:id', requestLogger, verifyJWT, authorizeRoles('admin'), updatePlan);

/**
 * @swagger
 * /api/v1/subscriptions/plans/{id}:
 *   delete:
 *     summary: Delete subscription plan (Admin only)
 *     tags: [Subscription Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan deleted successfully
 *       400:
 *         description: Cannot delete plan with active subscriptions
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Subscription plan not found
 */
subscriptionRouter.delete('/plans/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deletePlan);

// ===========================================
// SUBSCRIPTION ROUTES
// ===========================================

/**
 * @swagger
 * /api/v1/subscriptions:
 *   get:
 *     summary: Get all subscriptions (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["active", "inactive", "cancelled", "expired", "pending"]
 *         description: Filter by subscription status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of subscriptions per page
 *     responses:
 *       200:
 *         description: Subscriptions retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
subscriptionRouter.get('/', requestLogger, verifyJWT, authorizeRoles('admin'), getAllSubscriptions);

/**
 * @swagger
 * /api/v1/subscriptions/my-subscription:
 *   get:
 *     summary: Get current user's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No subscription found
 */
subscriptionRouter.get('/my-subscription', requestLogger, verifyJWT, getUserSubscription);

/**
 * @swagger
 * /api/v1/subscriptions:
 *   post:
 *     summary: Create a new subscription
 *     description: Create a new subscription for the authenticated user with a selected plan and payment details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *               - billingCycle
 *             properties:
 *               planId:
 *                 type: string
 *                 format: objectId
 *                 description: Subscription plan ID to subscribe to
 *                 example: "60d0fe4f5311236168a109ca"
 *               billingCycle:
 *                 type: string
 *                 enum: ["monthly", "yearly"]
 *                 description: Billing cycle preference
 *                 example: "monthly"
 *               paymentMethodId:
 *                 type: string
 *                 description: Stripe payment method ID for automatic billing
 *                 example: "pm_1234567890abcdef"
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code for discount
 *                 example: "FIRST20"
 *               autoRenewal:
 *                 type: boolean
 *                 description: Whether subscription should auto-renew
 *                 default: true
 *                 example: true
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Preferred start date (default is immediate)
 *                 example: "2025-09-01"
 *               companyName:
 *                 type: string
 *                 description: Company name (required for business plans)
 *                 example: "Tech Solutions Inc."
 *               taxId:
 *                 type: string
 *                 description: Tax ID or VAT number (for business plans)
 *                 example: "GB123456789"
 *           example:
 *             planId: "60d0fe4f5311236168a109ca"
 *             billingCycle: "monthly"
 *             paymentMethodId: "pm_1234567890abcdef"
 *             couponCode: "FIRST20"
 *             autoRenewal: true
 *             startDate: "2025-09-01"
 *             companyName: "Tech Solutions Inc."
 *             taxId: "GB123456789"
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Subscription created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     subscriptionId:
 *                       type: string
 *                       example: "64f789abc123def456789012"
 *                     planName:
 *                       type: string
 *                       example: "Premium Plan"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     billingCycle:
 *                       type: string
 *                       example: "monthly"
 *                     currentPeriodStart:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-28T10:30:00.000Z"
 *                     currentPeriodEnd:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-28T10:30:00.000Z"
 *                     nextBillingDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-28T10:30:00.000Z"
 *                     amount:
 *                       type: number
 *                       example: 29.99
 *                     currency:
 *                       type: string
 *                       example: "usd"
 *                     stripeSubscriptionId:
 *                       type: string
 *                       example: "sub_1234567890"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Validation error or invalid plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Invalid plan ID or payment method"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "planId"
 *                       message:
 *                         type: string
 *                         example: "Invalid plan ID format"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Subscription plan not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Subscription plan not found or inactive"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       409:
 *         description: User already has an active subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: "User already has an active subscription. Please cancel or upgrade existing subscription"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       422:
 *         description: Payment processing failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 422
 *                 message:
 *                   type: string
 *                   example: "Payment method declined. Please try a different payment method"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
subscriptionRouter.post('/', requestLogger, verifyJWT,  createSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/{id}/status:
 *   patch:
 *     summary: Update subscription status (Admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive", "cancelled", "expired", "pending"]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Subscription status updated successfully
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Subscription not found
 */
subscriptionRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('admin'), updateSubscriptionStatus);

/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   post:
 *     summary: Cancel current user's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 example: "No longer needed"
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active subscription found
 */
subscriptionRouter.post('/cancel', requestLogger, verifyJWT, cancelSubscription);

/**
 * @swagger
 * /api/v1/subscriptions/stats:
 *   get:
 *     summary: Get subscription usage statistics
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription stats retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No active subscription found
 */
subscriptionRouter.get('/stats', requestLogger, verifyJWT, getSubscriptionStats);

// ===========================================
// PAYMENT ROUTES
// ===========================================

/**
 * @swagger
 * /api/v1/subscriptions/create-payment-intent:
 *   post:
 *     summary: Create payment intent for subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
subscriptionRouter.post('/create-payment-intent', requestLogger, verifyJWT, createPaymentIntent);

/**
 * @swagger
 * /api/v1/subscriptions/confirm-payment:
 *   post:
 *     summary: Confirm payment and activate subscription
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentIntentId
 *               - subscriptionId
 *             properties:
 *               paymentIntentId:
 *                 type: string
 *                 example: "pi_1234567890"
 *               subscriptionId:
 *                 type: string
 *                 example: "60d0fe4f5311236168a109ca"
 *     responses:
 *       200:
 *         description: Payment confirmed and subscription activated
 *       400:
 *         description: Payment not successful
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
subscriptionRouter.post('/confirm-payment', requestLogger, verifyJWT, confirmPayment);

// Export the router
export default subscriptionRouter;
