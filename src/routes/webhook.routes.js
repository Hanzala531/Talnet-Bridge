import express from "express";
import { 
    handleStripeWebhook,
    handlePaymentSuccess,
    handlePaymentFailed,
    handleSubscriptionUpdated,
    handleInvoicePaymentSucceeded,
    handleInvoicePaymentFailed
} from '../controllers/webhook.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';

const webhookRouter = express.Router();

/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Stripe webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature or payload
 *       500:
 *         description: Internal server error
 */
webhookRouter.post('/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Internal webhook handlers (for testing)
webhookRouter.post('/payment/success', requestLogger, handlePaymentSuccess);
webhookRouter.post('/payment/failed', requestLogger, handlePaymentFailed);
webhookRouter.post('/subscription/updated', requestLogger, handleSubscriptionUpdated);
webhookRouter.post('/invoice/payment_succeeded', requestLogger, handleInvoicePaymentSucceeded);
webhookRouter.post('/invoice/payment_failed', requestLogger, handleInvoicePaymentFailed);

export default webhookRouter;
