import { Student } from "../models/student models/students.models.js";
import { User } from "../models/contents/User.models.js";
import { successResponse, createdResponse, updatedResponse, badRequestResponse } from "../utils/ApiResponse.js";
import { badRequest, internalServer, notFound, forbidden } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ===============================
// CREATE STUDENT PROFILE
// ===============================
const createStudentProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { bio, location, website, skills, gsceResult } = req.body;

        // Check if student profile already exists
        const existingStudent = await Student.findOne({ userId }).lean();
        if (existingStudent) {
            throw badRequest("Student profile already exists for this user");
        }

        // Validate skills array
        if (skills && (!Array.isArray(skills) || skills.some(skill => !skill.trim()))) {
            throw badRequest("Skills must be an array of non-empty strings");
        }

        // Validate GSCE results if provided
        if (gsceResult && Array.isArray(gsceResult)) {
            for (const result of gsceResult) {
                if (!result.subject || !result.grade) {
                    throw badRequest("Each GSCE result must have subject and grade");
                }
            }
        }

        // Validate website URL if provided
        if (website && !website.match(/^https?:\/\/.+/)) {
            throw badRequest("Invalid website URL format");
        }

        const studentData = {
            userId,
            bio: bio?.trim(),
            location: location?.trim(),
            website,
            skills: skills?.map(skill => skill.trim()).filter(Boolean) || [],
            gsceResult: gsceResult || []
        };

        const student = await Student.create(studentData);

        return res.status(201).json(
            createdResponse(
                { 
                    student: { 
                        _id: student._id, 
                        userId: student.userId,
                        bio: student.bio,
                        location: student.location,
                        skillsCount: student.skills.length
                    } 
                },
                "Student profile created successfully"
            )
        );
    } catch (error) {
        console.error("Create student profile error:", error);
        throw error;
    }
});

// ===============================
// GET ALL STUDENTS (ADMIN)
// ===============================
const getAllStudents = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, location, skills, sort = '-createdAt', select } = req.query;

        const filter = {};
        if (location) {
            filter.location = { $regex: location, $options: 'i' };
        }
        if (skills) {
            const skillsArray = skills.split(',').map(s => s.trim());
            filter.skills = { $in: skillsArray };
        }

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        // Build projection
        let projection = 'userId bio location skills createdAt updatedAt';
        if (select) {
            projection = select.split(',').join(' ');
        }

        const [students, total] = await Promise.all([
            Student.find(filter)
                .select(projection)
                .populate('userId', 'fullName email role status')
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Student.countDocuments(filter)
        ]);

        return res.status(200).json(
            successResponse(
                {
                    students,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Students retrieved successfully"
            )
        );
    } catch (error) {
        console.error("Get all students error:", error);
        throw internalServer("Failed to fetch students");
    }
});

// ===============================
// GET STUDENT BY ID
// ===============================
const getStudentById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid student ID");
        }

        const student = await Student.findById(id)
            .populate('userId', 'fullName email phone role status')
            .populate('certifications')
            .populate('experience')
            .populate('kycVerification')
            .lean();

        if (!student) {
            throw notFound("Student not found");
        }

        // Check access permissions
        if (req.user.role !== 'admin' && student.userId._id.toString() !== req.user._id.toString()) {
            // Return limited info for non-admin, non-owner access
            const publicInfo = {
                _id: student._id,
                bio: student.bio,
                location: student.location,
                skills: student.skills,
                certifications: student.certifications,
                user: {
                    fullName: student.userId.fullName
                }
            };
            return res.status(200).json(successResponse({ student: publicInfo }, "Student public profile retrieved"));
        }

        return res.status(200).json(successResponse({ student }, "Student retrieved successfully"));
    } catch (error) {
        console.error("Get student by ID error:", error);
        throw error;
    }
});

// ===============================
// GET CURRENT USER'S STUDENT PROFILE
// ===============================
const getMyStudentProfile = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;

        const student = await Student.findOne({ userId })
            .populate('certifications')
            .populate('experience')
            .populate('kycVerification')
            .lean();

        if (!student) {
            throw notFound("Student profile not found");
        }

        return res.status(200).json(successResponse({ student }, "Student profile retrieved successfully"));
    } catch (error) {
        console.error("Get my student profile error:", error);
        throw internalServer("Failed to fetch student profile");
    }
});

// ===============================
// UPDATE STUDENT PROFILE
// ===============================
const updateStudentProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { bio, location, website, skills, gsceResult } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid student ID");
        }

        const student = await Student.findById(id);
        if (!student) {
            throw notFound("Student not found");
        }

        // Check if user can update this profile
        if (req.user.role !== 'admin' && student.userId.toString() !== req.user._id.toString()) {
            throw forbidden("Access denied");
        }

        // Validate skills if provided
        if (skills && (!Array.isArray(skills) || skills.some(skill => !skill.trim()))) {
            throw badRequest("Skills must be an array of non-empty strings");
        }

        // Validate GSCE results if provided
        if (gsceResult && Array.isArray(gsceResult)) {
            for (const result of gsceResult) {
                if (!result.subject || !result.grade) {
                    throw badRequest("Each GSCE result must have subject and grade");
                }
            }
        }

        // Validate website URL if provided
        if (website && !website.match(/^https?:\/\/.+/)) {
            throw badRequest("Invalid website URL format");
        }

        // Update student profile fields
        const updateData = {};
        if (bio !== undefined) updateData.bio = bio?.trim();
        if (location !== undefined) updateData.location = location?.trim();
        if (website !== undefined) updateData.website = website;
        if (skills !== undefined) updateData.skills = skills.map(skill => skill.trim()).filter(Boolean);
        if (gsceResult !== undefined) updateData.gsceResult = gsceResult;

        Object.assign(student, updateData);

        // Also allow updating basic User credentials (fullName, email, phone)
        const { fullName, email, phone } = req.body;
        if (fullName !== undefined || email !== undefined || phone !== undefined) {
            const user = await User.findById(student.userId);
            if (!user) throw notFound("Linked user not found");

            const userUpdates = {};
            if (fullName !== undefined) userUpdates.fullName = fullName.trim();
            if (phone !== undefined) userUpdates.phone = phone.trim();

            if (email !== undefined) {
                const normalized = String(email).toLowerCase().trim();
                // Basic email format check
                const emailRegex = /^\S+@\S+\.\S+$/;
                if (!emailRegex.test(normalized)) throw badRequest("Invalid email format");

                // Ensure uniqueness
                const existing = await User.findOne({ email: normalized, _id: { $ne: user._id } }).lean();
                if (existing) throw badRequest("Email already in use");
                userUpdates.email = normalized;
            }

            // Apply and save user updates if any
            if (Object.keys(userUpdates).length) {
                Object.assign(user, userUpdates);
                await user.save();
            }
        }

        await student.save();

        return res.status(200).json(
            updatedResponse(
                { 
                    student: {
                        _id: student._id,
                        bio: student.bio,
                        location: student.location,
                        website: student.website,
                        skillsCount: student.skills?.length || 0
                    }
                },
                "Student profile updated successfully"
            )
        );
    } catch (error) {
        console.error("Update student profile error:", error);
        throw error;
    }
});

// ===============================
// DELETE STUDENT PROFILE
// ===============================
const deleteStudentProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw badRequest("Invalid student ID");
        }

        const student = await Student.findById(id);
        if (!student) {
            throw notFound("Student not found");
        }

        // Check permissions
        if (req.user.role !== 'admin' && student.userId.toString() !== req.user._id.toString()) {
            throw forbidden("Access denied");
        }

        await Student.findByIdAndDelete(id);

        return res.status(200).json(successResponse(null, "Student profile deleted successfully"));
    } catch (error) {
        console.error("Delete student profile error:", error);
        throw internalServer("Failed to delete student profile");
    }
});

// ===============================
// ADD CERTIFICATION TO STUDENT
// ===============================
const addCertification = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { certificationId } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(certificationId)) {
            throw badRequest("Invalid ID");
        }

        const student = await Student.findById(id);
        if (!student) {
            throw notFound("Student not found");
        }

        // Check permissions
        if (req.user.role !== 'admin' && student.userId.toString() !== req.user._id.toString()) {
            throw forbidden("Access denied");
        }

        // Check if certification is already added
        if (student.certifications.includes(certificationId)) {
            throw badRequest("Certification already added to profile");
        }

        student.certifications.push(certificationId);
        await student.save();

        return res.status(200).json(
            updatedResponse(
                { certificationsCount: student.certifications.length },
                "Certification added successfully"
            )
        );
    } catch (error) {
        console.error("Add certification error:", error);
        throw error;
    }
});

// ===============================
// REMOVE CERTIFICATION FROM STUDENT
// ===============================
const removeCertification = asyncHandler(async (req, res) => {
    try {
        const { id, certId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(certId)) {
            throw badRequest("Invalid ID");
        }

        const student = await Student.findById(id);
        if (!student) {
            throw notFound("Student not found");
        }

        // Check permissions
        if (req.user.role !== 'admin' && student.userId.toString() !== req.user._id.toString()) {
            throw forbidden("Access denied");
        }

        student.certifications = student.certifications.filter(
            cert => cert.toString() !== certId
        );
        await student.save();

        return res.status(200).json(
            updatedResponse(
                { certificationsCount: student.certifications.length },
                "Certification removed successfully"
            )
        );
    } catch (error) {
        console.error("Remove certification error:", error);
        throw internalServer("Failed to remove certification");
    }
});


// ===============================
// Show student profile completion in percentage 
// ===============================

export {
    createStudentProfile,
    getAllStudents,
    getStudentById,
    getMyStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    addCertification,
    removeCertification
};
