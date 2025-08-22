import { Student } from "../models/student models/students.models.js";
import { User } from "../models/contents/User.models.js";
import {
    successResponse,
    createdResponse,
  updatedResponse,
  badRequestResponse,
} from "../utils/ApiResponse.js";
import {
    badRequest,
    internalServer,
    notFound,
    forbidden,
    unauthorized,
    conflict
} from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ===============================
// CREATE STUDENT PROFILE
// ===============================
const createStudentProfile = asyncHandler(async (req, res) => {
    try {
        const user = req.user;
        if (!user || user.role !== "student") {
      throw unauthorized(
        "You do not have permission to create a student profile"
    );
    }

    // Check if student profile already exists
    const existingStudent = await Student.findOne({ userId: user._id });
    if (existingStudent) {
        throw badRequest("Student profile already exists");
    }
    const basicDetails = await User.findById(user._id).select(
        "fullName email phone profilePicture"
    );
    
    // Extract student-specific fields from the request body
    const { bio, location, website } = req.body;
    
    // Create the student profile
    const studentProfile = await Student.create({
        userId: user._id,
        bio,
        website,
        location,
    });
    
    const { firstName, lastName } = splitFullName(basicDetails.fullName);

    const response = {
        studentId: studentProfile._id,
        userId: user._id,
      firstName,
      lastName,
      email: basicDetails.email,
      phone: basicDetails.phone,
      profilePicture: basicDetails.profilePicture,
      location,
      website,
      bio,
    };

    return res
      .status(201)
      .json(successResponse(response, "Student profile created successfully"));
  } catch (error) {
      console.error("Error in createStudentProfile:", error);
    throw internalServer(error.message);
  }
});

// ===============================
// GET ALL STUDENTS (ADMIN)
// ===============================
const getAllStudents = asyncHandler(async (req, res) => {
  try {
      const {
      page = 1,
      limit = 10,
      location,
      skills,
      sort = "-createdAt",
      select,
      fullName,
      email,
      phone,
      status,
    } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Base filter → only students
    const userFilter = { role: "student" };

    // User-level filters
    if (fullName) userFilter.fullName = { $regex: fullName, $options: "i" };
    if (email) userFilter.email = { $regex: email, $options: "i" };
    if (phone) userFilter.phone = { $regex: phone, $options: "i" };
    if (status) userFilter.status = status;

    // Student-level filters (need to join with Student)
    const studentFilter = {};
    if (location) {
      studentFilter.location = { $regex: location, $options: "i" };
    }
    if (skills) {
      const skillsArray = skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (skillsArray.length) studentFilter.skills = { $in: skillsArray };
    }

    // Build projection
    let projection = "fullName email role status phone";
    if (select && select.trim()) {
      projection = select.split(",").join(" ");
    }

    // Fetch matching users with role=student
    const [users, total] = await Promise.all([
      User.find(userFilter)
        .select(projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(userFilter),
    ]);

    // If student-specific filters exist → enrich with Student collection
    let resultUsers = users;
    if (Object.keys(studentFilter).length > 0) {
      const userIds = users.map((u) => u._id);
      const students = await Student.find({
        userId: { $in: userIds },
        ...studentFilter,
      })
        .select("userId bio location skills createdAt updatedAt")
        .lean();
        
      const studentMap = new Map(students.map((s) => [s.userId.toString(), s]));
      resultUsers = users
      .map((u) => ({
          ...u,
          studentInfo: studentMap.get(u._id.toString()) || null,
        }))
        .filter((u) => u.studentInfo); // remove users that didn’t match student filters
    }

    return res.status(200).json(
      successResponse(
        {
          students: resultUsers,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum),
          },
        },
        "Students retrieved successfully"
      )
    );
  } catch (error) {
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
      .populate("userId", "fullName email phone role status")
      .populate("certifications")
      .populate("experience")
      .populate("kycVerification")
      .lean();

    if (!student) {
      throw notFound("Student not found");
    }

    // Check access permissions
    if (
        req.user.role !== "admin" &&
        student.userId._id.toString() !== req.user._id.toString()
    ) {
      // Return limited info for non-admin, non-owner access
      const publicInfo = {
          _id: student._id,
          bio: student.bio,
        location: student.location,
        skills: student.skills,
        certifications: student.certifications,
        user: {
            fullName: student.userId.fullName,
        },
      };
      return res
        .status(200)
        .json(
          successResponse(
            { student: publicInfo },
            "Student public profile retrieved"
          )
        );
    }
    
    return res
    .status(200)
      .json(successResponse({ student }, "Student retrieved successfully"));
    } catch (error) {
    throw error;
  }
});

// Get my student profile (for authenticated student)
const getMyStudentProfile = asyncHandler(async (req, res) => {
  try {
    const reqUser = req.user;
    if (!reqUser || reqUser.role !== "student") {
      throw unauthorized("You do not have permission to view student profile");
    }
    
    // Fetch freshest user record (exclude sensitive fields)
    const user = await User.findById(reqUser._id)
      .select("-password -refreshToken")
      .lean();
    if (!user) {
      throw notFound("Linked user not found");
    }
    
    // Load student profile (lean) and populate certifications (only _id and name)
    const studentProfile = await Student.findOne({ userId: user._id })
      .populate("kycVerification")
      .populate({ path: "certifications", select: "_id name" })
      .populate({path:"experience" , select: "_id title"})
      .populate("enrollments")
      .lean();
    
    // If student profile does not exist, return basic user details so frontend can show user info
    if (!studentProfile) {
      const basic = {
        studentId: null,
        user: {
          _id: user._id,
          userName: user.userName,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          profilePicture: user.profilePicture,
          status: user.status,
          role: user.role,
        },
    };

      return res
      .status(200)
        .json(
          successResponse(
            basic,
            "Student profile not found. Returning basic user details"
        )
    );
}

    // Only return _id and name for certifications
    const certifications = Array.isArray(studentProfile?.certifications)
      ? studentProfile.certifications.map(c => ({ _id: c._id, name: c.name }))
      : [];

    const completeProfile = {
      ...studentProfile,
      certifications, // overwrite with just _id and name
      user: {
        _id: user._id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        profilePicture: user.profilePicture,
        status: user.status,
        role: user.role,
      },
    };

    return res
      .status(200)
      .json(
        successResponse(
          completeProfile,
          "Student profile retrieved successfully"
        )
      );
  } catch (error) {
      console.error("Error in getMyStudentProfile:", error);
      throw internalServer(error.message || "Failed to retrieve student profile");
    }
});

// ===============================
// UPDATE STUDENT PROFILE
// ===============================
const updateStudentProfile = asyncHandler(async (req, res) => {
  try {
      const user = req.user;
    if (!user || user.role !== "student") {
      throw unauthorized(
        "You do not have permission to update student profile"
      );
    }

    // Separate user fields from student fields
    const userFields = ["firstName", "lastName", "phone", "userName"];
    const userUpdates = {};
    const studentUpdates = { ...req.body };

    // Extract user fields from the request
    userFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        userUpdates[field] = req.body[field];
        delete studentUpdates[field];
      }
    });

    // Don't allow updating certain user fields
    delete studentUpdates.email;
    delete studentUpdates.password;
    delete studentUpdates.role;
    delete studentUpdates.status;

    // Update user fields if any
    let updatedUser = user;
    if (Object.keys(userUpdates).length > 0) {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $set: userUpdates },
        { new: true, runValidators: true }
      );
    }

    // Update student profile
    const updatedStudent = await Student.findOneAndUpdate(
      { userId: user._id },
      { $set: studentUpdates },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      throw notFound("Student profile not found");
    }

    const { firstName, lastName } = splitFullName(updatedUser.fullName);


    // Merge updated user data with student profile
    const completeProfile = {
      firstName,
      lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profilePicture: updatedUser.profilePicture,
      status: updatedUser.status,
      ...updatedStudent.toObject(),
    };

    return res
      .status(200)
      .json(successResponse(completeProfile, "Student profile updated successfully"));
} catch (error) {
    console.error("Error in updateStudentProfile:", error);
    throw internalServer(error.message);
}
});

// ===============================
// DELETE STUDENT PROFILE
// ======================
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
    if (
      req.user.role !== "admin" &&
      student.userId.toString() !== req.user._id.toString()
    ) {
      throw forbidden("Access denied");
    }

    await Student.findByIdAndDelete(id);

    return res
    .status(200)
      .json(successResponse(null, "Student profile deleted successfully"));
    } catch (error) {
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
    
    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(certificationId)
    ) {
      throw badRequest("Invalid ID");
    }

    const student = await Student.findById(id);
    if (!student) {
      throw notFound("Student not found");
    }

    // Check permissions
    if (
      req.user.role !== "admin" &&
      student.userId.toString() !== req.user._id.toString()
    ) {
      throw forbidden("Access denied");
    }

    // Check if certification is already added
    if (student.certifications.includes(certificationId)) {
        throw badRequest("Certification already added to profile");
    }
    
    student.certifications.push(certificationId);
    await student.save();
    
    return res
    .status(200)
    .json(
        updatedResponse(
            { certificationsCount: student.certifications.length },
          "Certification added successfully"
        )
    );
  } catch (error) {
    throw error;
}
});

// ===============================
// Show student profile completion in percentage
// ===============================
const profileConpletion = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    if (!user || user.role !== "student") {
      throw badRequest("User is not a student");
    }

    // Always start with 5% for being registered as a student
    let percent = 5;
    const steps = ["Registered as student"];
    const missingSteps = [];

    let student = await Student.findOne({ userId })
      .populate("kycVerification")
      .populate("certifications")
      .populate("experience")
      .lean();

    // If student profile does not exist, return 5% completion
    if (!student) {
      return res.status(200).json(
        successResponse(
          {
            percent,
            steps,
            missingSteps: [
              "Create your student profile",
              "Complete basic info",
              "Submit KYC verification",
              "Add certifications",
              "Add experience",
              "Upload profile picture",
            ],
            studentId: null,
            userId: user._id,
          },
          "You have 5% completion for registering as a student. Please create your student profile to continue."
        )
      );
    }

    // 1. Basic info (20%)
    const basicFields = ["bio", "location", "skills", "website", "gsceResult"];
    let filledCount = 0;

    basicFields.forEach((field) => {
      const value = student[field];
      if (Array.isArray(value) ? value.length > 0 : !!value) {
        filledCount++;
      }
    });

    if (filledCount > 0) {
      const fieldPercent = (20 / basicFields.length) * filledCount;
      percent += fieldPercent;
      steps.push(`Basic info: ${filledCount}/${basicFields.length} fields completed`);
      if (filledCount < basicFields.length) {
        missingSteps.push("Complete all basic info fields");
      }
    } else {
      missingSteps.push("Complete basic info");
    }

    // 2. KYC verification (20%)
    if (Array.isArray(student.kycVerification) && student.kycVerification.length > 0) {
      percent += 20;
      steps.push("KYC verification completed");
    } else {
      missingSteps.push("Submit KYC verification");
    }

    // 3. Certifications (20%)
    if (Array.isArray(student.certifications) && student.certifications.length > 0) {
      percent += 20;
      steps.push("Certifications added");
    } else {
      missingSteps.push("Add certifications");
    }

    // 4. Experience (20%)
    if (Array.isArray(student.experience) && student.experience.length > 0) {
      percent += 20;
      steps.push("Experience added");
    } else {
      missingSteps.push("Add experience");
    }

    // 5. Profile picture (20%)
    const defaultPic =
      "https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg";

    if (user.profilePicture && user.profilePicture !== defaultPic) {
      percent += 20;
      steps.push("Profile picture uploaded");
    } else {
      missingSteps.push("Upload profile picture");
    }

    // Cap at 100
    percent = Math.min(percent, 100);

    return res.status(200).json(
      successResponse(
        {
          percent: Math.round(percent), // rounded for clean UI
          steps,
          missingSteps,
          studentId: student._id,
          userId: user._id,
        },
        "Profile completion calculated"
      )
    );
  } catch (error) {
    console.error(error);
    throw internalServer(error.message || "Failed to calculate profile completion");
  }
});




// Controller to add skills
const addSkills = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      throw unauthorized("You do not have permission to add skills");
    }

    const { skills } = req.body;
    if (!Array.isArray(skills) || skills.length === 0) {
      throw badRequest("Skills must be a non-empty array");
    }

    // Validate each skill
    for (const skill of skills) {
      if (!skill || typeof skill !== "string" || !skill.trim()) {
        throw badRequest("Each skill must be a non-empty string");
      }
    }

    // Fetch student
    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      // If student profile does not exist, create it with the provided skills
      student = await Student.create({ userId: user._id, skills: skills.map(s => s.trim()) });
      return res.status(201).json(
        successResponse(
          { skills: student.skills },
          "Student profile created and skills added successfully"
        )
      );
    }

    // Existing skills (case-insensitive set)
    const existingSkills = new Set(
      (student.skills || []).map((s) => s.toLowerCase())
    );

    // Filter out duplicates
    const newSkills = [];
    for (const skill of skills) {
      if (existingSkills.has(skill.toLowerCase())) {
        throw conflict(`Skill '${skill}' already exists`);
      }
      newSkills.push(skill.trim());
    }

    // Merge skills
    student.skills = [...(student.skills || []), ...newSkills];
    await student.save();

    return res.status(200).json(
      successResponse(
        { skills: student.skills },
        "Skills updated successfully"
      )
    );
  } catch (error) {
    console.error("Error in addSkills:", error);
    throw internalServer(error.message);
  }
});

// Controller to remove a skill
const removeSkill = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const skill = req.params.skill;
    if (!skill || typeof skill !== "string" || !skill.trim()) {
      throw badRequest("Skill must be a non-empty string");
    }
    // find student (do NOT use .lean())
    const student = await Student.findOne({ userId: userId });
    if (!student) {
      throw notFound("Student not found in the db");
    }
    const skillLength = student.skills.length;
    student.skills = student.skills.filter(
      (s) => s.toLowerCase() !== skill.toLowerCase()
    );
    if (student.skills.length === skillLength) {
      throw notFound("Skill not found");
    }
    await student.save();
    return res.status(200).json(
      successResponse(
        { skills: student.skills },
        `Skill '${skill}' removed successfully`
      )
    );
  } catch (error) {
    console.error("Error in removeSkill:", error);
    throw internalServer(error.message);
  }
});


// Add or update GSCE results for the authenticated student
const addResult = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      throw unauthorized("You do not have permission to add GSCE results");
    }

    const { gsceResult } = req.body;
    if (!Array.isArray(gsceResult) || gsceResult.length === 0) {
      throw badRequest("gsceResult must be a non-empty array");
    }

    // Allowed grades (you can customize this list)
    const validGrades = ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];

    // Validate each result object
    for (const result of gsceResult) {
      if (!result.subject || typeof result.subject !== "string" || !result.subject.trim()) {
        throw badRequest("Each result must have a valid subject");
      }
      if (
        result.marks === undefined ||
        isNaN(result.marks) ||
        result.marks < 0 ||
        result.marks > 100
      ) {
        throw badRequest("Marks must be a number between 0 and 100");
      }
      if (!result.grade || !validGrades.includes(result.grade.toUpperCase())) {
        throw badRequest(
          `Invalid grade for ${result.subject}. Allowed grades are: ${validGrades.join(", ")}`
        );
      }
    }

    // Fetch student
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      throw notFound("Student profile not found");
    }

    // Prevent duplicate subjects
    const existingSubjects = new Set(
      student.gsceResult?.map((r) => r.subject.toLowerCase()) || []
    );

    for (const result of gsceResult) {
      if (existingSubjects.has(result.subject.toLowerCase())) {
        throw conflict(`GSCE result for subject '${result.subject}' already exists`);
      }
    }

    // Append new results instead of overwriting
    student.gsceResult = [...(student.gsceResult || []), ...gsceResult];
    await student.save();

    return res.status(200).json(
      successResponse(
        { gsceResult: student.gsceResult },
        "GSCE results updated successfully"
      )
    );
  } catch (error) {
    console.error("Error in addResult:", error);
    throw internalServer(error.message);
  }
});


export {
  createStudentProfile,
  getAllStudents,
  getStudentById,
  getMyStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  addCertification,
  profileConpletion,
  addSkills,
  addResult,
  removeSkill
};

function splitFullName(fullName = "") {
    const parts = fullName.trim().split(" ");
  const firstName = parts[0] || "";
  const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "";
  return { firstName, lastName };
}

// Utility to combine first and last name into fullName
function combineFullName(firstName = "", lastName = "") {
  return [firstName, lastName].filter(Boolean).join(" ").trim();
}