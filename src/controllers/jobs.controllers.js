/**
 * JOB CONTROLLERS
 * 
 * This module handles all job-related operations for the TalentBridge platform.
 * Employers can post, manage, and track job listings while job seekers can
 * browse and apply for positions.
 * 
 * Features:
 * - Job posting and management (CRUD operations)
 * - Advanced job search and filtering
 * - Job application tracking
 * - Employer dashboard analytics
 * - Job status management (active, expired, closed)
 * 
 * Roles:
 * - Employers: Can create, update, delete their own job posts
 * - Students: Can view and apply for jobs
 * - Admin: Full access to all job operations
 */

import { Job } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer, forbidden } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from "../utils/ApiResponse.js";




/**
 * Get all job posts with pagination and filtering
 * 
 * @function getAllJobs
 * @param {Object} req - Express request object
 * @param {Object} req.query - Query parameters
 * @param {number} req.query.page - Page number (default: 1)
 * @param {number} req.query.limit - Items per page (default: 10, max: 100)
 * @param {string} req.query.status - Filter by job status ("active", "closed", "expired")
 * @param {string} req.query.location - Filter by job location
 * @param {string} req.query.employmentType - Filter by employment type
 * @param {string} req.query.sort - Sort order (default: '-createdAt')
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Paginated list of job posts with employer details
 * 
 * @example
 * GET /api/v1/jobs?page=1&limit=10&location=karachi&employmentType=Full-time
 * 
 * Response: {
 *   "success": true,
 *   "statusCode": 200,
 *   "data": {
 *     "jobs": [{
 *       "_id": "64f123...",
 *       "jobTitle": "Software Engineer",
 *       "department": "Engineering",
 *       "location": "Karachi",
 *       "employmentType": "Full-time",
 *       "salary": { "min": 50000, "max": 80000, "currency": "PKR" },
 *       "postedBy": {
 *         "fullName": "Acme Corp",
 *         "email": "hr@acme.com"
 *       }
 *     }],
 *     "pagination": {
 *       "page": 1,
 *       "limit": 10,
 *       "total": 25,
 *       "pages": 3
 *     }
 *   },
 *   "message": "Jobs retrieved successfully"
 * }
 */
// Get all job posts
const getAllJobs = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, status, location, employmentType, sort = '-createdAt' } = req.query;
        
        const filter = {};
        if (status) filter.status = status;
        if (location) filter.location = { $regex: location, $options: 'i' };
        if (employmentType) filter.employmentType = employmentType;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        // Use aggregation for better performance
        const pipeline = [
            { $match: filter },
            {
                $lookup: {
                    from: "users",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "poster",
                    pipeline: [{ $project: { fullName: 1, email: 1, role: 1 } }]
                }
            },
            {
                $project: {
                    jobTitle: 1,
                    department: 1,
                    location: 1,
                    employmentType: 1,
                    salary: 1,
                    category: 1,
                    applicationDeadline: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    postedBy: { $arrayElemAt: ["$poster", 0] }
                }
            },
            { $sort: sort.startsWith('-') ? { [sort.slice(1)]: -1 } : { [sort]: 1 } },
            { $skip: skip },
            { $limit: limitNum }
        ];

        const [jobs, total] = await Promise.all([
            Job.aggregate(pipeline),
            Job.countDocuments(filter)
        ]);

        if (!jobs || jobs.length === 0) {
            return res.json(notFoundResponse("No jobs found."));
        }

        return res.json(
            successResponse(
                {
                    jobs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Jobs fetched successfully."
            )
        );
    } catch (error) {
        throw internalServer("Error in fetching jobs");
    }
});

// Get a job by ID
const getJobById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        const job = await Job.findById(id).populate({
            path: 'postedBy',
            select: 'fullName email role'
        });
        if (!job) return res.json(notFoundResponse("Job not found."));
        return res.json(successResponse(job, "Job fetched successfully."));
    } catch (error) {
       throw internalServer(error.message);
    }
});

// Create a job post
const createJobPost = asyncHandler(async (req, res) => {
    try {
        const { jobTitle, department, location, employmentType, salary, jobDescription, skillsRequired, benefits, category, applicationDeadline } = req.body;
        const postedBy = req.user?._id;
        if (!jobTitle || !department || !location || !employmentType || !jobDescription || !category) {
            return res.json(badRequestResponse("Missing required fields: jobTitle, department, location, employmentType, jobDescription, category"));
        }
        const job = await Job.create({
            jobTitle,
            department,
            location,
            employmentType,
            salary,
            jobDescription,
            skillsRequired,
            benefits,
            postedBy,
            category,
            applicationDeadline
        });
        if (!job) throw internalServer("Failed to create job");
        return res.json(createdResponse(job, "Job created successfully."));
    } catch (error) {
        throw internalServer(error.message);
    }
});

// Update job post
const updateJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        const job = await Job.findById(id);
        if (!job) return res.json(notFoundResponse("Job not found."));
        // Only allow the user who posted the job to update
        if (job.postedBy.toString() !== req.user._id.toString()) {
            return res.json(forbiddenResponse("You are not authorized to update this job post."));
        }
        const updated = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        return res.json(successResponse(updated, "Job updated successfully."));
    } catch (error) {
        throw internalServer(error.message);
    }
});

// Delete job post
const deleteJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        const job = await Job.findById(id);
        if (!job) return res.json(notFoundResponse("Job not found or already deleted."));
        // Only allow the user who posted the job to delete
        if (job.postedBy.toString() !== req.user._id.toString()) {
            return res.json(forbiddenResponse("You are not authorized to delete this job post."));
        }
        await Job.findByIdAndDelete(id);
        return res.json(successResponse(null, "Job deleted successfully."));
    } catch (error) {
        throw internalServer(error.message)
    }
});

const searchJobs = asyncHandler(async (req, res) => {
    try {
        const { 
            q, 
            location, 
            category, 
            employmentType, 
            minSalary, 
            maxSalary, 
            skills,
            page = 1, 
            limit = 10 
        } = req.query;

        const filter = { status: 'active' };
        const searchConditions = [];

        if (q) {
            searchConditions.push(
                { jobTitle: { $regex: q, $options: 'i' } },
                { jobDescription: { $regex: q, $options: 'i' } },
                { department: { $regex: q, $options: 'i' } }
            );
        }

        if (searchConditions.length > 0) {
            filter.$or = searchConditions;
        }

        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }

        if (category) {
            filter.category = { $regex: category, $options: 'i' };
        }

        if (employmentType) {
            filter.employmentType = employmentType;
        }

        if (minSalary || maxSalary) {
            filter['salary.min'] = {};
            if (minSalary) filter['salary.min'].$gte = Number(minSalary);
            if (maxSalary) filter['salary.max'] = { $lte: Number(maxSalary) };
        }

        if (skills) {
            const skillsArray = skills.split(',').map(skill => skill.trim());
            filter.skillsRequired = { $in: skillsArray.map(skill => new RegExp(skill, 'i')) };
        }

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .populate('postedBy', 'fullName email')
                .select('-__v')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Job.countDocuments(filter)
        ]);

        return res.json(
            successResponse(
                {
                    jobs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    },
                    searchParams: { q, location, category, employmentType, minSalary, maxSalary, skills }
                },
                "Job search completed successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to search jobs");
    }
});

/**
 * Get jobs posted by current employer
 * 
 * @function getMyJobs
 * @param {Object} req - Express request object
 * @param {Object} req.user - Authenticated employer
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Jobs posted by current employer
 */
const getMyJobs = asyncHandler(async (req, res) => {
    try {
        const employerId = req.user._id;
        const { page = 1, limit = 10, status } = req.query;

        const filter = { postedBy: employerId };
        if (status) filter.status = status;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .select('-__v')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Job.countDocuments(filter)
        ]);

        return res.json(
            successResponse(
                {
                    jobs,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Your jobs retrieved successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to retrieve your jobs");
    }
});

/**
 * Update job status (active, closed, expired)
 * 
 * @function updateJobStatus
 * @param {Object} req - Express request object
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Job ID
 * @param {Object} req.body - Request body
 * @param {string} req.body.status - New status: "active", "closed", "expired"
 * @param {Object} res - Express response object
 * @returns {Promise<Object>} Updated job with new status
 */
const updateJobStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['active', 'closed', 'expired'];
        if (!validStatuses.includes(status)) {
            return res.json(badRequestResponse("Invalid status. Must be one of: active, closed, expired"));
        }

        const job = await Job.findById(id);
        if (!job) {
            return res.json(notFoundResponse("Job not found"));
        }

        // Check authorization
        if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.json(forbiddenResponse("You are not authorized to update this job status"));
        }

        job.status = status;
        if (status === 'closed') {
            job.closedAt = new Date();
        }

        await job.save();

        return res.json(
            successResponse(
                { job: { _id: job._id, status: job.status, closedAt: job.closedAt } },
                `Job status updated to ${status} successfully`
            )
        );
    } catch (error) {throw internalServer(error.message);
    }
});

export { 
    getAllJobs, 
    getJobById, 
    createJobPost, 
    updateJobPost, 
    deleteJobPost, 
    searchJobs, 
    getMyJobs, 
    updateJobStatus 
};