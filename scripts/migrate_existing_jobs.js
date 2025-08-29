/**
 * MIGRATION SCRIPT FOR EXISTING JOBS
 * 
 * This script updates all existing jobs in the database to include
 * the new matchedCandidates field with calculated matches.
 * 
 * Run this script once after deploying the new matching system:
 * node scripts/migrate_existing_jobs.js
 */

import mongoose from 'mongoose';
import { Job, Student } from '../src/models/index.js';
import { findMatchingStudents } from '../src/utils/matchingUtils.js';

// Database connection (update with your actual connection string)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/talentbridge';

async function connectDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

async function migrateExistingJobs() {
    try {
        console.log('🔄 Starting migration of existing jobs...\n');
        
        // Find all active jobs that don't have matchedCandidates or have empty array
        const existingJobs = await Job.find({
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] },
            $or: [
                { matchedCandidates: { $exists: false } },
                { matchedCandidates: { $size: 0 } }
            ]
        }).select('_id jobTitle skillsRequired postedBy');
        
        console.log(`📊 Found ${existingJobs.length} existing jobs that need migration\n`);
        
        if (existingJobs.length === 0) {
            console.log('✅ No jobs need migration. All jobs are up to date.');
            return {
                success: true,
                totalJobs: 0,
                updated: 0,
                failed: 0
            };
        }
        
        // Get all active students once (for performance)
        console.log('📥 Fetching all active students...');
        const students = await Student.find({
            skills: { $exists: true, $ne: [] },
            isPublic: true,
            isOpenToWork: true
        }).select('skills firstName lastName email location');
        
        console.log(`📊 Found ${students.length} eligible students for matching\n`);
        
        const stats = {
            totalJobs: existingJobs.length,
            updated: 0,
            failed: 0,
            totalMatchesCreated: 0,
            errors: []
        };
        
        // Process each job
        for (let i = 0; i < existingJobs.length; i++) {
            const job = existingJobs[i];
            const progress = `(${i + 1}/${existingJobs.length})`;
            
            try {
                console.log(`🔄 ${progress} Processing job: "${job.jobTitle}"`);
                
                // Find matching students with ≥95% match
                const matchedStudents = findMatchingStudents(students, job.skillsRequired, 95);
                
                // Format matched candidates for storage
                const formattedMatches = matchedStudents.map(match => ({
                    student: match.student,
                    matchPercentage: match.matchPercentage,
                    matchedAt: new Date()
                }));
                
                // Update job with matched candidates
                await Job.findByIdAndUpdate(job._id, {
                    matchedCandidates: formattedMatches
                });
                
                stats.updated++;
                stats.totalMatchesCreated += formattedMatches.length;
                
                console.log(`   ✅ Updated with ${formattedMatches.length} matched candidates`);
                
                // Add a small delay to avoid overwhelming the database
                if (i % 10 === 0 && i > 0) {
                    console.log(`   ⏳ Processed ${i} jobs, taking a short break...\n`);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
                
            } catch (jobError) {
                console.error(`   ❌ Failed to update job "${job.jobTitle}":`, jobError.message);
                stats.failed++;
                stats.errors.push({
                    jobId: job._id,
                    jobTitle: job.jobTitle,
                    error: jobError.message
                });
            }
        }
        
        return stats;
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

async function printMigrationReport(stats) {
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log(`📊 Total jobs processed: ${stats.totalJobs}`);
    console.log(`✅ Successfully updated: ${stats.updated}`);
    console.log(`❌ Failed to update: ${stats.failed}`);
    console.log(`🎯 Total matches created: ${stats.totalMatchesCreated}`);
    console.log(`📈 Average matches per job: ${stats.updated > 0 ? Math.round((stats.totalMatchesCreated / stats.updated) * 100) / 100 : 0}`);
    
    if (stats.failed > 0) {
        console.log('\n❌ ERRORS:');
        stats.errors.forEach((error, index) => {
            console.log(`   ${index + 1}. Job: "${error.jobTitle}" - ${error.error}`);
        });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (stats.failed === 0) {
        console.log('🎉 Migration completed successfully! All existing jobs now have matched candidates.');
    } else {
        console.log(`⚠️  Migration completed with ${stats.failed} errors. Please check the errors above.`);
    }
}

// Main execution
async function main() {
    console.log('🚀 Starting TalentBridge Job Migration Script');
    console.log('='.repeat(60));
    
    try {
        // Connect to database
        await connectDatabase();
        
        // Run migration
        const stats = await migrateExistingJobs();
        
        // Print report
        await printMigrationReport(stats);
        
        // Close database connection
        await mongoose.connection.close();
        console.log('\n✅ Database connection closed');
        
        process.exit(0);
        
    } catch (error) {
        console.error('💥 Migration script failed:', error);
        
        // Close database connection
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        
        process.exit(1);
    }
}

// Run the migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export { migrateExistingJobs };
