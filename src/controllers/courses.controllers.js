import { Course } from "../models/index.js";
import {asyncHandler} from "../utils/asyncHandler.js"



// first of all get all courses controller
// get a course by id 
// search courses 
// create a course controller
// update a course controller
//  update course status controller
//  delete courses 
// further controllers if required 
// export all the controllers

// --- Complete CRUD Controllers for Courses ---

// Get all courses
const getCourses = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, category } = req.query;
    
    const filter = {};
    if (category) {
        filter.category = { $regex: category, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const courses = await Course.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
        return res.status(404).json({ message: "No courses found" });
    }

    const total = await Course.countDocuments(filter);

    res.status(200).json({ 
        courses,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// Get course by ID
const getCoursesById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
        return res.status(404).json({ message: "Course not found" });
    }
    res.status(200).json({ course });
});

// Create a course
const createCourse = asyncHandler(async (req, res) => {
    const { title, instructor, duration, price, language, type, description, objectives, skills, category } = req.body;
    const trainingProvider = req.user?._id;
    if (!title || !instructor || !duration || !price || !language || !type || !description || !objectives || !skills || !category) {
        return res.status(400).json({ message: "Missing required fields" });
    }
    const course = await Course.create({
        title,
        instructor,
        duration,
        price,
        language,
        type,
        description,
        objectives,
        skills,
        trainingProvider,
        category
    });
    if (!course) {
        return res.status(500).json({ message: "Failed to create course" });
    }
    res.status(201).json({ course, message: "Course created successfully" });
});

// Update course
const updateCourse = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    // First check if course exists and belongs to the user
    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
        return res.status(404).json({ message: "Course not found" });
    }

    // Check if the user owns this course
    if (existingCourse.trainingProvider.toString() !== userId.toString()) {
        return res.status(403).json({ message: "You can only update your own courses" });
    }

    const course = await Course.findByIdAndUpdate(id, updates, { new: true });
    if (!course) {
        return res.status(404).json({ message: "Course not found or update failed" });
    }
    res.status(200).json({ course, message: "Course updated successfully" });
});

// Update course status
const updateCourseStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    // Check if user is admin (this should be handled by middleware, but double-check)
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can update course status" });
    }
    
    const validStatuses = ["draft", "pending_approval", "approved", "rejected", "archived"];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
    }
    
    const course = await Course.findByIdAndUpdate(id, { status }, { new: true });
    if (!course) {
        return res.status(404).json({ message: "Course not found or update failed" });
    }
    res.status(200).json({ course, message: "Course status updated successfully" });
});

// Delete a course
const deleteCourseById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // Check if user is admin (this should be handled by middleware, but double-check)
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can delete courses" });
    }
    
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
        return res.status(404).json({ message: "Course not found or already deleted" });
    }
    res.status(200).json({ message: "Course deleted successfully" });
});

// Search courses
const searchCourses = asyncHandler(async (req, res) => {
    const { q, category, priceMin, priceMax, page = 1, limit = 10 } = req.query;
    
    if (!q) {
        return res.status(400).json({ message: "Search query is required" });
    }

    const searchFilter = {
        $or: [
            { title: { $regex: q, $options: 'i' } },
            { instructor: { $regex: q, $options: 'i' } },
            { description: { $regex: q, $options: 'i' } },
            { category: { $regex: q, $options: 'i' } }
        ]
    };

    // Add additional filters
    if (category) {
        searchFilter.category = { $regex: category, $options: 'i' };
    }

    if (priceMin || priceMax) {
        searchFilter.price = {};
        if (priceMin) searchFilter.price.$gte = Number(priceMin);
        if (priceMax) searchFilter.price.$lte = Number(priceMax);
    }

    const skip = (page - 1) * limit;
    const courses = await Course.find(searchFilter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    const total = await Course.countDocuments(searchFilter);

    res.status(200).json({ 
        courses,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

// Get courses by training provider
const getCoursesByProvider = asyncHandler(async (req, res) => {
    const { providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const courses = await Course.find({ trainingProvider: providerId })
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });

    if (!courses || courses.length === 0) {
        return res.status(404).json({ message: "No courses found for this provider" });
    }

    const total = await Course.countDocuments({ trainingProvider: providerId });

    res.status(200).json({ 
        courses,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit)
        }
    });
});

export { getCourses, getCoursesById, createCourse, updateCourse, updateCourseStatus, deleteCourseById, searchCourses, getCoursesByProvider };