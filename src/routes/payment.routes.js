import express from "express";
import {
    createPaymentIntent,
    confirmPayment
} from '../controllers/subscription.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';

const paymentRouter = express.Router();

/**
 * @swagger
 * /api/v1/payments/create-intent:
 *   post:
 *     summary: Create payment intent
 *     description: Create a Stripe payment intent for subscription or course payment processing
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
 *               - amount
 *               - currency
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 format: objectId
 *                 description: Subscription plan ID to purchase
 *                 example: "60d0fe4f5311236168a109ca"
 *               amount:
 *                 type: number
 *                 minimum: 0.5
 *                 multipleOf: 0.01
 *                 description: Payment amount in the specified currency
 *                 example: 99.99
 *               currency:
 *                 type: string
 *                 enum: ["usd", "eur", "gbp", "pkr"]
 *                 description: Payment currency code
 *                 default: "usd"
 *                 example: "usd"
 *               paymentType:
 *                 type: string
 *                 enum: ["subscription", "course", "certification"]
 *                 description: Type of payment being processed
 *                 example: "subscription"
 *               courseId:
 *                 type: string
 *                 format: objectId
 *                 description: Course ID (required if paymentType is 'course')
 *                 example: "64f456def789abc123456789"
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code for discount
 *                 example: "SAVE20"
 *               savePaymentMethod:
 *                 type: boolean
 *                 description: Whether to save payment method for future use
 *                 default: false
 *                 example: true
 *           example:
 *             subscriptionId: "60d0fe4f5311236168a109ca"
 *             amount: 99.99
 *             currency: "usd"
 *             paymentType: "subscription"
 *             couponCode: "SAVE20"
 *             savePaymentMethod: true
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Payment intent created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     clientSecret:
 *                       type: string
 *                       description: Stripe client secret for frontend processing
 *                       example: "pi_1234567890_secret_abcdef123456"
 *                     paymentIntentId:
 *                       type: string
 *                       example: "pi_1234567890"
 *                     amount:
 *                       type: number
 *                       example: 99.99
 *                     currency:
 *                       type: string
 *                       example: "usd"
 *                     status:
 *                       type: string
 *                       example: "requires_payment_method"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Validation error or invalid payment details
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
 *                   example: "Invalid payment amount or subscription not found"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Subscription or course not found
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
 *                   example: "Subscription plan not found"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
paymentRouter.post('/create-intent', requestLogger, verifyJWT, createPaymentIntent);

/**
 * @swagger
 * /api/v1/payments/confirm:
 *   post:
 *     summary: Confirm payment
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
 *         description: Payment confirmed successfully
 *       400:
 *         description: Payment not successful
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 */
paymentRouter.post('/confirm', requestLogger, verifyJWT, confirmPayment);

/**
 * @swagger
 * /api/v1/payments/webhook:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */
paymentRouter.post('/webhook', requestLogger, (req, res) => {
    // Webhook handler would go here
    // This would handle Stripe webhook events like successful payments, failed payments, etc.
    res.status(200).json({ received: true });
});

// Export the router
export default paymentRouter;
