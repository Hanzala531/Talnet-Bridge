import {
    Enrollment,
    Course,
    Student,
    User,
    TrainingInstitute
} from '../models/index.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse } from "../utils/ApiResponse.js";

// ===============================
// CREATE ENROLLMENT
// ===============================
const createEnrollment = asyncHandler(async (req, res) => {
    try {
        const { courseId, enrollmentSource = "web" } = req.body;
        const studentId = req.user._id;

        // Validate course exists and is active
        const course = await Course.findById(courseId).populate('trainingProvider', 'name email');
        if (!course) {
            throw notFound("Course not found");
        }

        if (course.status !== 'approved') {
            throw badRequest("Course is not available for enrollment");
        }

        // Check enrollment capacity
        if (course.currentEnrollments >= course.maxEnrollments) {
            throw badRequest("Course is at maximum capacity");
        }

        // Check if student already enrolled
        const existingEnrollment = await Enrollment.findOne({
            studentId,
            courseId,
            status: { $nin: ['withdrawn', 'suspended'] }
        });

        if (existingEnrollment) {
            throw badRequest("Already enrolled in this course");
        }

        // Create enrollment
        const enrollment = await Enrollment.create({
            studentId,
            courseId,
            course: courseId, // For backwards compatibility
            paymentAmount: course.price,
            paymentStatus: course.price > 0 ? "pending" : "paid",
            enrollmentSource
        });

        // Update course enrollment count
        await Course.findByIdAndUpdate(courseId, {
            $inc: { currentEnrollments: 1 }
        });

        // Populate enrollment with course and student details
        const populatedEnrollment = await Enrollment.findById(enrollment._id)
            .populate('courseId', 'title instructor duration price category')
            .populate('studentId', 'fullName email');

        return res.status(201).json(
            createdResponse(
                { enrollment: populatedEnrollment },
                "Successfully enrolled in course"
            )
        );
    } catch (error) {
        throw internalServer("Failed to create enrollment");
    }
});

// ===============================
// GET USER ENROLLMENTS
// ===============================
const getUserEnrollments = asyncHandler(async (req, res) => {
    try {
        const studentId = req.user._id;
        const { page = 1, limit = 10, status, paymentStatus } = req.query;

        const filter = { studentId };
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [enrollments, total] = await Promise.all([
            Enrollment.find(filter)
                .populate('courseId', 'title instructor duration price category status trainingProvider')
                .populate({
                    path: 'courseId',
                    populate: {
                        path: 'trainingProvider',
                        select: 'name email'
                    }
                })
                .sort({ enrollmentDate: -1 })
                .skip(skip)
                .limit(limitNum),
            Enrollment.countDocuments(filter)
        ]);

        return res.status(200).json(
            successResponse(
                {
                    enrollments,
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Enrollments fetched successfully"
            )
        );
    } catch (error) {
        throw internalServer("Failed to fetch enrollments");
    }
});

// ===============================
// GET ENROLLMENT BY ID
// ===============================
const getEnrollmentById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        const enrollment = await Enrollment.findById(id)
            .populate('courseId', 'title instructor duration price category status trainingProvider')
            .populate('studentId', 'fullName email')
            .populate({
                path: 'courseId',
                populate: {
                    path: 'trainingProvider',
                    select: 'name email userId'
                }
            });

        if (!enrollment) {
            throw notFound("Enrollment not found");
        }

        // Authorization check
        const isStudent = enrollment.studentId._id.toString() === userId.toString();
        const isProvider = enrollment.courseId.trainingProvider?.userId?.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isStudent && !isProvider && !isAdmin) {
            throw badRequest("Access denied");
        }

        return res.status(200).json(
            successResponse(
                { enrollment },
                "Enrollment fetched successfully"
            )
        );
    } catch (error) {
        throw internalServer("Failed to fetch enrollment");
    }
});

// ===============================
// UPDATE ENROLLMENT STATUS
// ===============================
const updateEnrollmentStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { status, progressPercentage, completionDate } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;

        const validStatuses = ["enrolled", "in-progress", "completed", "withdrawn", "suspended"];
        if (status && !validStatuses.includes(status)) {
            throw badRequest("Invalid status value");
        }

        const enrollment = await Enrollment.findById(id)
            .populate('courseId', 'trainingProvider');

        if (!enrollment) {
            throw notFound("Enrollment not found");
        }

        // Authorization check
        const isStudent = enrollment.studentId.toString() === userId.toString();
        const isProvider = enrollment.courseId.trainingProvider.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isStudent && !isProvider && !isAdmin) {
            throw badRequest("Access denied");
        }

        // Update fields
        const updateData = {};
        if (status) updateData.status = status;
        if (progressPercentage !== undefined) updateData.progressPercentage = progressPercentage;
        if (completionDate) updateData.completionDate = completionDate;

        // Auto-set completion date if status is completed
        if (status === 'completed' && !completionDate) {
            updateData.completionDate = new Date();
            updateData.progressPercentage = 100;
        }

        const updatedEnrollment = await Enrollment.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('courseId', 'title instructor')
         .populate('studentId', 'fullName email');

        return res.status(200).json(
            successResponse(
                { enrollment: updatedEnrollment },
                "Enrollment updated successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to update enrollment");
    }
});

// ===============================
// UPDATE PAYMENT STATUS
// ===============================
const updatePaymentStatus = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { paymentStatus, transactionId, paymentMethod, paymentDate } = req.body;

        const validPaymentStatuses = ["pending", "paid", "failed", "refunded"];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            throw badRequest("Invalid payment status");
        }

        const enrollment = await Enrollment.findById(id);
        if (!enrollment) {
            throw notFound("Enrollment not found");
        }

        const updateData = { paymentStatus };
        if (transactionId) updateData.transactionId = transactionId;
        if (paymentMethod) updateData.paymentMethod = paymentMethod;
        if (paymentDate) updateData.paymentDate = paymentDate;

        // Auto-set payment date if status is paid
        if (paymentStatus === 'paid' && !paymentDate) {
            updateData.paymentDate = new Date();
        }

        const updatedEnrollment = await Enrollment.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).populate('courseId', 'title price')
         .populate('studentId', 'fullName email');

        return res.status(200).json(
            successResponse(
                { enrollment: updatedEnrollment },
                "Payment status updated successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to update payment status");
    }
});

// ===============================
// GET COURSE ENROLLMENTS (Provider/Admin)
// ===============================
const getCourseEnrollments = asyncHandler(async (req, res) => {
    try {
        const { courseId } = req.params;
        const { page = 1, limit = 10, status, paymentStatus } = req.query;
        const userId = req.user._id;
        const userRole = req.user.role;

        // Verify course exists and user has access
        const course = await Course.findById(courseId)
            .populate('trainingProvider', 'userId');

        if (!course) {
            throw notFound("Course not found");
        }

        const isProvider = course.trainingProvider.userId.toString() === userId.toString();
        const isAdmin = userRole === 'admin';

        if (!isProvider && !isAdmin) {
            throw badRequest("Access denied");
        }

        const filter = { courseId };
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;

        const skip = (page - 1) * Math.min(limit, 100);
        const limitNum = Math.min(Number(limit), 100);

        const [enrollments, total] = await Promise.all([
            Enrollment.find(filter)
                .populate('studentId', 'fullName email')
                .populate('courseId', 'title instructor')
                .sort({ enrollmentDate: -1 })
                .skip(skip)
                .limit(limitNum),
            Enrollment.countDocuments(filter)
        ]);

        return res.status(200).json(
            successResponse(
                {
                    enrollments,
                    courseInfo: {
                        title: course.title,
                        instructor: course.instructor,
                        totalEnrollments: total
                    },
                    pagination: {
                        page: Number(page),
                        limit: limitNum,
                        total,
                        pages: Math.ceil(total / limitNum)
                    }
                },
                "Course enrollments fetched successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to fetch course enrollments");
    }
});

// ===============================
// GET ENROLLMENT STATISTICS
// ===============================
const getEnrollmentStatistics = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;

        let matchFilter = {};

        if (userRole === 'school') {
            // Get courses by this training provider
            const institute = await TrainingInstitute.findOne({ userId });
            if (!institute) {
                throw notFound("Training institute not found");
            }
            
            const courses = await Course.find({ trainingProvider: institute._id }).select('_id');
            const courseIds = courses.map(c => c._id);
            matchFilter = { courseId: { $in: courseIds } };
        } else if (userRole === 'student') {
            matchFilter = { studentId: userId };
        } else if (userRole !== 'admin') {
            throw badRequest("Access denied");
        }

        const stats = await Enrollment.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: null,
                    totalEnrollments: { $sum: 1 },
                    completedEnrollments: {
                        $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                    },
                    activeEnrollments: {
                        $sum: { $cond: [{ $in: ["$status", ["enrolled", "in-progress"]] }, 1, 0] }
                    },
                    paidEnrollments: {
                        $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, 1, 0] }
                    },
                    totalRevenue: {
                        $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$paymentAmount", 0] }
                    }
                }
            }
        ]);

        const result = stats[0] || {
            totalEnrollments: 0,
            completedEnrollments: 0,
            activeEnrollments: 0,
            paidEnrollments: 0,
            totalRevenue: 0
        };

        return res.status(200).json(
            successResponse(
                {
                    statistics: {
                        ...result,
                        completionRate: result.totalEnrollments > 0 
                            ? ((result.completedEnrollments / result.totalEnrollments) * 100).toFixed(2)
                            : "0.00",
                        paymentRate: result.totalEnrollments > 0
                            ? ((result.paidEnrollments / result.totalEnrollments) * 100).toFixed(2)
                            : "0.00"
                    }
                },
                "Enrollment statistics fetched successfully"
            )
        );
    } catch (error) {throw internalServer("Failed to fetch enrollment statistics");
    }
});

// ===============================
// WITHDRAW FROM COURSE
// ===============================
const withdrawFromCourse = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const enrollment = await Enrollment.findById(id)
            .populate('courseId', 'title currentEnrollments');

        if (!enrollment) {
            throw notFound("Enrollment not found");
        }

        // Only student can withdraw their own enrollment
        if (enrollment.studentId.toString() !== userId.toString()) {
            throw badRequest("Access denied");
        }

        if (enrollment.status === 'withdrawn') {
            throw badRequest("Already withdrawn from course");
        }

        if (enrollment.status === 'completed') {
            throw badRequest("Cannot withdraw from completed course");
        }

        // Update enrollment status
        enrollment.status = 'withdrawn';
        await enrollment.save();

        // Decrease course enrollment count
        await Course.findByIdAndUpdate(enrollment.courseId._id, {
            $inc: { currentEnrollments: -1 }
        });

        return res.status(200).json(
            successResponse(
                { enrollment },
                "Successfully withdrawn from course"
            )
        );
    } catch (error) {throw internalServer("Failed to withdraw from course");
    }
});

export {
    createEnrollment,
    getUserEnrollments,
    getEnrollmentById,
    updateEnrollmentStatus,
    updatePaymentStatus,
    getCourseEnrollments,
    getEnrollmentStatistics,
    withdrawFromCourse
};
