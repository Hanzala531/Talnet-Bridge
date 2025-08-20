import { internalServer } from "../utils/ApiError.js";
import {
  Enrollment,
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
  validationErrorResponse,
} from "../utils/ApiResponse.js";
// Create training provider profile
const createProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const data = req.body;

    // Check if profile already exists for this user
    const existing = await TrainingInstitute.findOne({ userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Training provider profile already exists",
        payload: null,
      });
    }

    // Validate required fields for new schema
    const requiredFields = [
      "name",
      "email",
      "phone",
      "about",
      "established",
      "location",
    ];
    for (const field of requiredFields) {
      if (
        !data[field] ||
        (typeof data[field] === "string" && !data[field].trim())
      ) {
        return res.status(400).json({
          success: false,
          message: `Field '${field}' is required`,
          payload: null,
        });
      }
    }
    if (typeof data.location !== "string") {
      return res.status(400).json({
        success: false,
        message: "Location must be a string (address, city, etc.)",
        payload: null,
      });
    }
    if (data.about && data.about.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "About section cannot exceed 1000 characters",
        payload: null,
      });
    }

    // Add userId to the profile data
    data.userId = userId;

    const profile = new TrainingInstitute(data);
    await profile.save();

    return res.status(201).json({
      success: true,
      message: "Training provider profile created successfully",
      payload: profile,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        payload: Object.values(error.errors).map((e) => e.message),
      });
    }
    throw internalServer("Failed to create training provider profile");
  }
});
// Get own profile controller
const getProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;

    const profile = await TrainingInstitute.findOne({ userId: userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Training provider profile not found",
        payload: null,
      });
    }
    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      payload: profile,
    });
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
    if (updates.name && !updates.name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Institute name cannot be empty",
        payload: null,
      });
    }
    if (updates.email && !updates.email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Institute email cannot be empty",
        payload: null,
      });
    }
    if (updates.phone && !updates.phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Institute phone cannot be empty",
        payload: null,
      });
    }
    if (updates.about && updates.about.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "About section cannot exceed 1000 characters",
        payload: null,
      });
    }

    const updatedProfile = await TrainingInstitute.findOneAndUpdate(
      { userId: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        payload: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      payload: updatedProfile,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(422).json({
        success: false,
        message: "Validation failed",
        payload: Object.values(error.errors).map((e) => e.message),
      });
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

    const skip = (Number(page) - 1) * Number(limit);
    let providers;
    try {
      providers = await TrainingInstitute.find(filter)
        .skip(skip)
        .limit(Number(limit))
        .sort({ createdAt: -1 });
    } catch (err) {throw internalServer("DB error in TrainingInstitute.find");
    }

    let total;
    try {
      total = await TrainingInstitute.countDocuments(filter);
    } catch (err) {
      throw internalServer("DB error in TrainingInstitute.countDocuments");
    }

    return res.status(200).json({
      success: true,
      message: "Training providers fetched successfully",
      payload: {
        data: providers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
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
      return res.status(404).json({
        success: false,
        message: "Training provider not found",
        payload: null,
      });
    }

    // Get courses offered by this provider
    const courses = await Course.find({ trainingProvider: provider.userId })
      .select("title instructor duration price category status")
      .limit(5);

    return res.status(200).json({
      success: true,
      message: "Training provider fetched successfully",
      payload: {
        ...provider.toObject(),
        courses,
      },
    });
  } catch (error) {
    throw internalServer("Failed to fetch training provider");
  }
});

// Search training providers
const searchTrainingProviders = asyncHandler(async (req, res) => {
  try {
    const { q, focusArea, city, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        message: "Search query is required",
        payload: null,
      });
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

    return res.status(200).json({
      success: true,
      message: "Training providers search successful",
      payload: {
        data: providers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
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
      return res.status(400).json({
        success: false,
        message:
          "Invalid status value. Valid values are: active, inactive, suspended",
        payload: null,
      });
    }

    const provider = await TrainingInstitute.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Training provider not found",
        payload: null,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Training provider status updated successfully",
      payload: provider,
    });
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
      return res.status(404).json({
        success: false,
        message: "Training provider not found",
        payload: null,
      });
    }

    // Also delete associated courses
    await Course.deleteMany({ trainingProvider: provider.userId });

    return res.status(200).json({
      success: true,
      message: "Training provider and associated courses deleted successfully",
      payload: null,
    });
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
      return res.status(404).json({
        success: false,
        message: "Training provider profile not found",
        payload: null,
      });
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

    return res.status(200).json({
      success: true,
      message: "Training provider statistics fetched successfully",
      payload: {
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
      },
    });
  } catch (error) {
    throw internalServer("Failed to fetch training provider statistics");
  }
});

// match students controlller
const matchStudents = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.query;
    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: "jobId query parameter is required",
        payload: null,
      });
    }

    // Fetch the job and required skills
    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({
        success: false,
        message: "Job not found",
        payload: null,
      });
    }
    const requiredSkills = (job.skillsRequired || []).map((s) =>
      typeof s === "string"
        ? s.trim().toLowerCase()
        : (s.skill || "").trim().toLowerCase()
    );
    if (!requiredSkills.length) {
      return res.status(400).json({
        success: false,
        message: "Job does not have any required skills defined",
        payload: null,
      });
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

    return res.status(200).json({
      success: true,
      message: `Found ${matched.length} students matching at least 80% of required skills.`,
      payload: {
        job: {
          _id: job._id,
          jobTitle: job.jobTitle,
          requiredSkills: job.skillsRequired,
        },
        matchedStudents: matched,
      },
    });
  } catch (error) {throw internalServer("Failed to match students for the job");
  }
});

// Student directory controller
const studentsDirectory = asyncHandler(async (req, res) => {
  try {
    // Query params: schoolId (required), page, limit
    const {  page = 1, limit = 20 } = req.query;

    const school = await TrainingInstitute.findOne({ userId: req.user._id });
    const schoolId = school._id

    if (!schoolId) {
      return res.status(400).json({
        success: false,
        message: "schoolId query parameter is required",
        payload: null,
      });
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
      return res.status(404).json({
        success: false,
        message: "No students found for the given school",
        payload: null,
      });
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

    return res.status(200).json({
      success: true,
      message: "Students directory fetched successfully",
      payload: {
        students: formatted,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {throw internalServer("Failed to fetch students directory");
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
      return res.status(404).json({
        success: false,
        message: "No employers found",
        payload: null,
      });
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

    return res.status(200).json({
      success: true,
      message: "Employers directory fetched successfully",
      payload: {
        employers: formatted,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {throw internalServer("Failed to fetch employers directory");
  }
});

// controller for dashboard (aggregation-based, no helper functions)
const dashboardController = asyncHandler(async (req, res) => {
  try {
    // Find institute by userId
    const school = await TrainingInstitute.findOne({ userId: req.user._id });
    if (!school) {
      return res.status(404).json({
        success: false,
        message: "Training institute not found for this user",
        payload: null,
      });
    }
    const schoolId = school._id;


    // Courses aggregation
    const coursesAgg = await Course.aggregate([
      { $match: { trainingProvider: schoolId } },
      {
        $facet: {
          allCourses: [{ $project: { _id: 1, price: 1, status: 1 } }],
          activeCourses: [{ $match: { status: "approved" } }],
        },
      },
    ]);

    const allCourses = coursesAgg[0]?.allCourses || [];
    const activeCourses = coursesAgg[0]?.activeCourses || [];
    const courseIds = allCourses.map((c) => c._id);

    // Agar courses hi nahi mile
    if (courseIds.length === 0) {
      return res.status(200).json({
        success: true,
        message: "Dashboard analytics fetched successfully",
        payload: {
          totalEnrollments: 0,
          completedEnrollments: 0,
          completionRate: "0%",
          completionRateValue: 0,
          totalRevenue: 0,
          totalActiveCourses: 0,
          activeCourses: [],
        },
      });
    }

    // Enrollment analytics
    const enrollmentStats = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds } } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
        },
      },
    ]);

    const totalEnrollments = enrollmentStats[0]?.totalEnrollments || 0;
    const completedEnrollments = enrollmentStats[0]?.completedEnrollments || 0;
    const completionRateValue =
      totalEnrollments > 0
        ? (completedEnrollments / totalEnrollments) * 100
        : 0;

    // Revenue analytics
    const revenueStats = await Enrollment.aggregate([
      { $match: { course: { $in: courseIds }, paymentStatus: "paid" } },
      {
        $lookup: {
          from: "courses",
          localField: "course",
          foreignField: "_id",
          as: "courseInfo",
        },
      },
      { $unwind: "$courseInfo" },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$courseInfo.price" },
        },
      },
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;

    // Response
    return res.status(200).json({
      success: true,
      message: "Dashboard analytics fetched successfully",
      payload: {
        totalEnrollments,
        completedEnrollments,
        completionRate: completionRateValue.toFixed(2) + "%",
        completionRateValue,
        totalRevenue,
        totalActiveCourses: activeCourses.length,
        activeCourses,
      },
    });
  } catch (error) {return res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard analytics",
      payload: null,
    });
  }
});

export {
  getProfile,
  editProfile,
  createProfile,
  getAllTrainingProviders,
  getTrainingProviderById,
  searchTrainingProviders,
  updateTrainingProviderStatus,
  deleteTrainingProvider,
  getTrainingProviderStats,
  matchStudents,
  studentsDirectory,
  dashboardController,
};
