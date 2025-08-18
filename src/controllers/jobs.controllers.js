import { Job } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer, forbidden } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse } from "../utils/ApiResponse.js";




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
            throw notFound("No jobs found.");
        }

        return res.status(200).json(
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
        console.error("Get all jobs error:", error);
        throw error;
    }
});

// Get a job by ID
const getJobById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) throw badRequest("Job ID is required.");
        const job = await Job.findById(id).populate({
            path: 'postedBy',
            select: 'fullName email role'
        });
        if (!job) throw notFound("Job not found.");
        return res.status(200).json(successResponse(job, "Job fetched successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

// Create a job post
const createJobPost = asyncHandler(async (req, res) => {
    try {
        const { jobTitle, department, location, employmentType, salary, jobDescription, skillsRequired, benefits, category, applicationDeadline } = req.body;
        const postedBy = req.user?._id;
        if (!jobTitle || !department || !location || !employmentType || !jobDescription || !category) {
            throw badRequest("Missing required fields: jobTitle, department, location, employmentType, jobDescription, category");
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
        return res.status(201).json(createdResponse(job, "Job created successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

// Update job post
const updateJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (!id) throw badRequest("Job ID is required.");
        const job = await Job.findById(id);
        if (!job) throw notFound("Job not found.");
        // Only allow the user who posted the job to update
        if (job.postedBy.toString() !== req.user._id.toString()) {
            throw forbidden("You are not authorized to update this job post.");
        }
        const updated = await Job.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        return res.status(200).json(successResponse(updated, "Job updated successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

// Delete job post
const deleteJobPost = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) throw badRequest("Job ID is required.");
        const job = await Job.findById(id);
        if (!job) throw notFound("Job not found or already deleted.");
        // Only allow the user who posted the job to delete
        if (job.postedBy.toString() !== req.user._id.toString()) {
            throw forbidden("You are not authorized to delete this job post.");
        }
        await Job.findByIdAndDelete(id);
        return res.status(200).json(successResponse(null, "Job deleted successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
    }
});

export { getAllJobs, getJobById, createJobPost, updateJobPost, deleteJobPost };