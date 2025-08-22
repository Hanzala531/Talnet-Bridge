import { Experience, Student } from "../models/index.js";
import {
  successResponse,
  createdResponse,
  updatedResponse,
} from "../utils/ApiResponse.js";
import {
  badRequest,
  internalServer,
  notFound,
  forbidden,
  conflict,
} from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ===============================
// CREATE EXPERIENCE
// ===============================
const createExperience = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, company, startDate, endDate, description } = req.body;

    if (!title || !company || !startDate) {
      throw badRequest("Title, company, and startDate are required");
    }

    // Validate dates
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw badRequest("Invalid start date");
    }

    let end = null;
    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        throw badRequest("Invalid end date");
      }
      if (end < start) {
        throw badRequest("End date cannot be before start date");
      }
    }

    // Check if the experience has been already added
    const existingExperience = await Experience.findOne({
      userId,
      title: title.trim(),
      company: company.trim(),
      startDate: start,
      endDate: end,
    });

    if (existingExperience) {
      throw conflict("The experience with this data has already been added");
    }

    const experienceData = {
      userId: userId,
      title: title.trim(),
      company: company.trim(),
      startDate: start,
      endDate: end,
      description: description?.trim(),
    };

    const experience = await Experience.create(experienceData);

    // Find student by userId (should use req.user._id)
    const student = await Student.findOne({ userId: req.user._id });
    if (!student) {
      // Delete the created experience if student not found
      await Experience.findByIdAndDelete(experience._id);
      throw notFound("Student not found to link experience");
    }
    // Ensure student.experience is an array, then push new experience
    student.experience = Array.isArray(student.experience)
      ? [...student.experience, experience._id]
      : [experience._id];
    await student.save();

    return res.status(201).json(
      createdResponse(
        {
          experience: {
            _id: experience._id,
            userId: userId,
            title: experience.title,
            company: experience.company,
            startDate: experience.startDate,
            endDate: experience.endDate,
            isCurrentJob: !experience.endDate,
          },
        },
        "Experience created successfully"
      )
    );
  } catch (error) {
    throw error;
  }
});

// ===============================
// GET ALL EXPERIENCES
// ===============================
const getAllExperiences = asyncHandler(async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      company,
      title,
      isCurrentJob,
      sort = "-startDate",
      select,
    } = req.query;

    const filter = {};

    // Filter by company
    if (company) {
      filter.company = { $regex: company, $options: "i" };
    }

    // Filter by title
    if (title) {
      filter.title = { $regex: title, $options: "i" };
    }

    // Filter by current job status
    if (isCurrentJob !== undefined) {
      if (isCurrentJob === "true") {
        filter.endDate = null;
      } else if (isCurrentJob === "false") {
        filter.endDate = { $ne: null };
      }
    }

    const skip = (page - 1) * Math.min(limit, 100);
    const limitNum = Math.min(Number(limit), 100);

    // Build projection
    let projection =
      "_id title company startDate endDate description createdAt";
    if (select) {
      projection = select.split(",").join(" ");
    }

    const [experiences, total] = await Promise.all([
      Experience.find(filter)
        .select(projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Experience.countDocuments(filter),
    ]);

    // Add computed field for current job status
    const enhancedExperiences = experiences.map((exp) => ({
      ...exp,
      isCurrentJob: !exp.endDate,
      duration: calculateDuration(exp.startDate, exp.endDate),
    }));

    return res.status(200).json(
      successResponse(
        {
          experiences: enhancedExperiences,
          pagination: {
            page: Number(page),
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
        "Experiences retrieved successfully"
      )
    );
  } catch (error) {
    throw internalServer("Failed to fetch experiences");
  }
});

// ===============================
// GET EXPERIENCE BY ID
// ===============================
const getExperienceById = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const experience = await Experience.find({ userId }).lean();

    if (!experience) {
      throw notFound("Experience not found");
    }

    // Add computed fields
    const enhancedExperience = {
      ...experience,
      isCurrentJob: !experience.endDate,
      duration: calculateDuration(experience.startDate, experience.endDate),
    };

    return res
      .status(200)
      .json(
        successResponse(
          { experience: enhancedExperience },
          "Experience retrieved successfully"
        )
      );
  } catch (error) {
    throw error;
  }
});

// ===============================
// UPDATE EXPERIENCE
// ===============================
const updateExperience = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, company, startDate, endDate, description } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw badRequest("Invalid experience ID");
    }

    const experience = await Experience.findById(id);
    if (!experience) {
      throw notFound("Experience not found");
    }

    // Validate dates if provided
    let start = experience.startDate;
    let end = experience.endDate;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        throw badRequest("Invalid start date");
      }
    }

    if (endDate !== undefined) {
      if (endDate === null || endDate === "") {
        end = null; // Current job
      } else {
        end = new Date(endDate);
        if (isNaN(end.getTime())) {
          throw badRequest("Invalid end date");
        }
        if (end < start) {
          throw badRequest("End date cannot be before start date");
        }
      }
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (company !== undefined) updateData.company = company.trim();
    if (startDate !== undefined) updateData.startDate = start;
    if (endDate !== undefined) updateData.endDate = end;
    if (description !== undefined) updateData.description = description?.trim();

    Object.assign(experience, updateData);
    await experience.save();

    return res.status(200).json(
      updatedResponse(
        {
          experience: {
            _id: experience._id,
            title: experience.title,
            company: experience.company,
            startDate: experience.startDate,
            endDate: experience.endDate,
            isCurrentJob: !experience.endDate,
            duration: calculateDuration(
              experience.startDate,
              experience.endDate
            ),
          },
        },
        "Experience updated successfully"
      )
    );
  } catch (error) {
    throw error;
  }
});

// ===============================
// DELETE EXPERIENCE
// ===============================
const deleteExperience = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw badRequest("Invalid experience ID");
    }

    const experience = await Experience.findByIdAndDelete(id);
    if (!experience) {
      throw notFound("Experience not found");
    }

    return res
      .status(200)
      .json(successResponse(null, "Experience deleted successfully"));
  } catch (error) {
    throw internalServer("Failed to delete experience");
  }
});

// ===============================
// SEARCH EXPERIENCES
// ===============================
const searchExperiences = asyncHandler(async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      throw badRequest("Search query must be at least 2 characters");
    }

    const searchTerm = q.trim();
    const limitNum = Math.min(Number(limit), 50);

    const experiences = await Experience.find({
      $or: [
        { title: { $regex: searchTerm, $options: "i" } },
        { company: { $regex: searchTerm, $options: "i" } },
        { description: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("_id title company startDate endDate")
      .sort({ startDate: -1 })
      .limit(limitNum)
      .lean();

    // Add computed fields
    const enhancedExperiences = experiences.map((exp) => ({
      ...exp,
      isCurrentJob: !exp.endDate,
      duration: calculateDuration(exp.startDate, exp.endDate),
    }));

    return res.status(200).json(
      successResponse(
        {
          experiences: enhancedExperiences,
          total: enhancedExperiences.length,
          searchTerm,
        },
        "Experience search completed"
      )
    );
  } catch (error) {
    throw error;
  }
});

// ===============================
// GET EXPERIENCES BY COMPANY
// ===============================
const getExperiencesByCompany = asyncHandler(async (req, res) => {
  try {
    const { company } = req.params;
    const { page = 1, limit = 20 } = req.query;

    if (!company || company.trim().length < 2) {
      throw badRequest("Company name must be at least 2 characters");
    }

    const skip = (page - 1) * Math.min(limit, 100);
    const limitNum = Math.min(Number(limit), 100);

    const filter = { company: { $regex: company.trim(), $options: "i" } };

    const [experiences, total] = await Promise.all([
      Experience.find(filter)
        .select("_id title company startDate endDate description")
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Experience.countDocuments(filter),
    ]);

    // Add computed fields
    const enhancedExperiences = experiences.map((exp) => ({
      ...exp,
      isCurrentJob: !exp.endDate,
      duration: calculateDuration(exp.startDate, exp.endDate),
    }));

    return res.status(200).json(
      successResponse(
        {
          experiences: enhancedExperiences,
          pagination: {
            page: Number(page),
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
          company: company.trim(),
        },
        "Experiences by company retrieved successfully"
      )
    );
  } catch (error) {
    throw error;
  }
});

// ===============================
// HELPER FUNCTION
// ===============================
const calculateDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();

  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();

  let totalMonths = years * 12 + months;
  if (totalMonths < 0) totalMonths = 0;

  const displayYears = Math.floor(totalMonths / 12);
  const displayMonths = totalMonths % 12;

  if (displayYears === 0 && displayMonths === 0) {
    return "Less than a month";
  } else if (displayYears === 0) {
    return `${displayMonths} month${displayMonths !== 1 ? "s" : ""}`;
  } else if (displayMonths === 0) {
    return `${displayYears} year${displayYears !== 1 ? "s" : ""}`;
  } else {
    return `${displayYears} year${
      displayYears !== 1 ? "s" : ""
    } ${displayMonths} month${displayMonths !== 1 ? "s" : ""}`;
  }
};

export {
  createExperience,
  getAllExperiences,
  getExperienceById,
  updateExperience,
  deleteExperience,
  searchExperiences,
  getExperiencesByCompany,
};
