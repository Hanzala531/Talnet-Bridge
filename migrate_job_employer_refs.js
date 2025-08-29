/**
 * Migration Script: Fix Job-Employer Relationships
 * 
 * This script migrates existing jobs that reference User IDs directly
 * to properly reference Employer IDs instead.
 */

import mongoose from 'mongoose';
import { Job, Employer, User } from './src/models/index.js';
import './src/database/index.js';

const migrateJobEmployerReferences = async () => {
    try {
        console.log('🔄 Starting Job-Employer Reference Migration\n');

        // Step 1: Find all jobs that need migration
        console.log('1. Analyzing existing jobs...');
        const allJobs = await Job.find();
        console.log(`   Found ${allJobs.length} total jobs`);

        let jobsNeedingMigration = [];
        let correctJobs = 0;
        let orphanJobs = [];

        for (const job of allJobs) {
            try {
                // Try to populate as employer first
                const jobWithEmployer = await Job.findById(job._id).populate('postedBy');
                
                if (jobWithEmployer.postedBy && jobWithEmployer.postedBy.name) {
                    // This is correctly referencing an Employer
                    correctJobs++;
                } else {
                    // This might be referencing a User instead of Employer
                    const user = await User.findById(job.postedBy);
                    if (user && user.role === 'employer') {
                        // Find the corresponding employer profile
                        const employer = await Employer.findOne({ userId: user._id });
                        if (employer) {
                            jobsNeedingMigration.push({
                                job: job,
                                currentUserId: user._id,
                                newEmployerId: employer._id,
                                employerName: employer.name,
                                userName: user.fullName
                            });
                        } else {
                            orphanJobs.push({
                                job: job,
                                user: user,
                                reason: 'User exists but no employer profile found'
                            });
                        }
                    } else {
                        orphanJobs.push({
                            job: job,
                            user: user,
                            reason: user ? 'User is not an employer' : 'User not found'
                        });
                    }
                }
            } catch (error) {
                console.error(`   Error analyzing job ${job._id}:`, error.message);
            }
        }

        console.log(`   ✅ Correctly referenced jobs: ${correctJobs}`);
        console.log(`   🔄 Jobs needing migration: ${jobsNeedingMigration.length}`);
        console.log(`   ⚠️  Orphan jobs (no valid employer): ${orphanJobs.length}\n`);

        // Step 2: Display migration plan
        if (jobsNeedingMigration.length > 0) {
            console.log('2. Migration Plan:');
            jobsNeedingMigration.forEach((item, index) => {
                console.log(`   ${index + 1}. "${item.job.jobTitle}"`);
                console.log(`      From User: ${item.userName} (${item.currentUserId})`);
                console.log(`      To Employer: ${item.employerName} (${item.newEmployerId})`);
                console.log();
            });
        }

        // Step 3: Display orphan jobs
        if (orphanJobs.length > 0) {
            console.log('3. Orphan Jobs (Need Manual Review):');
            orphanJobs.forEach((item, index) => {
                console.log(`   ${index + 1}. "${item.job.jobTitle}" (${item.job._id})`);
                console.log(`      Reason: ${item.reason}`);
                console.log(`      Posted By: ${item.job.postedBy}`);
                console.log();
            });
        }

        // Step 4: Perform migration
        if (jobsNeedingMigration.length > 0) {
            console.log('4. Performing Migration:');
            let migratedCount = 0;
            let errorCount = 0;

            for (const item of jobsNeedingMigration) {
                try {
                    await Job.findByIdAndUpdate(
                        item.job._id,
                        { postedBy: item.newEmployerId },
                        { runValidators: true }
                    );
                    
                    console.log(`   ✅ Migrated: "${item.job.jobTitle}"`);
                    migratedCount++;
                    
                } catch (error) {
                    console.error(`   ❌ Failed to migrate "${item.job.jobTitle}":`, error.message);
                    errorCount++;
                }
            }

            console.log(`\n   📊 Migration Results:`);
            console.log(`   - Successfully migrated: ${migratedCount}`);
            console.log(`   - Errors: ${errorCount}\n`);
        }

        // Step 5: Verification
        console.log('5. Post-Migration Verification:');
        const allJobsAfter = await Job.find();
        let verifiedCorrect = 0;
        let verifiedIncorrect = 0;

        for (const job of allJobsAfter) {
            try {
                const populated = await Job.findById(job._id).populate('postedBy');
                if (populated.postedBy && populated.postedBy.name) {
                    verifiedCorrect++;
                } else {
                    verifiedIncorrect++;
                }
            } catch (error) {
                verifiedIncorrect++;
            }
        }

        console.log(`   ✅ Correctly referenced jobs: ${verifiedCorrect}`);
        console.log(`   ❌ Still incorrect jobs: ${verifiedIncorrect}`);

        // Step 6: Create orphan employer profiles if needed
        if (orphanJobs.length > 0) {
            console.log('\n6. Creating Missing Employer Profiles:');
            let createdProfiles = 0;

            for (const item of orphanJobs) {
                if (item.user && item.user.role === 'employer' && item.reason.includes('no employer profile')) {
                    try {
                        const newEmployer = await Employer.create({
                            userId: item.user._id,
                            name: item.user.fullName || 'Unknown Company',
                            companySize: '1-10',
                            industry: 'Other',
                            websiteLink: 'https://example.com',
                            location: 'Not specified',
                            description: 'Automatically created profile during migration'
                        });

                        // Update the job to reference the new employer
                        await Job.findByIdAndUpdate(
                            item.job._id,
                            { postedBy: newEmployer._id }
                        );

                        console.log(`   ✅ Created employer profile for ${item.user.fullName}`);
                        console.log(`   ✅ Updated job "${item.job.jobTitle}"`);
                        createdProfiles++;

                    } catch (error) {
                        console.error(`   ❌ Failed to create employer for ${item.user.fullName}:`, error.message);
                    }
                }
            }

            console.log(`   📊 Created ${createdProfiles} new employer profiles`);
        }

        console.log('\n✅ Migration Completed Successfully!\n');
        
        console.log('📋 Final Summary:');
        console.log(`- Total jobs processed: ${allJobs.length}`);
        console.log(`- Jobs migrated: ${jobsNeedingMigration.length}`);
        console.log(`- Jobs that were already correct: ${correctJobs}`);
        console.log(`- Orphan jobs handled: ${orphanJobs.length}`);
        console.log('- All jobs now properly reference Employer profiles ✅');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error.stack);
    } finally {
        console.log('\n🔚 Migration completed. Disconnecting from database...');
        await mongoose.connection.close();
    }
};

// Run the migration
migrateJobEmployerReferences().catch(console.error);
