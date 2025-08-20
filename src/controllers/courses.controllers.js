import { Course , TrainingInstitute} from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, notFound, internalServer } from "../utils/ApiError.js";
import { successResponse, createdResponse, badRequestResponse } from "../utils/ApiResponse.js";

// ===============================
// GET ALL COURSES
// ===============================
const getCourses = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10, category } = req.query;
    const filter = {};

    if (category) {
      filter.category = { $regex: category, $options: "i" };
    }

    const skip = (page - 1) * Math.min(limit, 100);
    const limitNum = Math.min(Number(limit), 100);

    // Use aggregation for better performance instead of populate
    const pipeline = [
      { $match: filter },
      {
        $lookup: {
          from: "traininginstitutes",
          localField: "trainingProvider",
          foreignField: "_id",
          as: "provider",
          pipeline: [{ $project: { name: 1, email: 1 } }]
        }
      },
      {
        $project: {
          title: 1,
          instructor: 1,
          duration: 1,
          price: 1,
          category: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          trainingProvider: { $arrayElemAt: ["$provider", 0] }
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum }
    ];

    const [courses, total] = await Promise.all([
      Course.aggregate(pipeline),
      Course.countDocuments(filter)
    ]);

    if (!courses.length) {
      throw notFound("No courses found");
    }

    return res.status(200).json(
      successResponse(
        {
          courses,
          pagination: {
            page: Number(page),
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
        "Courses fetched successfully"
      )
    );
  } catch (error) {
    console.error("Get courses error:", error);
    throw internalServer("Failed to fetch courses");
  }
});

// ===============================
// GET COURSE BY ID
// ===============================
const getCoursesById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id).populate("trainingProvider", "name email");

    if (!course) {
      throw notFound("Course not found");
    }

    return res.status(200).json(successResponse({ course }, "Course fetched successfully"));
  } catch (error) {
    console.error("Get course by ID error:", error);
    throw internalServer("Failed to fetch course");
  }
});

// ===============================
// CREATE COURSE
// ===============================
const createCourse = asyncHandler(async (req, res) => {
  try {
    const { title, instructor, duration, price, language, type, description, objectives, skills, category, maxEnrollments } = req.body;
        const school = await TrainingInstitute.findOne({ userId: req.user._id });
    const trainingProvider = school._id;

    // Schema-level validations already exist, but we also check at controller-level for clarity
    if (!title || !instructor || !duration || price == null || !language || !type || !description || !objectives?.length || !skills?.length || !category) {
      throw badRequest("All required fields must be provided");
    }
// Checking if the course already exists
const existingCourses = await Course.findOne({
    trainingProvider,
    title,
    instructor
});

if (existingCourses) {
  return res.status(409).json({
    success: false,
    status: 409,
    message: "Course already exists"
  });
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
      category,
      trainingProvider,
      maxEnrollments: maxEnrollments ?? 50,
      status: "approved"
    });

    return res.status(201).json(createdResponse({ course }, "Course created successfully"));
  } catch (error) {
    console.error("Create course error:", error);
    throw internalServer("Failed to create course");
  }
});

// ===============================
// UPDATE COURSE
// ===============================
const updateCourse = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = req.user._id;

    const existingCourse = await Course.findById(id);
    if (!existingCourse) {
      throw notFound("Course not found");
    }

    if (existingCourse.trainingProvider?.toString() !== userId.toString()) {
      throw badRequest("You can only update your own courses");
    }

    const course = await Course.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!course) {
      throw notFound("Course update failed");
    }

    return res.status(200).json(successResponse({ course }, "Course updated successfully"));
  } catch (error) {
    console.error("Update course error:", error);
    throw internalServer("Failed to update course");
  }
});

// ===============================
// UPDATE COURSE STATUS (ADMIN)
// ===============================
const updateCourseStatus = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (req.user?.role !== "admin") {
      throw badRequest("Only admin can update course status");
    }

    const validStatuses = ["draft", "pending_approval", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      throw badRequest("Invalid status value");
    }

    const course = await Course.findByIdAndUpdate(id, { status }, { new: true });
    if (!course) {
      throw notFound("Course not found or update failed");
    }

    return res.status(200).json(successResponse({ course }, "Course status updated successfully"));
  } catch (error) {
    console.error("Update course status error:", error);
    throw internalServer("Failed to update course status");
  }
});

// ===============================
// DELETE COURSE (ADMIN)
// ===============================
const deleteCourseById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findByIdAndDelete(id);

    if (!course) {
      throw notFound("Course not found or already deleted");
    }

    return res.status(200).json(successResponse(null, "Course deleted successfully"));
  } catch (error) {
    console.error("Delete course error:", error);
    throw internalServer("Failed to delete course");
  }
});

// ===============================
// SEARCH COURSES (category, title, instructor)
// ===============================
const searchCourses = asyncHandler(async (req, res) => {
  try {
    const { q, title, category, location, page = 1, limit = 10 } = req.query;

    const searchFilter = {};

    if (q) {
      // Broad search when `q` is present
      searchFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { instructor: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { location: { $regex: q, $options: "i" } }
      ];
    } else {
      // Specific filtering when `q` is NOT passed
      if (title) {
        searchFilter.title = { $regex: title, $options: "i" };
      }
      if (category) {
        searchFilter.category = { $regex: category, $options: "i" };
      }
      if (location) {
        searchFilter.location = { $regex: location, $options: "i" };
      }
    }

    const skip = (page - 1) * limit;

    const courses = await Course.find(searchFilter)
      .populate("trainingProvider", "name email")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await Course.countDocuments(searchFilter);

    return res.status(200).json(
      successResponse(
        {
          courses,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
        "Search results fetched successfully"
      )
    );
  } catch (error) {
    console.error("Search courses error:", error);
    throw internalServer("Failed to search courses");
  }
});


// ===============================
// GET COURSES BY PROVIDER
// ===============================
const getCoursesByProvider = asyncHandler(async (req, res) => {
  try {
    const { providerId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const courses = await Course.find({ trainingProvider: providerId })
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    if (!courses.length) {
      throw notFound("No courses found for this provider");
    }

    const total = await Course.countDocuments({ trainingProvider: providerId });

    return res.status(200).json(
      successResponse(
        {
          courses,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
        "Courses by provider fetched successfully"
      )
    );
  } catch (error) {
    console.error("Get courses by provider error:", error);
    throw internalServer("Failed to fetch courses by provider");
  }
});

export {
  getCourses,
  getCoursesById,
  createCourse,
  updateCourse,
  updateCourseStatus,
  deleteCourseById,
  searchCourses,
  getCoursesByProvider,
};
