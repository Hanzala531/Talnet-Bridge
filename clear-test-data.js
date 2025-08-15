import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import { SubscriptionPlan } from './src/models/contents/subscriptionPlan.models.js';
import { Subscription } from './src/models/contents/subscription.models.js';

async function clearTestData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Show current data before clearing
        const planCount = await SubscriptionPlan.countDocuments();
        const subscriptionCount = await Subscription.countDocuments();
        
        console.log(`\nCurrent data:`);
        console.log(`- Subscription Plans: ${planCount}`);
        console.log(`- Subscriptions: ${subscriptionCount}`);

        if (planCount > 0) {
            const plans = await SubscriptionPlan.find({}, 'name displayName price stripePriceId');
            console.log('\nExisting plans:');
            plans.forEach(plan => {
                console.log(`  - ${plan.name} (${plan.displayName}) - $${plan.price} - Stripe: ${plan.stripePriceId}`);
            });
        }

        // Ask for confirmation
        console.log('\nCleaning up test data...');

        // Clear all subscription plans
        const deletedPlans = await SubscriptionPlan.deleteMany({});
        console.log(`✅ Deleted ${deletedPlans.deletedCount} subscription plans`);

        // Clear all subscriptions
        const deletedSubscriptions = await Subscription.deleteMany({});
        console.log(`✅ Deleted ${deletedSubscriptions.deletedCount} subscriptions`);

        console.log('\n🎉 Database cleaned successfully! You can now create new plans.');

    } catch (error) {
        console.error('❌ Error clearing test data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
        process.exit(0);
    }
}

clearTestData();
