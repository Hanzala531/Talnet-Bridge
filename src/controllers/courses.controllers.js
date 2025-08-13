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
    const courses = await Course.find();
    if (!courses || courses.length === 0) {
        return res.status(404).json({ message: "No courses found" });
    }
    res.status(200).json({ courses });
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
    const course = await Course.findByIdAndUpdate(id, updates, { new: true });
    if (!course) {
        return res.status(404).json({ message: "Course not found or update failed" });
    }
    res.status(200).json({ course, message: "Course updated successfully" });
});

// Update course status (admin)
const updateCourseStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    // Assume req.user.role is available
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
    // Assume req.user.role is available
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Only admin can delete courses" });
    }
    const course = await Course.findByIdAndDelete(id);
    if (!course) {
        return res.status(404).json({ message: "Course not found or already deleted" });
    }
    res.status(200).json({ message: "Course deleted successfully" });
});

export { getCourses, getCoursesById, createCourse, updateCourse, updateCourseStatus, deleteCourseById };