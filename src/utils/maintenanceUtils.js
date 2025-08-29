/**
 * MAINTENANCE UTILITIES
 * 
 * This module provides utility functions for maintaining and updating
 * the matching system, including recalculating matches for existing jobs.
 */

import { Job, Student } from "../models/index.js";
import { findMatchingStudents } from "./matchingUtils.js";

/**
 * Recalculate matched candidates for a specific job
 * @param {String} jobId - The job ID to recalculate matches for
 * @returns {Object} - Result object with success status and updated job
 */
export const recalculateJobMatches = async (jobId) => {
    try {
        // Find the job
        const job = await Job.findById(jobId);
        if (!job) {
            return { success: false, error: 'Job not found' };
        }
        
        // Only recalculate if job has skill requirements
        if (!job.skillsRequired || !Array.isArray(job.skillsRequired) || job.skillsRequired.length === 0) {
            return { success: false, error: 'Job has no skill requirements' };
        }
        
        // Fetch all active students with skills
        const students = await Student.find({
            skills: { $exists: true, $ne: [] },
            isPublic: true,
            isOpenToWork: true
        }).select('skills firstName lastName email location');
        
        // Find matching students with ≥95% match
        const matchedStudents = findMatchingStudents(students, job.skillsRequired, 95);
        
        // Format matched candidates for storage
        const formattedMatches = matchedStudents.map(match => ({
            student: match.student,
            matchPercentage: match.matchPercentage,
            matchedAt: new Date()
        }));
        
        // Update job with new matched candidates
        const updatedJob = await Job.findByIdAndUpdate(
            jobId,
            { matchedCandidates: formattedMatches },
            { new: true }
        );
        
        return {
            success: true,
            job: updatedJob,
            matchesFound: formattedMatches.length,
            previousMatches: job.matchedCandidates ? job.matchedCandidates.length : 0
        };
        
    } catch (error) {
        console.error('Error recalculating job matches:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Recalculate matched candidates for all active jobs
 * @param {Object} options - Options for bulk recalculation
 * @returns {Object} - Result object with statistics
 */
export const recalculateAllJobMatches = async (options = {}) => {
    try {
        const { limit = 100, onlyActiveJobs = true, includeLegacyJobs = true } = options;
        
        // Build query filter
        const filter = {
            skillsRequired: { $exists: true, $ne: [] }
        };
        
        if (onlyActiveJobs) {
            filter.isActive = true;
        }
        
        // If includeLegacyJobs is true, include jobs without matchedCandidates or with empty arrays
        if (includeLegacyJobs) {
            filter.$or = [
                { matchedCandidates: { $exists: false } },
                { matchedCandidates: { $size: 0 } },
                { matchedCandidates: { $exists: true } } // Include all jobs for recalculation
            ];
        }
        
        // Find jobs to update
        const jobs = await Job.find(filter)
            .limit(limit)
            .select('_id jobTitle skillsRequired matchedCandidates');
        
        if (jobs.length === 0) {
            return {
                success: true,
                message: 'No jobs found to recalculate',
                stats: {
                    totalJobs: 0,
                    updated: 0,
                    failed: 0,
                    legacyJobsFound: 0
                }
            };
        }
        
        // Fetch all active students once
        const students = await Student.find({
            skills: { $exists: true, $ne: [] },
            isPublic: true,
            isOpenToWork: true
        }).select('skills firstName lastName email location');
        
        const stats = {
            totalJobs: jobs.length,
            updated: 0,
            failed: 0,
            totalMatchesFound: 0,
            legacyJobsFound: 0,
            errors: []
        };
        
        // Process each job
        for (const job of jobs) {
            try {
                // Check if this is a legacy job
                const isLegacyJob = !job.matchedCandidates || job.matchedCandidates.length === 0;
                if (isLegacyJob) {
                    stats.legacyJobsFound++;
                    console.log(`Processing legacy job: ${job.jobTitle}`);
                }
                
                // Find matching students with ≥95% match
                const matchedStudents = findMatchingStudents(students, job.skillsRequired, 95);
                
                // Format matched candidates for storage
                const formattedMatches = matchedStudents.map(match => ({
                    student: match.student,
                    matchPercentage: match.matchPercentage,
                    matchedAt: new Date()
                }));
                
                // Update job with new matched candidates
                await Job.findByIdAndUpdate(job._id, {
                    matchedCandidates: formattedMatches
                });
                
                stats.updated++;
                stats.totalMatchesFound += formattedMatches.length;
                
                const statusPrefix = isLegacyJob ? 'Migrated legacy job' : 'Updated job';
                console.log(`${statusPrefix} ${job.jobTitle} with ${formattedMatches.length} matches`);
                
            } catch (jobError) {
                console.error(`Error updating job ${job._id}:`, jobError);
                stats.failed++;
                stats.errors.push({
                    jobId: job._id,
                    jobTitle: job.jobTitle,
                    error: jobError.message
                });
            }
        }
        
        const message = `Bulk recalculation completed. Updated ${stats.updated} jobs (${stats.legacyJobsFound} legacy jobs), failed ${stats.failed}`;
        
        return {
            success: true,
            message,
            stats
        };
        
    } catch (error) {
        console.error('Error in bulk recalculation:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Get matching statistics for the platform
 * @returns {Object} - Statistics about matches across the platform
 */
export const getMatchingStatistics = async () => {
    try {
        // Get job statistics
        const totalJobs = await Job.countDocuments({ isActive: true });
        const jobsWithSkills = await Job.countDocuments({
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] }
        });
        
        // Get legacy jobs (jobs without matchedCandidates)
        const legacyJobs = await Job.countDocuments({
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] },
            $or: [
                { matchedCandidates: { $exists: false } },
                { matchedCandidates: { $size: 0 } }
            ]
        });
        
        // Get student statistics
        const totalStudents = await Student.countDocuments({
            isPublic: true,
            isOpenToWork: true
        });
        const studentsWithSkills = await Student.countDocuments({
            isPublic: true,
            isOpenToWork: true,
            skills: { $exists: true, $ne: [] }
        });
        
        // Get match statistics
        const jobsWithMatches = await Job.aggregate([
            {
                $match: {
                    isActive: true,
                    matchedCandidates: { $exists: true, $ne: [] }
                }
            },
            {
                $project: {
                    matchCount: { $size: "$matchedCandidates" }
                }
            },
            {
                $group: {
                    _id: null,
                    totalJobsWithMatches: { $sum: 1 },
                    totalMatches: { $sum: "$matchCount" },
                    avgMatchesPerJob: { $avg: "$matchCount" }
                }
            }
        ]);
        
        const matchStats = jobsWithMatches[0] || {
            totalJobsWithMatches: 0,
            totalMatches: 0,
            avgMatchesPerJob: 0
        };
        
        // Calculate percentages
        const jobMatchingRate = jobsWithSkills > 0 ? 
            Math.round((matchStats.totalJobsWithMatches / jobsWithSkills) * 100) : 0;
        
        const legacyJobsPercentage = jobsWithSkills > 0 ?
            Math.round((legacyJobs / jobsWithSkills) * 100) : 0;
        
        return {
            success: true,
            statistics: {
                jobs: {
                    total: totalJobs,
                    withSkills: jobsWithSkills,
                    withMatches: matchStats.totalJobsWithMatches,
                    legacyJobs: legacyJobs,
                    matchingRate: `${jobMatchingRate}%`,
                    legacyJobsPercentage: `${legacyJobsPercentage}%`
                },
                students: {
                    total: totalStudents,
                    withSkills: studentsWithSkills,
                    eligibleForMatching: studentsWithSkills
                },
                matches: {
                    totalMatches: matchStats.totalMatches,
                    averageMatchesPerJob: Math.round(matchStats.avgMatchesPerJob * 100) / 100
                },
                migration: {
                    needsMigration: legacyJobs > 0,
                    legacyJobsCount: legacyJobs,
                    migrationRecommended: legacyJobs > 0 ? 
                        "Run migration script: node scripts/migrate_existing_jobs.js" : 
                        "No migration needed"
                }
            }
        };
        
    } catch (error) {
        console.error('Error getting matching statistics:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Check for legacy jobs that need migration
 * @returns {Object} - Information about legacy jobs
 */
export const checkLegacyJobs = async () => {
    try {
        // Find jobs that need migration
        const legacyJobs = await Job.find({
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] },
            $or: [
                { matchedCandidates: { $exists: false } },
                { matchedCandidates: { $size: 0 } }
            ]
        }).select('_id jobTitle postedBy createdAt skillsRequired')
          .populate('postedBy', 'fullName email')
          .sort({ createdAt: -1 })
          .limit(50); // Limit to first 50 for performance
        
        const totalLegacyJobs = await Job.countDocuments({
            isActive: true,
            skillsRequired: { $exists: true, $ne: [] },
            $or: [
                { matchedCandidates: { $exists: false } },
                { matchedCandidates: { $size: 0 } }
            ]
        });
        
        return {
            success: true,
            data: {
                totalLegacyJobs,
                needsMigration: totalLegacyJobs > 0,
                legacyJobsSample: legacyJobs.map(job => ({
                    id: job._id,
                    title: job.jobTitle,
                    postedBy: job.postedBy?.fullName || 'Unknown',
                    createdAt: job.createdAt,
                    skillsCount: job.skillsRequired?.length || 0
                })),
                recommendations: totalLegacyJobs > 0 ? [
                    "Run the migration script: node scripts/migrate_existing_jobs.js",
                    "Or use the maintenance utility: recalculateAllJobMatches({ includeLegacyJobs: true })",
                    "Consider running this during off-peak hours for large datasets"
                ] : [
                    "All jobs are up to date with the matching system"
                ]
            }
        };
        
    } catch (error) {
        console.error('Error checking legacy jobs:', error);
        return { success: false, error: error.message };
    }
};
