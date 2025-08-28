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
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  successResponse,
  notFoundResponse,
  badRequestResponse,
  validationErrorResponse,
  conflictResponse,
  serverErrorResponse,
  createdResponse,
  updatedResponse,
} from "../utils/ApiResponse.js";
// Create training provider profile
const createProfile = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const data = req.body;

    // Check if profile already exists for this user
    const existing = await TrainingInstitute.findOne({ userId });
    if (existing) {
      return res.json(conflictResponse("Training  provider profile already exists"));
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
        return res.json( badRequestResponse (
           `Field '${field}' is required`,
          )
        );
      }
    }
    if (typeof data.location !== "string") {
      return res.json(badRequestResponse("Location must be a string (address, city, etc.)"));
    }
    if (data.about && data.about.length > 1000) {
      return res.json(badRequestResponse("About section cannot be "));
    }



    const imageLocalPath = req.file?.path
    // Handle image upload if file is provided
    if (imageLocalPath) {
      const imageUpload = await uploadOnCloudinary(req.file.path);
      if (!imageUpload || !imageUpload.secure_url) {
        return res.json(serverErrorResponse("Failed to upload the image"));
      }
      data.picture = imageUpload.secure_url;
    }

    // Add userId to the profile data
    data.userId = userId;

    const profile = new TrainingInstitute(data);
    await profile.save();

    return res.status(201).json(createdResponse({profile} , "Profile created successfully"));
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
      return res.json(notFoundResponse("Profile of training provider not found"));
    }
    return res.status(200).json(successResponse({profile},"Training provider profile found successfully"));
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
      return res.json(badRequestResponse("Insittute name cannot be empty"));
    }
    if (updates.email && !updates.email.trim()) {
      return res.json(badRequestResponse("Email cannot be empty"));
    }
    if (updates.phone && !updates.phone.trim()) {
      return res.json(
        badRequestResponse("Phone number cannot be empty")
      );
    }
    if (updates.about && updates.about.length > 1000) {
      return res.json(badRequestResponse("About section cannot be empty"));
    }

    const updatedProfile = await TrainingInstitute.findOneAndUpdate(
      { userId: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedProfile) {
      return res.json(notFoundResponse("Profile not created"));
    }

    return res.json(updatedResponse("Profile updated successfully"));
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
    } catch (err) {
      throw internalServer("DB error in TrainingInstitute.find");
    }

    let total;
    try {
      total = await TrainingInstitute.countDocuments(filter);
    } catch (err) {
      throw internalServer("DB error in TrainingInstitute.countDocuments");
    }

    return res.json(successResponse(
      {
        data: providers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
      "All training providers fetched successfully"
    ));
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
      return res.json(notFoundResponse("Failed to find the training provider"));
    }

    // Get courses offered by this provider
    const courses = await Course.find({ trainingProvider: provider.userId })
      .select("title instructor duration price category status")
      .limit(5);

    return res.status(200).json(successResponse({
      payload: {
        ...provider.toObject(),
        courses,
      },
    }, "Training provider found successfully"
  ));
  } catch (error) {
    throw internalServer("Failed to fetch training provider");
  }
});

// Search training providers
const searchTrainingProviders = asyncHandler(async (req, res) => {
  try {
    const { q, focusArea, city, page = 1, limit = 10 } = req.query;

    if (!q) {
      return res.json(badRequestResponse("Search query is required"));
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

    return res.status(200).json(successResponse({
      payload: {
        data: providers,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    },'Training providers found with the query'));
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
      return res.json(badRequestResponse("Invalid status value. Valid values are: active, inactive, suspended"));
    }

    const provider = await TrainingInstitute.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!provider) {
      return res.json(notFoundResponse("Training provider not found"));
    }

    return res.json(successResponse("Training provider status updated successfully"));
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
      return res.json(notFoundResponse("Training provider not found"));
    }

    // Also delete associated courses
    await Course.deleteMany({ trainingProvider: provider.userId });

    return res.status(200).json(
      successResponse("Training provider and its associated courses deleted successfully")
    );
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
      return res.json(notFoundResponse("Training provider not found"));
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

    return res.status(200).json(
      successResponse({
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
    },
  "Training provider statistics fetched successfully")
    );
  } catch (error) {
    throw internalServer("Failed to fetch training provider statistics");
  }
});

// match students controlller
const matchStudents = asyncHandler(async (req, res) => {
  try {
    const { jobId } = req.query;
    if (!jobId) {
      return res.json(
        badRequestResponse("Job id in query is necessary to be provided")
      );
    }

    // Fetch the job and required skills
    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.json(
        notFoundResponse("Job not found")
      );
    }
    // Extract only skill names (ignore proficiency levels)
    const requiredSkills = (job.skillsRequired || []).map((s) =>
      typeof s === "string"
        ? s.trim().toLowerCase()
        : (s.skill || "").trim().toLowerCase()
    );
    if (!requiredSkills.length) {
      return res.json(
        notFoundResponse("Job does not have that skills to match student")
      );

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
      .filter((s) => s.matchPercent >= 70)
      .sort((a, b) => b.matchPercent - a.matchPercent);

    return res.json(successResponse({
      payload: {
        job: {
          _id: job._id,
          jobTitle: job.jobTitle,
          requiredSkills: job.skillsRequired,
        },
        matchedStudents: matched,
      },
    }  , 
     `Found ${matched.length} students matching at least 70% of required skills.`)
  );
  } catch (error) {throw internalServer("Failed to match students for the job");
  }
});

// Student directory controller
const studentsDirectory = asyncHandler(async (req, res) => {
  try {
    // Query params: page, limit
    const { page = 1, limit = 20 } = req.query;

    // Find the school for the current user
    const school = await TrainingInstitute.findOne({ userId: req.user._id });
    const schoolId = school?._id;
    if (!schoolId) {
      return res.json(badRequestResponse("SchoolId query parameter is required"));
    }

    // Find all courses for this school
    const courses = await Course.find({ trainingProvider: schoolId }).select('_id');
    const courseIds = courses.map((c) => c._id);
    if (!courseIds.length) {
      return res.json(notFoundResponse(
        "No courses exist for this school to find students"
      ));
    }

    // Find enrollments for these courses (status: enrolled/in-progress)
    const enrollmentFilter = {
      courseId: { $in: courseIds },
      status: { $in: ["enrolled", "in-progress"] },
    };
    const skip = (Number(page) - 1) * Number(limit);
    const enrollments = await Enrollment.find(enrollmentFilter)
      .select("studentId courseId")
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (!enrollments.length) {
      return res.json(
        notFoundResponse(
          "No enrollments found for this school"
        )
      );
    }

    // Collect unique studentIds
    const studentIds = [...new Set(enrollments.map((e) => e.studentId?.toString()))];
    if (!studentIds.length) {
      return res.json(notFoundResponse(
        "No currently enrolled students found for this school"
      ));
    }


    // Fetch Student and User info by userId (Enrollment.studentId is a User _id)
    const students = await Student.find({ userId: { $in: studentIds } })
      .select("_id userId courses")
      .lean();
    const userIds = students.map((s) => s.userId);
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
    const total = await Enrollment.countDocuments(enrollmentFilter);

    return res.status(200).json(
      successResponse(
        {
      payload: {
        students: formatted,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    },
    "Students directory fetched successfully"
      )
    );
  } catch (error) {
    throw internalServer("Failed to fetch students directory");
  }
});

// Employers directory
const employerDirectory = asyncHandler(async (req, res) => {
  try {
    // Query params: page, limit
    const { page = 1, limit = 20 } = req.query;

    // Validate and sanitize pagination parameters
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.min(Math.max(Number(limit) || 20, 1), 100); // Enforce a max limit of 100

    // Pagination
    const skip = (pageNum - 1) * limitNum;

    // Find all employers (without populate)
    const employers = await Employer.find({})
      .select("_id userId companyName companyLocation industry")
      .skip(skip)
      .limit(limitNum)
      .lean();

    if (!employers.length) {
      return res.json(
        successResponse(
          {
            employers: [],
            pagination: {
              page: pageNum,
              limit: limitNum,
              total: 0,
              totalPages: 0,
            },
          },
          "No employers found"
        )
      );
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

    return res.json(
      successResponse(
        {
          employers: formatted,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        },
        "Employers directory fetched successfully"
      )
    );
  } catch (error) {
    console.error("Error in employerDirectory:", error);
    throw internalServer("Failed to fetch employers directory");
  }
});

// controller for dashboard (aggregation-based, no helper functions)
const dashboardController = asyncHandler(async (req, res) => {
 try {
    // Calculate total enrollments
    const totalEnrollments = await Enrollment.countDocuments();

    // Calculate completion rate
    const completedEnrollments = await Enrollment.countDocuments({ status: "completed" });
    const completionRate = totalEnrollments > 0 
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2) 
      : 0;

    // Calculate monthly revenue
    const enrollments = await Enrollment.find()
      .populate("courseId", "price")
      .lean();
    const totalRevenue = enrollments.reduce((sum, enrollment) => {
      return sum + (enrollment.courseId?.price || 0);
    }, 0);

    // Calculate active courses
    const activeCourses = await Course.countDocuments({ status: "approved" });

    return res.json(
      successResponse(
        {
          totalEnrollments,
          completionRate,
          totalRevenue,
          activeCourses,
        },
        "Dashboard statistics calculated successfully",
      )
    );
  } catch (error) {
    console.error("Error in dashboardController:", error);
    throw internalServer("Failed to calculate dashboard statistics");
  }
});

// Add user profile picture controller
const addPicture = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const imageLocalPath = req.file?.path || req.files?.[0]?.path;
    if (!imageLocalPath) {
      return res.json(
        badRequestResponse("Image is not provided")
      );
    }

    // Upload to cloudinary
    const imageUrl = await uploadOnCloudinary(imageLocalPath);
    if (!imageUrl || !imageUrl.secure_url) {
      return res.json(
        serverErrorResponse("Error in uploading the image")
      );
    }

    // Update profile by userId (not _id)
    const updatedUser = await TrainingInstitute.findOneAndUpdate(
      { userId },
      { $set: { picture: imageUrl.secure_url } },
      { new: true, projection: { password: 0, refreshToken: 0 } }
    );

    if (!updatedUser) {
      return res.json(
        notFoundResponse("User is not updated")
      );
    }

    return res.json(
      successResponse(
        { user: updatedUser, imageUrl: imageUrl.secure_url },
        "Profile picture updated successfully"
      )
    );
  } catch (error) {
    throw internalServer("Failed to update the profile picture")
  }
});


export {
  getProfile,
  editProfile,
  createProfile,
  addPicture,
  getAllTrainingProviders,
  getTrainingProviderById,
  searchTrainingProviders,
  updateTrainingProviderStatus,
  deleteTrainingProvider,
  getTrainingProviderStats,
  matchStudents,
  studentsDirectory,
  dashboardController,
  employerDirectory
};
