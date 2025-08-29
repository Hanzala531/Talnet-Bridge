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

import { Job, Student, Employer } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer, forbidden } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse, notFoundResponse, forbiddenResponse } from "../utils/ApiResponse.js";
import { calculateMatchPercentage, findMatchingStudents } from "../utils/matchingUtils.js";




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
                    from: "employers",
                    localField: "postedBy",
                    foreignField: "_id",
                    as: "employer",
                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "userId",
                                foreignField: "_id",
                                as: "userInfo",
                                pipeline: [{ $project: { fullName: 1, email: 1, role: 1 } }]
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                industry: 1,
                                location: 1,
                                userInfo: { $arrayElemAt: ["$userInfo", 0] }
                            }
                        }
                    ]
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
                    postedBy: { $arrayElemAt: ["$employer", 0] }
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
            populate: {
                path: 'userId',
                select: 'fullName email role'
            }
        });
        if (!job) return res.json(notFoundResponse("Job not found."));
        return res.json(successResponse(job, "Job fetched successfully."));
    } catch (error) {
       throw internalServer(error.message);
    }
});

// Create a job post
// Create job post with automatic candidate matching
const createJobPost = asyncHandler(async (req, res) => {
    try {
        const { jobTitle, department, location, employmentType, salary, jobDescription, skillsRequired, benefits, category, applicationDeadline } = req.body;
        const userId = req.user?._id;
        
        if (!jobTitle || !department || !location || !employmentType || !jobDescription || !category) {
            return res.json(badRequestResponse("Missing required fields: jobTitle, department, location, employmentType, jobDescription, category"));
        }
        
        // Validate that user has an employer profile
        const employer = await Employer.findOne({ userId });
        if (!employer) {
            return res.json(badRequestResponse("Employer profile required. Please create your employer profile first before posting jobs."));
        }
        
        // Create the job with employer ID as postedBy
        const job = await Job.create({
            jobTitle,
            department,
            location,
            employmentType,
            salary,
            jobDescription,
            skillsRequired,
            benefits,
            postedBy: employer._id, // Use employer ID, not user ID
            category,
            applicationDeadline,
            matchedCandidates: [] // Initialize empty array
        });
        
        if (!job) throw internalServer("Failed to create job");
        
        // Find and store matched candidates (≥95% match) if skills are provided
        if (skillsRequired && Array.isArray(skillsRequired) && skillsRequired.length > 0) {
            try {
                // Fetch all active students with skills
                const students = await Student.find({
                    skills: { $exists: true, $ne: [] },
                    isPublic: true, // Only consider public profiles
                    isOpenToWork: true // Only consider students open to work
                }).select('skills firstName lastName email location');
                
                // Find matching students with ≥95% match (using enhanced fuzzy search)
                const fuzzyOptions = {
                    fuzzyThreshold: 0.8,
                    exactMatchWeight: 1.0,
                    partialMatchWeight: 0.9,
                    fuzzyMatchWeight: 0.7,
                    abbreviationMatchWeight: 0.95
                };
                const matchedStudents = findMatchingStudents(students, skillsRequired, 95, fuzzyOptions);
                
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
                
                console.log(`Job created with ${formattedMatches.length} matched candidates`);
                
            } catch (matchingError) {
                console.error('Error finding matched candidates:', matchingError);
                // Don't fail job creation if matching fails
            }
        }
        
        // Fetch the updated job with populated matched candidates
        const populatedJob = await Job.findById(job._id)
            .populate('matchedCandidates.student', 'firstName lastName email location skills')
            .populate({
                path: 'postedBy',
                populate: {
                    path: 'userId',
                    select: 'fullName email'
                }
            });
        
        return res.json(createdResponse(populatedJob, "Job created successfully with matched candidates."));
        
    } catch (error) {
        throw internalServer(error.message);
    }
});

// Update job post
const updateJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const userId = req.user._id;
        
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        
        // Find the job with employer info
        const job = await Job.findById(id).populate('postedBy');
        if (!job) return res.json(notFoundResponse("Job not found."));
        
        // Validate that user owns this employer profile
        if (job.postedBy.userId.toString() !== userId.toString()) {
            return res.json(forbiddenResponse("You can only update your own job posts."));
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
        const userId = req.user._id;
        
        if (!id) return res.json(badRequestResponse("Job ID is required."));
        
        // Find the job with employer info
        const job = await Job.findById(id).populate('postedBy');
        if (!job) return res.json(notFoundResponse("Job not found or already deleted."));
        
        // Validate that user owns this employer profile
        if (job.postedBy.userId.toString() !== userId.toString()) {
            return res.json(forbiddenResponse("You can only delete your own job posts."));
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
                .populate({
                    path: 'postedBy',
                    populate: {
                        path: 'userId',
                        select: 'fullName email'
                    }
                })
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

const getMyJobs = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10, status } = req.query;

        // Find employer profile for the logged-in user
        const employer = await Employer.findOne({ userId });
        if (!employer) {
            return res.json(badRequestResponse("Employer profile required. Please create your employer profile first."));
        }

        const filter = { postedBy: employer._id };
        if (status) filter.status = status;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [jobs, total] = await Promise.all([
            Job.find(filter)
                .select('-__v')
                .sort('-createdAt')
                .skip(skip)
                .limit(limitNum)
                .populate({
                    path: 'postedBy',
                    populate: {
                        path: 'userId',
                        select: 'fullName email'
                    }
                })
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