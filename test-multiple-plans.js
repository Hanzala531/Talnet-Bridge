import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import models
import { SubscriptionPlan } from './src/models/contents/subscriptionPlan.models.js';

async function testMultiplePlans() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Test Plan 1: Basic
        console.log('\n1️⃣ Creating Basic Plan...');
        try {
            const basicPlan = await SubscriptionPlan.create({
                name: "basic",
                displayName: "Basic Plan",
                description: "Perfect for small training providers",
                price: 19.99,
                billingCycle: "monthly",
                features: {
                    maxCourses: 5,
                    maxStudents: 50,
                    analyticsAccess: false,
                    prioritySupport: false,
                    customBranding: false,
                    apiAccess: false,
                    certificateTemplates: 1,
                    storageGB: 5
                },
                stripePriceId: "price_1ABC123Basic",
                stripeProductId: "prod_XYZ789Basic"
            });
            console.log(`✅ Basic plan created: ${basicPlan._id}`);
        } catch (error) {
            console.log(`❌ Basic plan failed: ${error.message}`);
        }

        // Test Plan 2: Premium
        console.log('\n2️⃣ Creating Premium Plan...');
        try {
            const premiumPlan = await SubscriptionPlan.create({
                name: "premium",
                displayName: "Premium Plan", 
                description: "Advanced features for growing institutes",
                price: 49.99,
                billingCycle: "monthly",
                features: {
                    maxCourses: 25,
                    maxStudents: 250,
                    analyticsAccess: true,
                    prioritySupport: true,
                    customBranding: true,
                    apiAccess: false,
                    certificateTemplates: 5,
                    storageGB: 50
                },
                stripePriceId: "price_1DEF456Premium",
                stripeProductId: "prod_GHI789Premium"
            });
            console.log(`✅ Premium plan created: ${premiumPlan._id}`);
        } catch (error) {
            console.log(`❌ Premium plan failed: ${error.message}`);
        }

        // Test Plan 3: Enterprise
        console.log('\n3️⃣ Creating Enterprise Plan...');
        try {
            const enterprisePlan = await SubscriptionPlan.create({
                name: "enterprise",
                displayName: "Enterprise Plan",
                description: "Complete solution for large organizations", 
                price: 99.99,
                billingCycle: "monthly",
                features: {
                    maxCourses: -1,
                    maxStudents: -1,
                    analyticsAccess: true,
                    prioritySupport: true,
                    customBranding: true,
                    apiAccess: true,
                    certificateTemplates: -1,
                    storageGB: -1
                },
                stripePriceId: "price_1JKL890Enterprise",
                stripeProductId: "prod_MNO123Enterprise"
            });
            console.log(`✅ Enterprise plan created: ${enterprisePlan._id}`);
        } catch (error) {
            console.log(`❌ Enterprise plan failed: ${error.message}`);
        }

        // Show all plans
        console.log('\n📋 All Plans in Database:');
        const allPlans = await SubscriptionPlan.find({});
        allPlans.forEach(plan => {
            console.log(`   - ${plan.name}: ${plan.displayName} ($${plan.price})`);
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
        process.exit(0);
    }
}

testMultiplePlans();
