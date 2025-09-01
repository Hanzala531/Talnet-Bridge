import { Course, TrainingInstitute } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  successResponse,
  createdResponse,
  badRequestResponse,
  serverErrorResponse,
  notFoundResponse,
  conflictResponse,
} from "../utils/ApiResponse.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { createCourseCreationNotifications } from "../services/notification.service.js";
import fs from 'fs'
import { internalServer } from "../utils/ApiError.js";

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
          pipeline: [{ $project: { name: 1, email: 1 } }],
        },
      },
      {
        $project: {
          coverImage : 1,
          instructorPicture: 1,
          title: 1,
          instructor: 1,
          duration: 1,
          price: 1,
          category: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          trainingProvider: { $arrayElemAt: ["$provider", 0] },
        },
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limitNum },
    ];

    const [courses, total] = await Promise.all([
      Course.aggregate(pipeline),
      Course.countDocuments(filter),
    ]);

    if (!courses.length) {
      return res.json(notFoundResponse("No courses found"));
    }

    return res.json(
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
    throw internalServer("Failed to fetch courses");
  }
});

// ===============================
// GET COURSE BY ID
// ===============================
const getCoursesById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return res.json (notFoundResponse("Course not found"));
    }

    return res
      .json(successResponse({ course }, "Course fetched successfully"));
  } catch (error) {
    throw internalServer("Failed to fetch course");
  }
});

// ==============
// CREATE COURSE
// ==============
const createCourse = asyncHandler(async (req, res) => {
  try {
    const {
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
      maxEnrollments,
    } = req.body;

    const school = await TrainingInstitute.findOne({ userId: req.user._id });
    if (!school) {
      return res.json(
        badRequestResponse("Training provider (school) not found for this user")
      );
    }
    const trainingProvider = school._id;

    if (
      !title ||
      !instructor ||
      !duration ||
      price == null ||
      !language ||
      !type ||
      !description ||
      !objectives?.length ||
      !skills?.length ||
      !category
    ) {
      return res.json(
        badRequestResponse("All required fields must be provided")
      );
    }

    const existingCourses = await Course.findOne({
      trainingProvider,
      title,
      instructor,
    });

    if (existingCourses) {
      return res.json(conflictResponse("Course already exists"));
    }

    // Expecting req.files.coverImage and req.files.instructorImage (Multer array fields)
    const coverImagePath = req.files?.coverImage?.[0]?.path;
    const instructorImagePath = req.files?.instructorImage?.[0]?.path;

    if (!coverImagePath)
      return res.json(badRequestResponse("Course image is not uploaded"));
    if (!instructorImagePath)
      return res.json(badRequestResponse("Instructor image is not uploaded"));

    // Upload images to cloudinary
    const coverImageUpload = await uploadOnCloudinary(coverImagePath);
    const instructorImageUpload = await uploadOnCloudinary(instructorImagePath);

    if (!coverImageUpload || !instructorImageUpload){
      if(coverImagePath) fs.unlinkSync(coverImagePath);
      if(instructorImagePath) fs.unlinkSync(instructorImagePath);
      return res.json(
        serverErrorResponse("Failed to upload images due to some issue")
      )};

    const course = await Course.create({
      coverImage: coverImageUpload.url,
      instructorPicture: instructorImageUpload.url,
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
      status: "approved",
    });

    school.courses.push(course._id);
    await school.save();

    // Send notifications to students who have enrolled in courses from this school
    try {
      const io = req.app.get("io"); // Get socket.io instance
      await createCourseCreationNotifications(course, school.name, io);
    } catch (notificationError) {
      // Log the error but don't fail the course creation
      console.error("Failed to send course creation notifications:", notificationError);
    }

    return res.json(
      createdResponse({ course }, "Course created successfully")
    );
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
      return res.json (notFoundResponse("Course not found"));
    }

    if (existingCourse.trainingProvider?.toString() !== userId.toString()) {
      return res.json (badRequestResponse("You can only update your own courses"));
    }

    const course = await Course.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });
    if (!course) {
      return res.json (notFoundResponse("Course update failed"));
    }

    return res
      .json(successResponse({ course }, "Course updated successfully"));
  } catch (error) {
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
      return res.json(badRequestResponse("Only admin can update course status"));
    }

    const validStatuses = ["draft", "pending_approval", "approved", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.json (badRequestResponse("Invalid status value"));
    }

    const course = await Course.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );
    if (!course) {
      return res.json (notFoundResponse("Course not found or update failed"));
    }

    return res
      .json(successResponse({ course }, "Course status updated successfully"));
  } catch (error) {
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
      return res.json (notFoundResponse("Course not found or already deleted"));
    }

    return res
      .json(successResponse(null, "Course deleted successfully"));
  } catch (error) {
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
        { location: { $regex: q, $options: "i" } },
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

    return res.json(
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
       return res.json (notFoundResponse("No courses found for this provider"));
    }

    const total = await Course.countDocuments({ trainingProvider: providerId });

    return res.json(
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
