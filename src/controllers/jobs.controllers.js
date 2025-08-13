import { Job } from "../models/index.js";
import {asyncHandler} from "../utils/asyncHandler.js"


// #add appropriate errors in catch block

// get all jobs
// get a job by id 
// create a job
// update a job
// contact with school for employer if candidate is getting selected # not for now 
// delete job post


// Get all job posts
const getAllJobs = asyncHandler(async (req, res) => {
    const jobs = await Job.find();
    if (!jobs || jobs.length === 0) {
        return res.status(404).json({ message: "No jobs found" });
    }
    res.status(200).json({ jobs });
});

// Get a job by ID
const getJobById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const job = await Job.findById(id);
    if (!job) {
        return res.status(404).json({ message: "Job not found" });
    }
    res.status(200).json({ job });
});

// Create a job post
const createJobPost = asyncHandler(async (req, res) => {
    const { jobTitle, department, location, employmentType, salary, jobDescription, skillsRequired, benefits, category, applicationDeadline } = req.body;
    const postedBy = req.user?._id;
    if (!jobTitle || !department || !location || !employmentType || !jobDescription || !category) {
        return res.status(400).json({ message: "Missing required fields" });
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
    if (!job) {
        return res.status(500).json({ message: "Failed to create job" });
    }
    res.status(201).json({ job, message: "Job created successfully" });
});

// Update job post
const updateJobPost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const job = await Job.findByIdAndUpdate(id, updates, { new: true });
    if (!job) {
        return res.status(404).json({ message: "Job not found or update failed" });
    }
    res.status(200).json({ job, message: "Job updated successfully" });
});

// Delete job post
const deleteJobPost = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const job = await Job.findByIdAndDelete(id);
    if (!job) {
        return res.status(404).json({ message: "Job not found or already deleted" });
    }
    res.status(200).json({ message: "Job deleted successfully" });
});

export { getAllJobs, getJobById, createJobPost, updateJobPost, deleteJobPost };