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
 * c:
 *   post:
 *     summary: Create payment intent
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
