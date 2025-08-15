import { Job } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer, forbidden } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse } from "../utils/ApiResponse.js";




// Get all job posts
const getAllJobs = asyncHandler(async (req, res) => {
    try {
        const jobs = await Job.find().populate({
            path: 'postedBy',
            select: 'fullName email role'
        });
        if (!jobs || jobs.length === 0) {
            throw notFound("No jobs found.");
        }
        return res.status(200).json(successResponse(jobs, "Jobs fetched successfully."));
    } catch (error) {
        return res.status(error.statusCode || 500).json(badRequestResponse(error.message));
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