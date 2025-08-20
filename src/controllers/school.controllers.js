import { internalServer } from "../utils/ApiError.js";
import {
  Job,
  Employer,
  User,
  Course,
  Student,
  TrainingInstitute,
} from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  validationErrorResponse
} from "../utils/ApiResponse.js";

// Get own profile controller
const getProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await TrainingInstitute.findOne({ userId: userId });

    if (!profile) {
      return notFoundResponse("Training provider profile not found");
    }
    return successResponse(res, profile, "Profile fetched successfully");
  } catch (error) {
    throw internalServer("Failed to fetch profile");
  }
});

// Edit user profile
const editProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Validate required fields if provided
    if (updates.about && updates.about.length > 1000) {
      return badRequestResponse("About section cannot exceed 1000 characters");
    }

    const updatedProfile = await TrainingInstitute.findOneAndUpdate(
      { userId: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return notFoundResponse("Profile not found");
    }

    return successResponse(res, updatedProfile, "Profile updated successfully");
  } catch (error) {
    if (error.name === "ValidationError") {
      return validationErrorResponse(Object.values(error.errors).map((e) => e.message));
    }
    throw internalServer("Failed to update profile");
  }
});

// Get all training providers
const getAllTrainingProviders = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, focusArea, location } = req.query;

    const filter = {};
    if (focusArea) {
      filter.focusAreas = { $in: [new RegExp(focusArea, "i")] };
    }
    if (location) {
      filter["location.city"] = { $regex: location, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const providers = await TrainingInstitute.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    if (!providers || providers.length === 0) {
      return notFoundResponse("No training providers found");
    }

    const total = await TrainingInstitute.countDocuments(filter);

    return successResponse(res, {
      data: providers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    }, "Training providers fetched successfully");
  } catch (error) {
    throw internalServer("Failed to fetch training providers");
  }
});

// Get training provider by ID
const getTrainingProviderById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await TrainingInstitute.findById(id);

    if (!provider) {
      return notFoundResponse("Training provider not found");
    }

    // Get courses offered by this provider
    const courses = await Course.find({ trainingProvider: provider.userId })
      .select("title instructor duration price category status")
      .limit(5);

    return successResponse(res, {
      ...provider.toObject(),
      courses,
    }, "Training provider fetched successfully");
  } catch (error) {
    throw internalServer("Failed to fetch training provider");
  }
});

// Search training providers
const searchTrainingProviders = asyncHandler(async (req, res) => {
  try {
    const { q, focusArea, city, page = 1, limit = 10 } = req.query;

    if (!q) {
      return badRequestResponse("Search query is required");
    }

    const searchFilter = {
      $or: [
        { about: { $regex: q, $options: "i" } },
        { focusAreas: { $in: [new RegExp(q, "i")] } },
        { "location.city": { $regex: q, $options: "i" } },
        { "location.state": { $regex: q, $options: "i" } },
      ],
    };

    // Add additional filters
    if (focusArea) {
      searchFilter.focusAreas = { $in: [new RegExp(focusArea, "i")] };
    }

    if (city) {
      searchFilter["location.city"] = { $regex: city, $options: "i" };
    }

    const skip = (page - 1) * limit;
    const providers = await TrainingInstitute.find(searchFilter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await TrainingInstitute.countDocuments(searchFilter);

    return successResponse(res, {
      data: providers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    }, "Training providers search successful");
  } catch (error) {
    throw internalServer("Failed to search training providers");
  }
});

// Update training provider status (Admin only)
const updateTrainingProviderStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["active", "inactive", "suspended"];
    if (!validStatuses.includes(status)) {
      return badRequestResponse("Invalid status value. Valid values are: active, inactive, suspended");
    }

    const provider = await TrainingInstitute.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!provider) {
      return notFoundResponse("Training provider not found");
    }

    return successResponse(res, provider, "Training provider status updated successfully");
  } catch (error) {
    throw internalServer("Failed to update training provider status");
  }
});

// Delete training provider (Admin only)
const deleteTrainingProvider = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    const provider = await TrainingInstitute.findByIdAndDelete(id);

    if (!provider) {
      return notFoundResponse("Training provider not found");
    }

    // Also delete associated courses
    await Course.deleteMany({ trainingProvider: provider.userId });

    return successResponse(res, null, "Training provider and associated courses deleted successfully");
  } catch (error) {
    throw internalServer("Failed to delete training provider");
  }
});

// Get training provider statistics
const getTrainingProviderStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    // Get provider profile
    const provider = await TrainingInstitute.findOne({ userId });

    if (!provider) {
      return notFoundResponse("Training provider profile not found");
    }

    // Get course statistics
    const totalCourses = await Course.countDocuments({
      trainingProvider: userId,
    });
    const activeCourses = await Course.countDocuments({
      trainingProvider: userId,
      status: "approved",
    });
    const pendingCourses = await Course.countDocuments({
      trainingProvider: userId,
      status: "pending_approval",
    });

    // Get course categories breakdown
    const coursesByCategory = await Course.aggregate([
      { $match: { trainingProvider: userId } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return successResponse(res, {
      provider: {
        id: provider._id,
        status: provider.status,
        established: provider.established,
        focusAreas: provider.focusAreas,
      },
      courses: {
        total: totalCourses,
        active: activeCourses,
        pending: pendingCourses,
        byCategory: coursesByCategory,
      },
    }, "Training provider statistics fetched successfully");
  } catch (error) {
    throw internalServer("Failed to fetch training provider statistics");
  }
});

// match students controlller
const matchStudents = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.query;
    if (!jobId) {
      return badRequestResponse("jobId query parameter is required");
    }

    // Fetch the job and required skills
    const job = await Job.findById(jobId).lean();
    if (!job) {
      return notFoundResponse("Job not found");
    }
    const requiredSkills = (job.skillsRequired || []).map((s) =>
      typeof s === "string"
        ? s.trim().toLowerCase()
        : (s.skill || "").trim().toLowerCase()
    );
    if (!requiredSkills.length) {
      return badRequestResponse("Job does not have any required skills defined");
    }

    // Fetch all students with skills
    const students = await Student.find({ skills: { $exists: true, $ne: [] } })
      .select("_id userId skills")
      .lean();

    // Prepare userId list for batch user lookup
    const userIds = students.map((s) => s.userId);

    // Fetch user info in one query
    const users = await User.find(
      { _id: { $in: userIds } },
      "fullName email"
    ).lean();
    const usersMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Match students based on skill overlap
    const matched = students
      .map((student) => {
        const studentSkills = (student.skills || []).map((s) =>
          s.toLowerCase()
        );
        const matchedSkills = requiredSkills.filter((skill) =>
          studentSkills.includes(skill)
        );
        const matchPercent =
          requiredSkills.length > 0
            ? Math.round((matchedSkills.length / requiredSkills.length) * 100)
            : 0;
        return {
          studentId: student._id,
          user: usersMap[student.userId?.toString()] || null,
          skills: student.skills,
          matchedSkills,
          matchPercent,
        };
      })
      .filter((s) => s.matchPercent >= 80)
      .sort((a, b) => b.matchPercent - a.matchPercent);

    return successResponse(res, {
      job: {
        _id: job._id,
        jobTitle: job.jobTitle,
        requiredSkills: job.skillsRequired,
      },
      matchedStudents: matched,
    }, `Found ${matched.length} students matching at least 80% of required skills.`);
  } catch (error) {
    console.error("Error in matchStudents:", error);
    throw internalServer("Failed to match students for the job");
  }
});

// Student directory controller
const studentsDirectory = asyncHandler(async (req, res) => {
  try {
    // Query params: schoolId (required), page, limit
    const { schoolId, page = 1, limit = 20 } = req.query;

    if (!schoolId) {
      return badRequestResponse("schoolId query parameter is required");
    }

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Find students for the school (without populate)
    const students = await Student.find({ trainingInstitute: schoolId })
      .select("_id userId courses")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (!students.length) {
      return notFoundResponse("No students found for the given school");
    }

    // Collect userIds for batch lookup
    const userIds = students.map((s) => s.userId);

    // Batch fetch user info
    const users = await User.find({ _id: { $in: userIds } })
      .select("fullName email phone location status")
      .lean();

    const usersMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Format response
    const formatted = students.map((s) => {
      const user = usersMap[s.userId?.toString()] || {};
      return {
        studentId: s._id,
        name: user.fullName || "",
        email: user.email || "",
        phone: user.phone || "",
        courses: s.courses || [],
        status: user.status || "",
      };
    });

    // Total count for pagination
    const total = await Student.countDocuments({ trainingInstitute: schoolId });

    return successResponse(res, {
      students: formatted,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, "Students directory fetched successfully");
  } catch (error) {
    console.error("Error in studentsDirectory:", error);
    throw internalServer("Failed to fetch students directory");
  }
});

// Employers directory
const employerDirectory = asyncHandler(async (req, res) => {
  try {
    // Query params: page, limit
    const { page = 1, limit = 20 } = req.query;

    // Pagination
    const skip = (Number(page) - 1) * Number(limit);

    // Find all employers (without populate)
    const employers = await Employer.find({})
      .select("_id userId companyName companyLocation industry")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (!employers.length) {
      return notFoundResponse("No employers found");
    }

    // Collect userIds for batch lookup
    const userIds = employers.map((e) => e.userId);

    // Batch fetch user info
    const users = await User.find({ _id: { $in: userIds } })
      .select("fullName email phone")
      .lean();

    const usersMap = users.reduce((acc, user) => {
      acc[user._id.toString()] = user;
      return acc;
    }, {});

    // Format response
    const formatted = employers.map((e) => {
      const user = usersMap[e.userId?.toString()] || {};
      return {
        employerId: e._id,
        name: {
          fullName: user.fullName || "",
          email: user.email || "",
          phone: user.phone || "",
        },
        company: {
          name: e.companyName || "",
          location: e.companyLocation || "",
        },
        industry: e.industry || "",
      };
    });

    // Total count for pagination
    const total = await Employer.countDocuments({});

    return successResponse(res, {
      employers: formatted,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    }, "Employers directory fetched successfully");
  } catch (error) {
    console.error("Error in employerDirectory:", error);
    throw internalServer("Failed to fetch employers directory");
  }
});

// controller for dashboard (aggregation-based, no helper functions)
const dashboardController = asyncHandler(async (req, res) => {
  try {
    const { schoolId } = req.query;
    if (!schoolId) {
      return badRequestResponse("schoolId query parameter is required");
    }
    // Get all courses and active courses in one aggregation
    const coursesAgg = await Course.aggregate([
      { $match: { trainingProvider: typeof schoolId === 'string' ? new mongoose.Types.ObjectId(schoolId) : schoolId } },
      {
        $facet: {
          allCourses: [
            { $project: { _id: 1, price: 1, status: 1 } }
          ],
          activeCourses: [
            { $match: { status: "approved" } }
          ]
        }
      }
    ]);
    const allCourses = coursesAgg[0]?.allCourses || [];
    const activeCourses = coursesAgg[0]?.activeCourses || [];
    const courseIds = allCourses.map(c => c._id);

    // Enrollment analytics
    const enrollmentStats = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      }
    ]);
    const totalEnrollments = enrollmentStats[0]?.totalEnrollments || 0;
    const completedEnrollments = enrollmentStats[0]?.completedEnrollments || 0;
    const completionRate = totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0;

    // Revenue analytics
    const revenueStats = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, paymentStatus: "paid" } },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseInfo"
        }
      },
      { $unwind: "$courseInfo" },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$courseInfo.price" }
        }
      }
    ]);
    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    // Response
    return successResponse(res, {
      totalEnrollments,
      completedEnrollments,
      completionRate: completionRate.toFixed(2) + "%",
      totalRevenue,
      totalActiveCourses: activeCourses.length,
      activeCourses
    }, "Dashboard analytics fetched successfully (aggregation)");
  } catch (error) {
    console.error("Error in dashboardController (aggregation):", error);
    throw internalServer("Failed to fetch dashboard analytics");
  }
});

export {
  getProfile,
  editProfile,
  getAllTrainingProviders,
  getTrainingProviderById,
  searchTrainingProviders,
  updateTrainingProviderStatus,
  deleteTrainingProvider,
  getTrainingProviderStats,
  matchStudents,
  studentsDirectory,
  dashboardController
};