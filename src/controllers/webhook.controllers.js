import stripe from "../config/stripe.config.js";
import { Subscription, SubscriptionPlan, User, Notification } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { successResponse } from "../utils/ApiResponse.js";

// Main Stripe webhook handler
const handleStripeWebhook = async (req, res) => {
  try {
    const event = req.body; // Parsed Stripe event

    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        const subscriptionId = paymentIntent.metadata.subscriptionId;
        const userId = paymentIntent.metadata.userId;

        if (subscriptionId && userId) {
          console.log('🔍 Webhook - Processing payment_intent.succeeded');
          console.log('🔍 PaymentIntent ID:', paymentIntent.id);
          console.log('🔍 Payment Method:', paymentIntent.payment_method);
          console.log('🔍 Subscription ID:', subscriptionId);

          const subscription = await Subscription.findById(subscriptionId);
          if (subscription) {
            // ✅ Update subscription status
            subscription.status = 'active';

            // ✅ Add payment record (same as confirmPayment)
            const paymentRecord = {
              amount: paymentIntent.amount / 100,
              currency: paymentIntent.currency,
              paymentDate: new Date(),
              paymentMethod: 'card',
              transactionId: paymentIntent.id,
              status: 'completed'
            };
            
            subscription.payments.push(paymentRecord);
            console.log('✅ Webhook - Added payment record:', paymentRecord);

            // ✅ Store payment method ID for renewals
            if (paymentIntent.payment_method) {
              subscription.billing.stripePaymentMethodId = paymentIntent.payment_method;
              console.log('✅ Webhook - Set payment method ID:', paymentIntent.payment_method);
            } else {
              console.warn('⚠️ Webhook - PaymentIntent has no payment_method');
            }

            try {
              await subscription.save();
              console.log('✅ Webhook - Subscription saved successfully');
            } catch (saveError) {
              console.error('❌ Webhook - Subscription save error:', saveError);
              return res.status(400).json({ error: 'Failed to save subscription' });
            }

            // ✅ Update user role based on plan
            try {
              const plan = await SubscriptionPlan.findById(subscription.planId);
              let userUpdate = { status: 'approved' };
              
              if (plan?.name === "learner") {
                userUpdate.role = "student";
              } else if (plan?.name === "employer") {
                userUpdate.role = "employer";
              } else if (plan?.name === "trainingInstitue") {
                userUpdate.role = "school";
              }

              await User.findByIdAndUpdate(userId, userUpdate);
              console.log('✅ Webhook - User role updated:', userUpdate);
            } catch (userError) {
              console.error('❌ Webhook - User update error:', userError);
            }

            // ✅ Send notification
            try {
              const user = await User.findById(userId).select('fullName').lean();
              if (user) {
                await createNotification({
                  recipient: userId,
                  title: "Payment Successful",
                  message: "Your payment has been confirmed, and your subscription is now active.",
                  type: "payment_success",
                  priority: "normal",
                });
              }
            } catch (notifError) {
              console.error('❌ Webhook - Notification error:', notifError);
            }
          }

          console.log(`✅ Webhook - Updated subscription ${subscriptionId} to active`);
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        await handlePaymentIntentFailed(failedPaymentIntent);
        break;

      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        await handleInvoicePaymentSucceededWebhook(invoice);
        break;

      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        await handleInvoicePaymentFailedWebhook(failedInvoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook handler failed' });
  }
};

// Handle successful payment intent
const handlePaymentIntentSucceeded = async (paymentIntent) => {
    try {
        const { metadata } = paymentIntent;
        
        if (metadata.subscriptionId) {
            const subscription = await Subscription.findById(metadata.subscriptionId);
            
            if (subscription) {
                // Update subscription status to active
                subscription.status = 'active';
                subscription.payments.push({
                    amount: paymentIntent.amount / 100, // Convert from cents
                    currency: paymentIntent.currency,
                    paymentMethod: 'stripe',
                    transactionId: paymentIntent.id,
                    status: 'completed',
                    paidAt: new Date()
                });
                
                await subscription.save();

                // Create notification for user
                await createNotification(
                    subscription.userId,
                    'payment_success',
                    'Payment Successful',
                    `Your payment of ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)} has been processed successfully.`,
                    { paymentIntentId: paymentIntent.id, subscriptionId: subscription._id }
                );}
        }
    } catch (error) {}
};

// Handle failed payment intent
const handlePaymentIntentFailed = async (paymentIntent) => {
    try {
        const { metadata } = paymentIntent;
        
        if (metadata.subscriptionId) {
            const subscription = await Subscription.findById(metadata.subscriptionId);
            
            if (subscription) {
                // Add failed payment record
                subscription.payments.push({
                    amount: paymentIntent.amount / 100,
                    currency: paymentIntent.currency,
                    paymentMethod: 'stripe',
                    transactionId: paymentIntent.id,
                    status: 'failed',
                    paidAt: new Date()
                });
                
                await subscription.save();

                // Create notification for user
                await createNotification(
                    subscription.userId,
                    'payment_failed',
                    'Payment Failed',
                    `Your payment of ${paymentIntent.currency.toUpperCase()} ${(paymentIntent.amount / 100).toFixed(2)} could not be processed. Please update your payment method.`,
                    { paymentIntentId: paymentIntent.id, subscriptionId: subscription._id }
                );}
        }
    } catch (error) {}
};

// Handle invoice payment succeeded
const handleInvoicePaymentSucceededWebhook = async (invoice) => {
    try {
        const { subscription: stripeSubscriptionId, customer } = invoice;
        
        // Find subscription by Stripe subscription ID or customer ID
        const subscription = await Subscription.findOne({
            $or: [
                { 'metadata.stripeSubscriptionId': stripeSubscriptionId },
                { 'metadata.stripeCustomerId': customer }
            ]
        });

        if (subscription) {
            // Update subscription status and add payment record
            subscription.status = 'active';
            subscription.payments.push({
                amount: invoice.amount_paid / 100,
                currency: invoice.currency,
                paymentMethod: 'stripe',
                transactionId: invoice.id,
                status: 'completed',
                paidAt: new Date(invoice.status_transitions.paid_at * 1000)
            });

            // Update next billing date
            if (invoice.period_end) {
                subscription.billing.nextBillingDate = new Date(invoice.period_end * 1000);
            }

            await subscription.save();

            // Create notification
            await createNotification(
                subscription.userId,
                'invoice_paid',
                'Invoice Paid Successfully',
                `Your invoice for ${invoice.currency.toUpperCase()} ${(invoice.amount_paid / 100).toFixed(2)} has been paid successfully.`,
                { invoiceId: invoice.id, subscriptionId: subscription._id }
            );
        }
    } catch (error) {}
};

// Handle invoice payment failed
const handleInvoicePaymentFailedWebhook = async (invoice) => {
    try {
        const { subscription: stripeSubscriptionId, customer } = invoice;
        
        const subscription = await Subscription.findOne({
            $or: [
                { 'metadata.stripeSubscriptionId': stripeSubscriptionId },
                { 'metadata.stripeCustomerId': customer }
            ]
        });

        if (subscription) {
            // Add failed payment record
            subscription.payments.push({
                amount: invoice.amount_due / 100,
                currency: invoice.currency,
                paymentMethod: 'stripe',
                transactionId: invoice.id,
                status: 'failed',
                paidAt: new Date()
            });

            await subscription.save();

            // Create notification
            await createNotification(
                subscription.userId,
                'invoice_failed',
                'Invoice Payment Failed',
                `Your invoice payment of ${invoice.currency.toUpperCase()} ${(invoice.amount_due / 100).toFixed(2)} failed. Please update your payment method.`,
                { invoiceId: invoice.id, subscriptionId: subscription._id }
            );
        }
    } catch (error) {}
};

// Handle customer subscription updated
const handleCustomerSubscriptionUpdated = async (stripeSubscription) => {
    try {
        const subscription = await Subscription.findOne({
            'metadata.stripeSubscriptionId': stripeSubscription.id
        });

        if (subscription) {
            // Update subscription status based on Stripe status
            const statusMap = {
                'active': 'active',
                'canceled': 'cancelled',
                'incomplete': 'pending',
                'incomplete_expired': 'expired',
                'past_due': 'inactive',
                'unpaid': 'inactive'
            };

            const newStatus = statusMap[stripeSubscription.status] || 'inactive';
            
            if (subscription.status !== newStatus) {
                subscription.status = newStatus;
                await subscription.save();

                // Create notification
                await createNotification(
                    subscription.userId,
                    'subscription_updated',
                    'Subscription Updated',
                    `Your subscription status has been updated to ${newStatus}.`,
                    { subscriptionId: subscription._id, stripeStatus: stripeSubscription.status }
                );
            }
        }
    } catch (error) {}
};

// Handle customer subscription deleted
const handleCustomerSubscriptionDeleted = async (stripeSubscription) => {
    try {
        const subscription = await Subscription.findOne({
            'metadata.stripeSubscriptionId': stripeSubscription.id
        });

        if (subscription) {
            subscription.status = 'cancelled';
            subscription.cancellation = {
                cancelledAt: new Date(),
                reason: 'Cancelled via Stripe'
            };
            
            await subscription.save();

            // Create notification
            await createNotification(
                subscription.userId,
                'subscription_cancelled',
                'Subscription Cancelled',
                'Your subscription has been cancelled. You will continue to have access until the end of your current billing period.',
                { subscriptionId: subscription._id }
            );
        }
    } catch (error) {}
};

// Handle subscription trial will end
const handleSubscriptionTrialWillEnd = async (stripeSubscription) => {
    try {
        const subscription = await Subscription.findOne({
            'metadata.stripeSubscriptionId': stripeSubscription.id
        });

        if (subscription) {
            // Create notification
            await createNotification(
                subscription.userId,
                'trial_ending',
                'Trial Ending Soon',
                'Your trial period will end soon. Please add a payment method to continue your subscription.',
                { 
                    subscriptionId: subscription._id,
                    trialEnd: new Date(stripeSubscription.trial_end * 1000)
                }
            );
        }
    } catch (error) {}
};

// Helper function to create notifications
const createNotification = async (userId, type, title, message, metadata = {}) => {
    try {
        await Notification.create({
            userId,
            type,
            title,
            message,
            metadata,
            isRead: false
        });
    } catch (error) {}
};

// Test webhook handlers (for development)
const handlePaymentSuccess = asyncHandler(async (req, res) => {
    const { subscriptionId, paymentIntentId } = req.body;
    
    await handlePaymentIntentSucceeded({
        id: paymentIntentId,
        amount: 2999, // $29.99 in cents
        currency: 'usd',
        metadata: { subscriptionId }
    });

    res.status(200).json(
        new successResponse(200, null, "Payment success webhook processed")
    );
});

const handlePaymentFailed = asyncHandler(async (req, res) => {
    const { subscriptionId, paymentIntentId } = req.body;
    
    await handlePaymentIntentFailed({
        id: paymentIntentId,
        amount: 2999,
        currency: 'usd',
        metadata: { subscriptionId }
    });

    res.status(200).json(
        new successResponse(200, null, "Payment failed webhook processed")
    );
});

const handleSubscriptionUpdated = asyncHandler(async (req, res) => {
    const { subscriptionId, status } = req.body;
    
    await handleCustomerSubscriptionUpdated({
        id: subscriptionId,
        status: status || 'active'
    });

    res.status(200).json(
        new successResponse(200, null, "Subscription updated webhook processed")
    );
});

const handleInvoicePaymentSucceeded = asyncHandler(async (req, res) => {
    const { subscriptionId, invoiceId } = req.body;
    
    await handleInvoicePaymentSucceededWebhook({
        id: invoiceId,
        subscription: subscriptionId,
        amount_paid: 2999,
        currency: 'usd',
        status_transitions: { paid_at: Math.floor(Date.now() / 1000) },
        period_end: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // +30 days
    });

    res.status(200).json(
        new successResponse(200, null, "Invoice payment succeeded webhook processed")
    );
});

const handleInvoicePaymentFailed = asyncHandler(async (req, res) => {
    const { subscriptionId, invoiceId } = req.body;
    
    await handleInvoicePaymentFailedWebhook({
        id: invoiceId,
        subscription: subscriptionId,
        amount_due: 2999,
        currency: 'usd'
    });

    res.status(200).json(
        new successResponse(200, null, "Invoice payment failed webhook processed")
    );
});

export {
    handleStripeWebhook,
    handlePaymentSuccess,
    handlePaymentFailed,
    handleSubscriptionUpdated,
    handleInvoicePaymentSucceeded,
    handleInvoicePaymentFailed
};
