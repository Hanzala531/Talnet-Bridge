import cron from 'node-cron';
import { Subscription, SubscriptionPlan } from '../models/index.js';
import stripe from '../config/stripe.config.js';

const autoRenewalJob = () => {
    // Run daily at 2 AM (adjust as needed)
    cron.schedule('0 2 * * *', async () => {
        console.log('🔄 Running auto-renewal cron job...');
        
        try {
            const now = new Date();
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            // Find subscriptions due for renewal (next billing date is today or past)
            const subscriptions = await Subscription.find({
                'billing.autoRenew': true,
                'billing.nextBillingDate': { $lte: tomorrow },
                status: 'active',
                'billing.stripeCustomerId': { $exists: true },
                'billing.stripePaymentMethodId': { $exists: true }
            }).populate('planId');
            
            console.log(`📋 Found ${subscriptions.length} subscriptions for renewal`);

            let successCount = 0;
            let failureCount = 0;

            for (const subscription of subscriptions) {
                const plan = subscription.planId;
                
                // Skip if plan is invalid or free
                if (!plan || plan.price <= 0) {
                    console.log(`⏭️ Skipping subscription ${subscription._id} - invalid or free plan`);
                    continue;
                }
                
                try {
                    console.log(`💳 Processing renewal for subscription ${subscription._id}`);
                    console.log(`   - User: ${subscription.userId}`);
                    console.log(`   - Plan: ${plan.name} ($${plan.price})`);
                    console.log(`   - Next billing date: ${subscription.billing.nextBillingDate}`);
                    
                    // Create payment intent for renewal
                    const paymentIntent = await stripe.paymentIntents.create({
                        amount: Math.round(plan.price * 100), // Convert to cents
                        currency: plan.currency || 'usd',
                        customer: subscription.billing.stripeCustomerId,
                        payment_method: subscription.billing.stripePaymentMethodId,
                        off_session: true, // Indicates this is for a payment without customer present
                        confirm: true,
                        metadata: {
                            subscriptionId: subscription._id.toString(),
                            renewalDate: now.toISOString(),
                            planId: plan._id.toString(),
                            userId: subscription.userId.toString()
                        }
                    });
                    
                    if (paymentIntent.status === 'succeeded') {
                        // Payment successful - extend subscription
                        const currentNextBilling = new Date(subscription.billing.nextBillingDate);
                        const newNextBilling = new Date(currentNextBilling);
                        newNextBilling.setMonth(newNextBilling.getMonth() + 1);
                        
                        const newEndDate = new Date(newNextBilling);
                        
                        // Update subscription
                        subscription.billing.endDate = newEndDate;
                        subscription.billing.nextBillingDate = newEndDate;
                        subscription.billing.lastBillingDate = now;
                        
                        const alreadyExists = subscription.payments.some(
                          p => p.transactionId === paymentIntent.id
                        );

                        if (!alreadyExists) {
                          // Add payment record
                          subscription.payments.push({
                              amount: plan.price,
                              currency: plan.currency || 'usd',
                              paymentDate: now,
                              paymentMethod: 'stripe',
                              transactionId: paymentIntent.id,
                              status: 'completed'
                          });
                          await subscription.save();
                        }
                        
                        console.log(`✅ Successfully renewed subscription ${subscription._id}`);
                        console.log(`   - New end date: ${newEndDate}`);
                        console.log(`   - Next billing: ${newNextBilling}`);
                        console.log(`   - Transaction ID: ${paymentIntent.id}`);
                        
                        successCount++;
                        
                        // TODO: Send renewal confirmation email to user
                        
                    } else if (paymentIntent.status === 'requires_action') {
                        console.log(`⚠️ Payment requires action for subscription ${subscription._id}: ${paymentIntent.status}`);
                        
                        // For now, mark as expired. In production, you might want to notify the user
                        subscription.status = 'expired';
                        subscription.billing.autoRenew = false;
                        
                        // Add failed payment record
                        subscription.payments.push({
                            amount: plan.price,
                            currency: plan.currency || 'usd',
                            paymentDate: now,
                            paymentMethod: 'stripe',
                            transactionId: paymentIntent.id,
                            status: 'failed'
                        });
                        
                        await subscription.save();
                        failureCount++;
                        
                    } else {
                        console.log(`❌ Payment not successful for subscription ${subscription._id}: ${paymentIntent.status}`);
                        
                        // Mark subscription as expired
                        subscription.status = 'expired';
                        subscription.billing.autoRenew = false;
                        
                        // Add failed payment record
                        subscription.payments.push({
                            amount: plan.price,
                            currency: plan.currency || 'usd',
                            paymentDate: now,
                            paymentMethod: 'stripe',
                            transactionId: paymentIntent.id,
                            status: 'failed'
                        });
                        
                        await subscription.save();
                        failureCount++;
                        
                        // TODO: Send payment failure notification to user
                    }
                    
                } catch (paymentError) {
                    console.error(`💥 Error processing renewal for subscription ${subscription._id}:`, paymentError.message);
                    
                    // Check if it's a card-related error
                    if (paymentError.code === 'card_declined' || 
                        paymentError.code === 'insufficient_funds' ||
                        paymentError.code === 'expired_card') {
                        
                        console.log(`💳 Card issue detected: ${paymentError.code}`);
                        
                        // Mark subscription as expired on payment error
                        subscription.status = 'expired';
                        subscription.billing.autoRenew = false;
                        
                        // Add failed payment record
                        subscription.payments.push({
                            amount: plan.price,
                            currency: plan.currency || 'usd',
                            paymentDate: now,
                            paymentMethod: 'stripe',
                            transactionId: null,
                            status: 'failed'
                        });
                        
                        await subscription.save();
                        failureCount++;
                        
                        // TODO: Send payment failure notification to user
                    } else {
                        // For other errors, you might want to retry later
                        console.log(`🔄 Temporary error, will retry next time: ${paymentError.message}`);
                    }
                }
                
                // Small delay between processing subscriptions to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log('🏁 Auto-renewal cron job completed');
            console.log(`📊 Results: ${successCount} successful, ${failureCount} failed`);
            
        } catch (error) {
            console.error('🚨 Auto-renewal cron job error:', error);
        }
    });
};

// Manual test function for development
export const testAutoRenewal = async () => {
    console.log('🧪 Testing auto-renewal manually...');
    let successCount = 0;
    let failureCount = 0;

    try {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const subscriptions = await Subscription.find({
            'billing.autoRenew': true,
            'billing.nextBillingDate': { $lte: tomorrow },
            status: 'active',
            'billing.stripeCustomerId': { $exists: true },
            'billing.stripePaymentMethodId': { $exists: true }
        }).populate('planId');

        for (const subscription of subscriptions) {
            const plan = subscription.planId;
            if (!plan || plan.price <= 0) continue;

            try {
                const paymentIntent = await stripe.paymentIntents.create({
                    amount: Math.round(plan.price * 100),
                    currency: plan.currency || 'usd',
                    customer: subscription.billing.stripeCustomerId,
                    payment_method: subscription.billing.stripePaymentMethodId,
                    off_session: true,
                    confirm: true,
                    metadata: {
                        subscriptionId: subscription._id.toString(),
                        renewalDate: now.toISOString(),
                        planId: plan._id.toString(),
                        userId: subscription.userId.toString()
                    }
                });

                if (paymentIntent.status === 'succeeded') {
                    const currentNextBilling = new Date(subscription.billing.nextBillingDate);
                    const newNextBilling = new Date(currentNextBilling);
                    newNextBilling.setMonth(newNextBilling.getMonth() + 1);
                    const newEndDate = new Date(newNextBilling);

                    subscription.billing.endDate = newEndDate;
                    subscription.billing.nextBillingDate = newNextBilling;
                    subscription.billing.lastBillingDate = now;


                    successCount++;
                } else {
                    subscription.status = 'expired';
                    subscription.billing.autoRenew = false;
                    subscription.payments.push({
                        amount: plan.price,
                        currency: plan.currency || 'usd',
                        paymentDate: now,
                        paymentMethod: 'stripe',
                        transactionId: paymentIntent.id,
                        status: 'failed'
                    });
                    await subscription.save();
                    failureCount++;
                }
            } catch (paymentError) {
                subscription.status = 'expired';
                subscription.billing.autoRenew = false;
                subscription.payments.push({
                    amount: plan.price,
                    currency: plan.currency || 'usd',
                    paymentDate: now,
                    paymentMethod: 'stripe',
                    transactionId: null,
                    status: 'failed'
                });
                await subscription.save();
                failureCount++;
            }
        }

        return { success: true, renewedSubscriptions: successCount, failedSubscriptions: failureCount };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const startAutoRenewal = () => {
    console.log('🚀 Auto-renewal cron job initialized');
    
    autoRenewalJob();
    
    console.log('🚀 Auto-renewal cron job started - runs daily at 2 AM');
    console.log(`🕒 Current time: ${new Date().toISOString()}`);
    console.log('🔍 Next run will be at 2:00 AM');
};
