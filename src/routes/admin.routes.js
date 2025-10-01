import { Router } from "express";
import { registerAdmin } from "../controllers/admin.Controller.js";
import { requestLogger } from "../middlewares/ReqLog.middlewares.js";
import { authorizeRoles } from "../middlewares/Role.middlewares.js"
import { triggerSubscriptionCleanup } from "../controllers/admin.controllers.js";
import { verifyJWT } from "../middlewares/Auth.middlewares.js";
import { Subscription, SubscriptionPlan } from "../models/index.js";
import { testAutoRenewal } from "../cronJobs/autoRenewal.js";

const adminRouter = Router();

/**
 * @swagger
 * /api/v1/admin/registerAdmin:
 *   post:
 *     summary: Register a new admin
 *     description: Create a new admin user account (internal use only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Admin User"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "StrongPassword123!"
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Admin registered successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       type: object
 *                       example:
 *                         _id: "68ac075a03b1574c514c9fa1"
 *                         fullName: "Admin User"
 *                         email: "admin@example.com"
 *                         role: "admin"
 *                         createdAt: "2025-08-25T06:48:58.537Z"
 *                         updatedAt: "2025-08-25T06:48:58.537Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Admin already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
adminRouter.post('/registerAdmin' , requestLogger ,  registerAdmin)

// Manual cleanup route (for testing)
adminRouter.post("/cleanup-subscriptions", triggerSubscriptionCleanup);

// Check current subscription status for renewal testing
adminRouter.get('/check-renewals', verifyJWT , async (req, res) => {
    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Get all subscriptions
        const allSubs = await Subscription.find({}).populate('planId');
        
        // Check which ones would be eligible for renewal
        const eligibleSubs = await Subscription.find({
            'billing.autoRenew': true,
            'billing.nextBillingDate': { $lte: tomorrow },
            status: 'active',
            'billing.stripeCustomerId': { $exists: true },
            'billing.stripePaymentMethodId': { $exists: true }
        }).populate('planId');
        
        res.json({
            success: true,
            data: {
                currentTime: now.toISOString(),
                totalSubscriptions: allSubs.length,
                eligibleForRenewal: eligibleSubs.length,
                subscriptions: allSubs.map(sub => ({
                    id: sub._id,
                    userId: sub.userId,
                    planName: sub.planId?.name || 'Unknown',
                    planPrice: sub.planId?.price || 0,
                    status: sub.status,
                    autoRenew: sub.billing?.autoRenew,
                    nextBillingDate: sub.billing?.nextBillingDate,
                    endDate: sub.billing?.endDate,
                    hasStripeCustomer: !!sub.billing?.stripeCustomerId,
                    hasPaymentMethod: !!sub.billing?.stripePaymentMethodId,
                    isEligible: !!(
                        sub.billing?.autoRenew && 
                        sub.billing?.nextBillingDate && 
                        sub.billing?.nextBillingDate <= tomorrow &&
                        sub.status === 'active' &&
                        sub.billing?.stripeCustomerId &&
                        sub.billing?.stripePaymentMethodId
                    )
                }))
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Fix specific subscription for testing
adminRouter.patch('/fix-subscription/:id', verifyJWT, authorizeRoles(['admin']), async (req, res) => {
    try {
        const { id } = req.params;
        
        const now = new Date();
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const subscription = await Subscription.findByIdAndUpdate(
            id,
            {
                $set: {
                    "billing.nextBillingDate": now, // Set to now for immediate testing
                    "billing.endDate": nextMonth,
                    "billing.stripeCustomerId": "cus_test_12345",
                    "billing.stripePaymentMethodId": "pm_card_visa", // Stripe test card
                    "billing.autoRenew": true,
                    "status": "active"
                }
            },
            { new: true }
        ).populate('planId');
        
        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: 'Subscription not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Subscription updated for testing',
            data: {
                id: subscription._id,
                planName: subscription.planId?.name,
                planPrice: subscription.planId?.price,
                nextBillingDate: subscription.billing.nextBillingDate,
                endDate: subscription.billing.endDate,
                stripeCustomerId: subscription.billing.stripeCustomerId,
                stripePaymentMethodId: subscription.billing.stripePaymentMethodId,
                autoRenew: subscription.billing.autoRenew,
                status: subscription.status
            }
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Test auto-renewal logic manually
adminRouter.post('/test-auto-renewal', verifyJWT, async (req, res) => {
    try {
        console.log('🧪 Manual auto-renewal test triggered by admin');
        
        const result = await testAutoRenewal();
        
        res.json({
            success: true,
            message: 'Auto-renewal test completed',
            data: result
        });
        
    } catch (error) {
        console.error('🚨 Auto-renewal test error:', error);
        res.status(500).json({
            success: false,
            message: 'Auto-renewal test failed',
            error: error.message
        });
    }
});

export default adminRouter;