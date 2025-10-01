import cron from 'node-cron';
import mongoose from 'mongoose';
import { Subscription } from '../models/index.js';
import { User } from '../models/contents/User.models.js';
import { Course } from '../models/contents/course.models.js';
import { Enrollment } from '../models/contents/enrollments.models.js';
import { TrainingInstitute } from '../models/contents/trainingInstitute.models.js';

// Define the cleanup function separately
const performCleanup = async () => {
    console.log('🧹 Starting subscription cleanup job at:', new Date().toISOString());
    
    try {
        // Debug: Let's see what cancelled subscriptions we have
        const allCancelledSubs = await Subscription.find({ status: 'cancelled' });
        console.log('🔍 All cancelled subscriptions found:', allCancelledSubs.length);
        
        // Log the billing structure to understand the schema
        if (allCancelledSubs.length > 0) {
            console.log('📋 Sample billing structure:', JSON.stringify(allCancelledSubs[0].billing, null, 2));
        }

        // Find cancelled subscriptions that have passed their end date
        // Try multiple possible field names for end date
        const expiredCancelledSubscriptions = await Subscription.find({
            $and: [
                { status: 'cancelled' },
                {
                    $or: [
                        { 'billing.endDate': { $lt: new Date() } },
                        { 'billing.end_date': { $lt: new Date() } },
                        { 'endDate': { $lt: new Date() } },
                        { 'end_date': { $lt: new Date() } },
                        // If no end date field exists, check if cancelled more than 1 day ago
                        { 
                            'cancellation.cancelledAt': { 
                                $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) 
                            } 
                        }
                    ]
                }
            ]
        }).populate('userId');

        // Find expired subscriptions
        const expiredSubscriptions = await Subscription.find({
            $and: [
                { status: 'expired' },
                {
                    $or: [
                        { 'billing.endDate': { $lt: new Date() } },
                        { 'billing.end_date': { $lt: new Date() } },
                        { 'endDate': { $lt: new Date() } },
                        { 'end_date': { $lt: new Date() } }
                    ]
                }
            ]
        }).populate('userId');

        // For immediate testing - find subscriptions cancelled more than 5 minutes ago
        const testCancelledSubscriptions = await Subscription.find({
            $and: [
                { status: 'cancelled' },
                { 
                    'cancellation.cancelledAt': { 
                        $lt: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
                    } 
                }
            ]
        }).populate('userId');

        console.log(`🔍 Found ${expiredCancelledSubscriptions.length} expired cancelled subscriptions`);
        console.log(`🔍 Found ${expiredSubscriptions.length} expired subscriptions`);
        console.log(`🔍 Found ${testCancelledSubscriptions.length} test cancelled subscriptions (>5min old)`);

        // Combine all arrays - for testing, include the test subscriptions
        const subscriptionsToCleanup = [
            ...expiredCancelledSubscriptions, 
            ...expiredSubscriptions,
            ...testCancelledSubscriptions
        ];

        // Remove duplicates
        const uniqueSubscriptions = subscriptionsToCleanup.filter((sub, index, self) => 
            index === self.findIndex(s => s._id.toString() === sub._id.toString())
        );

        if (uniqueSubscriptions.length === 0) {
            console.log('✅ No subscriptions to cleanup');
            return;
        }

        console.log(`🔍 Found ${uniqueSubscriptions.length} unique subscriptions to cleanup`);

        for (const subscription of uniqueSubscriptions) {
            if (!subscription.userId) {
                console.log(`⚠️ Subscription ${subscription._id} has no associated user, skipping...`);
                continue;
            }

            const userId = subscription.userId._id;
            const userRole = subscription.userId.role;

            console.log(`🗑️ Cleaning up user: ${subscription.userId.email} (${userRole})`);
            console.log(`📅 Subscription cancelled at: ${subscription.cancellation?.cancelledAt}`);

            try {
                // Start a transaction for data consistency
                const session = await mongoose.startSession();
                await session.withTransaction(async () => {
                    
                    // 1. Handle role-specific cleanup
                    if (userRole === 'school') {
                        await cleanupSchoolData(userId, session);
                    } else if (userRole === 'student') {
                        await cleanupStudentData(userId, session);
                    } else if (userRole === 'employer') {
                        await cleanupEmployerData(userId, session);
                    }

                    // 2. Delete the subscription
                    await Subscription.deleteOne({ _id: subscription._id }, { session });

                    // 3. Delete the user
                    await User.deleteOne({ _id: userId }, { session });

                    console.log(`✅ Successfully cleaned up user ${subscription.userId.email}`);
                });

                await session.endSession();

            } catch (error) {
                console.error(`❌ Error cleaning up user ${subscription.userId.email}:`, error);
            }
        }

        console.log('🎉 Subscription cleanup job completed successfully');

    } catch (error) {
        console.error('❌ Error in subscription cleanup job:', error);
        throw error;
    }
};

// Cron job to cleanup cancelled/expired subscriptions and delete related data
const subscriptionCleanupJob = cron.schedule('*/5 * * * *', performCleanup, {
    scheduled: false, // Don't start automatically
    timezone: "UTC"
});

// Helper function to cleanup school/training institute data
async function cleanupSchoolData(userId, session) {
    try {
        console.log(`🏫 Starting school data cleanup for user: ${userId}`);
        
        // 1. Find the training institute profile
        const trainingInstitute = await TrainingInstitute.findOne({ userId }).session(session);
        
        if (trainingInstitute) {
            console.log(`🏫 Found training institute: ${trainingInstitute.name || trainingInstitute._id}`);
            
            // 2. Find all courses by this training institute
            const courses = await Course.find({ trainingProvider: trainingInstitute._id }).session(session);
            const courseIds = courses.map(course => course._id);

            console.log(`📚 Found ${courses.length} courses to delete`);

            if (courseIds.length > 0) {
                // 3. Delete all enrollments for these courses
                const deletedEnrollments = await Enrollment.deleteMany(
                    { courseId: { $in: courseIds } },
                    { session }
                );
                console.log(`🗑️ Deleted ${deletedEnrollments.deletedCount} enrollments for school courses`);

                // 4. Delete all courses
                const deletedCourses = await Course.deleteMany(
                    { trainingProvider: trainingInstitute._id },
                    { session }
                );
                console.log(`🗑️ Deleted ${deletedCourses.deletedCount} courses`);
            }

            // 5. Delete training institute profile
            await TrainingInstitute.deleteOne({ _id: trainingInstitute._id }, { session });
            console.log(`🗑️ Deleted training institute profile`);
        } else {
            console.log(`⚠️ No training institute found for user: ${userId}`);
        }

    } catch (error) {
        console.error('❌ Error cleaning up school data:', error);
        throw error;
    }
}

// Helper function to cleanup student data
async function cleanupStudentData(userId, session) {
    try {
        // Delete all enrollments by this student
        const deletedEnrollments = await Enrollment.deleteMany(
            { studentId: userId },
            { session }
        );
        
        console.log(`🗑️ Deleted ${deletedEnrollments.deletedCount} student enrollments`);

        // Update course enrollment counts
        const enrollmentsToUpdate = await Course.find({
            currentEnrollments: { $gt: 0 }
        }).session(session);

        for (const course of enrollmentsToUpdate) {
            const currentCount = await Enrollment.countDocuments({
                courseId: course._id
            }).session(session);

            await Course.updateOne(
                { _id: course._id },
                { currentEnrollments: currentCount },
                { session }
            );
        }

    } catch (error) {
        console.error('❌ Error cleaning up student data:', error);
        throw error;
    }
}

// Helper function to cleanup employer data
async function cleanupEmployerData(userId, session) {
    try {
        // Add any employer-specific cleanup logic here
        console.log(`🗑️ Cleaning up employer data for user ${userId}`);
        
    } catch (error) {
        console.error('❌ Error cleaning up employer data:', error);
        throw error;
    }
}

// Function to start the cleanup job
export const startSubscriptionCleanup = () => {
    subscriptionCleanupJob.start();
    console.log('🚀 Subscription cleanup cron job started (runs every 5 minutes for testing)');
};

// Function to stop the cleanup job
export const stopSubscriptionCleanup = () => {
    subscriptionCleanupJob.stop();
    console.log('🛑 Subscription cleanup cron job stopped');
};

// Function to run cleanup manually (for testing)
export const runCleanupNow = async () => {
    console.log('🧪 Running subscription cleanup manually...');
    await performCleanup();
};

export default subscriptionCleanupJob;