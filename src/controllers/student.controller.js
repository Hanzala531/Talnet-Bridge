import { Student } from "../models/student models/students.models.js";
import { User } from "../models/contents/User.models.js";
import { Enrollment } from "../models/contents/enrollments.models.js";
import { Course } from "../models/contents/course.models.js";
import {
    successResponse,
    createdResponse,
  updatedResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  conflictResponse,
} from "../utils/ApiResponse.js";
import {
    internalServer,
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
      return res.json(unauthorizedResponse(
        "You do not have permission to create a student profile"
    ));
    }

    // Check if student profile already exists
    const existingStudent = await Student.findOne({ userId: user._id });
    if (existingStudent) {
        return res.json(badRequestResponse("Student profile already exists"));
    }
    
    // Extract all fields from the request body
    const { 
        firstName, 
        lastName, 
        email, 
        phone, 
        bio, 
        location, 
        website        
    } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !phone) {
        return res.json(badRequestResponse("firstName, lastName, email, and phone are required"));
    }
    
    // Create the student profile with all required fields
    const studentProfile = await Student.create({
        userId: user._id,
        firstName,
        lastName,
        email,
        phone,
        bio,
        website,
        location
    });

    const response = {
        studentId: studentProfile._id,
        userId: user._id,
        firstName: studentProfile.firstName,
        lastName: studentProfile.lastName,
        email: studentProfile.email,
        phone: studentProfile.phone,
        location: studentProfile.location,
        website: studentProfile.website,
        bio: studentProfile.bio
    };

    return res
      .json(createdResponse({response}, "Student profile created successfully"));
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
      firstName,
      lastName,
      email,
      phone,
    } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;
    
    // Build filter for Student collection
    const studentFilter = {};

    // Student-level filters
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
    if (firstName) {
      studentFilter.firstName = { $regex: firstName, $options: "i" };
    }
    if (lastName) {
      studentFilter.lastName = { $regex: lastName, $options: "i" };
    }
    if (email) {
      studentFilter.email = { $regex: email, $options: "i" };
    }
    if (phone) {
      studentFilter.phone = { $regex: phone, $options: "i" };
    }

    // Build projection
    let projection = "firstName lastName email phone location bio skills createdAt updatedAt";
    if (select && select.trim()) {
      projection = select.split(",").join(" ");
    }

    // Fetch students with filters
    const [students, total] = await Promise.all([
      Student.find(studentFilter)
        .populate("userId", "role status profilePicture")
        .populate("certifications", "name")
        .populate("experience", "title")
        .select(projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Student.countDocuments(studentFilter),
    ]);

    // Filter out students whose user role is not "student" (additional safety check)
    const validStudents = students.filter(student => 
      student.userId && student.userId.role === "student"
    );

    return res.status(200).json(
      successResponse(
        {
          students: validStudents,
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
    console.error("Error in getAllStudents:", error);
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
      return res.json(badRequestResponse("Invalid student ID"));
    }

    const student = await Student.findById(id)
      .populate("userId", "role status profilePicture")
      .populate("certifications")
      .populate("experience")
      .populate("kycVerification")
      .lean();

    if (!student) {
      return res.json(notFoundResponse("Student not found"));
    }

    // Check access permissions
    if (
        req.user.role !== "admin" &&
        student.userId._id.toString() !== req.user._id.toString()
    ) {
      // Return limited info for non-admin, non-owner access
      const publicInfo = {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          bio: student.bio,
        location: student.location,
        skills: student.skills,
        certifications: student.certifications,
        isPublic: student.isPublic,
        // Only show contact info if contact is public
        ...(student.isContactPublic && {
          email: student.email,
          phone: student.phone,
          website: student.website
        })
      };
      return res
        .json(
          successResponse(
            { student: publicInfo },
            "Student public profile retrieved"
          )
        );
    }
    
    // return res
    //   .json(successResponse({ student }, "Student retrieved successfully"));
    } catch (error) {
    throw error;
  }
});

// Get my student profile (for authenticated student)
const getMyStudentProfile = asyncHandler(async (req, res) => {
  try {
    const reqUser = req.user;
    if (!reqUser || reqUser.role !== "student") {
      return res.json(
        unauthorizedResponse("You do not have permission to view student profile")
      );
    }

    // Load student profile with related data
    let studentProfile = await Student.findOne({ userId: reqUser._id })
      .populate({ path: "kycVerification", select: "_id status" })
      .populate({ path: "certifications", select: "_id name issuedBy issueDate description" })      
      .populate("experience")
      .populate({
        path: "enrollments",
        populate: {
          path: "courseId",
          select: "title instructor duration price language type status coverImage category"
        }
      })
      .lean();

    if (!studentProfile) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    // Get user details (profile picture + status if available)
    const userDetails = await User.findById(reqUser._id)
      .select("profilePicture status")
      .lean();

    // Get enrollments - if the student's enrollments array is empty, fetch directly from Enrollment collection
    let enrollments = studentProfile.enrollments || [];
    
    if (!enrollments || enrollments.length === 0) {
      // Fetch enrollments directly from Enrollment collection
      enrollments = await Enrollment.find({ studentId: reqUser._id })
        .populate({
          path: "courseId",
          select: "title instructor duration price language type status coverImage category"
        })
        .select("enrollmentDate status createdAt updatedAt")
        .sort({ enrollmentDate: -1 })
        .lean();
    }

    // Map certifications (return all available fields)
    const certifications = Array.isArray(studentProfile.certifications)
      ? studentProfile.certifications.map((c) => ({
          _id: c._id,
          name: c.name,
          issuedBy: c.issuedBy,
          issueDate: c.issueDate,
          description: c.description,
        }))
      : [];

    // Final profile object
    const completeProfile = {
      studentId: studentProfile._id,
      userId: studentProfile.userId,
      firstName: studentProfile.firstName,
      lastName: studentProfile.lastName,
      email: studentProfile.email,
      phone: studentProfile.phone,
      profilePicture: userDetails?.profilePicture || null,
      status: userDetails?.status || null,
      role: "student",
      bio: studentProfile.bio,
      location: studentProfile.location,
      website: studentProfile.website,
      certifications,
      kycVerification: studentProfile.kycVerification,
      experience: studentProfile.experience,
      enrollments,
      skills: studentProfile.skills,
      gsceResult: studentProfile.gsceResult,
      isPublic: studentProfile.isPublic,
      isOpenToWork: studentProfile.isOpenToWork,
      isContactPublic: studentProfile.isContactPublic,
      isProgressPublic: studentProfile.isProgressPublic,
      communicationPreferences: studentProfile.communicationPreferences,
      createdAt: studentProfile.createdAt,
      updatedAt: studentProfile.updatedAt,
    };

    return res.json(
      successResponse(completeProfile, "Student profile retrieved successfully")
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
      return res.json(unauthorizedResponse(
        "You do not have permission to update student profile"
      ));
    }

    // Get current student profile
    const currentStudent = await Student.findOne({ userId: user._id });
    if (!currentStudent) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    // Separate user fields from student fields
    const userFields = ["profilePicture"];
    const userUpdates = {};
    const studentUpdates = { ...req.body };

    // Extract user fields from the request
    userFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        userUpdates[field] = req.body[field];
        delete studentUpdates[field];
      }
    });

    // Handle fullName update - split and update firstName/lastName in student
    if (req.body.fullName) {
      const { firstName, lastName } = splitFullName(req.body.fullName);
      studentUpdates.firstName = firstName;
      studentUpdates.lastName = lastName;
      // Also update User's fullName
      userUpdates.fullName = req.body.fullName;
      delete studentUpdates.fullName;
    }

    // Don't allow updating certain sensitive fields directly
    delete studentUpdates.userId;

    // Update user fields if any (mainly profilePicture and fullName)
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

    // Merge updated user data with student profile
    const completeProfile = {
      studentId: updatedStudent._id,
      userId: updatedStudent.userId,
      firstName: updatedStudent.firstName,
      lastName: updatedStudent.lastName,
      email: updatedStudent.email,
      phone: updatedStudent.phone,
      profilePicture: updatedUser.profilePicture,
      status: updatedUser.status,
      role: updatedUser.role,
      bio: updatedStudent.bio,
      location: updatedStudent.location,
      website: updatedStudent.website,
      skills: updatedStudent.skills,
      gsceResult: updatedStudent.gsceResult,
      isPublic: updatedStudent.isPublic,
      isOpenToWork: updatedStudent.isOpenToWork,
      isContactPublic: updatedStudent.isContactPublic,
      isProgressPublic: updatedStudent.isProgressPublic,
      communicationPreferences: updatedStudent.communicationPreferences,
      createdAt: updatedStudent.createdAt,
      updatedAt: updatedStudent.updatedAt,
    };

    return res
      .json(successResponse(completeProfile, "Student profile updated successfully"));
} catch (error) {
    console.error("Error in updateStudentProfile:", error);
    throw internalServer(error.message);
}
});

// ===============================
// DELETE STUDENT PROFILE
// ===============================
const deleteStudentProfile = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.json(badRequestResponse("Invalid student ID"));
    }
    
    const student = await Student.findById(id);
    if (!student) {
        return res.json(notFoundResponse("Student not found"));
    }

    // Check permissions
    if (
      req.user.role !== "admin" &&
      student.userId.toString() !== req.user._id.toString()
    ) {
      return res.json(forbiddenResponse("Access denied"));
    }

    await Student.findByIdAndDelete(id);

    return res
      .json(successResponse(null, "Student profile deleted successfully"));
    } catch (error) {
        console.error("Error in deleteStudentProfile:", error);
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
      return res.json(badRequestResponse("Invalid ID"));
    }

    const student = await Student.findById(id);
    if (!student) {
      return res.json(notFoundResponse("Student not found"));
    }

    // Check permissions
    if (
      req.user.role !== "admin" &&
      student.userId.toString() !== req.user._id.toString()
    ) {
      return res.json(forbiddenResponse("Access denied"));
    }

    // Check if certification is already added
    if (student.certifications.includes(certificationId)) {
        return res.json(badRequestResponse("Certification already added to profile"));
    }
    
    student.certifications.push(certificationId);
    await student.save();
    
    return res
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
      return res.json (badRequestResponse("User is not a student"));
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
      return res.json(
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

    // 1. Basic info (20%) - updated field list based on new schema
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
    if (student.kycVerification && student.kycVerification.status === "verified") {
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

    // 5. Profile picture (20%) - check from User model
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

    return res.json(
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
    console.error("Error in profileConpletion:", error);
    throw internalServer(error.message || "Failed to calculate profile completion");
  }
});

// Controller to add skills
const addSkills = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json (unauthorizedResponse("You do not have permission to add skills"));
    }

    const { skills } = req.body;
    if (!Array.isArray(skills) || skills.length === 0) {
     return res.json (badRequestResponse("Skills must be a non-empty array"));
    }

    // Validate each skill
    for (const skill of skills) {
      if (!skill || typeof skill !== "string" || !skill.trim()) {
       return res.json (badRequestResponse("Each skill must be a non-empty string"));
      }
    }

    // Fetch student
    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      return res.json (notFoundResponse("Student profile not found. Please create a student profile first."));
    }

    // Existing skills (case-insensitive set)
    const existingSkills = new Set(
      (student.skills || []).map((s) => s.toLowerCase())
    );

    // Filter out duplicates
    const newSkills = [];
    for (const skill of skills) {
      if (existingSkills.has(skill.toLowerCase())) {
        return res.json (conflictResponse(`Skill '${skill}' already exists`));
      }
      newSkills.push(skill.trim());
    }

    // Merge skills
    student.skills = [...(student.skills || []), ...newSkills];
    await student.save();

    return res.json(
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
      return res.json (badRequestResponse("Skill must be a non-empty string"));
    }
    // find student (do NOT use .lean())
    const student = await Student.findOne({ userId: userId });
    if (!student) {
      return res.json (notFoundResponse("Student profile not found"));
    }
    const skillLength = student.skills.length;
    student.skills = student.skills.filter(
      (s) => s.toLowerCase() !== skill.toLowerCase()
    );
    if (student.skills.length === skillLength) {
      return res.json (notFoundResponse("Skill not found"));
    }
    await student.save();
    return res.json(
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
      return res.json (unauthorizedResponse("You do not have permission to add GSCE results"));
    }

    const { gsceResult } = req.body;
    if (!Array.isArray(gsceResult) || gsceResult.length === 0) {
      return res.json (badRequestResponse("gsceResult must be a non-empty array"));
    }

    // Allowed grades (you can customize this list)
    const validGrades = ["A*", "A", "B", "C", "D", "E", "F", "G", "U"];

    // Validate each result object - Note: marks should be String according to schema
    for (const result of gsceResult) {
      if (!result.subject || typeof result.subject !== "string" || !result.subject.trim()) {
        return res.json (badRequestResponse("Each result must have a valid subject"));
      }
      if (!result.marks || typeof result.marks !== "string") {
        return res.json (badRequestResponse("Marks must be provided as a string"));
      }
      
      if (!result.grade || !validGrades.includes(result.grade.toUpperCase())) {
        return res.json (badRequestResponse(
          `Invalid grade for ${result.subject}. Allowed grades are: ${validGrades.join(", ")}`)
        );
      }
    }

    // Fetch student
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    // Prevent duplicate subjects
    const existingSubjects = new Set(
      student.gsceResult?.map((r) => r.subject.toLowerCase()) || []
    );

    for (const result of gsceResult) {
      if (existingSubjects.has(result.subject.toLowerCase())) {
        return res.json (conflictResponse(`GSCE result for subject '${result.subject}' already exists`));
      }
    }

    // Append new results instead of overwriting
    student.gsceResult = [...(student.gsceResult || []), ...gsceResult];
    await student.save();

    return res.json(
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

// ===============================
// UPDATE PRIVACY SETTINGS
// ===============================
const updatePrivacySettings = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json(unauthorizedResponse("You do not have permission to update privacy settings"));
    }

    const { isPublic, isOpenToWork, isContactPublic, isProgressPublic } = req.body;

    // Find student profile
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    // Update privacy settings
    const privacyUpdates = {};
    if (typeof isPublic === 'boolean') privacyUpdates.isPublic = isPublic;
    if (typeof isOpenToWork === 'boolean') privacyUpdates.isOpenToWork = isOpenToWork;
    if (typeof isContactPublic === 'boolean') privacyUpdates.isContactPublic = isContactPublic;
    if (typeof isProgressPublic === 'boolean') privacyUpdates.isProgressPublic = isProgressPublic;

    const updatedStudent = await Student.findOneAndUpdate(
      { userId: user._id },
      { $set: privacyUpdates },
      { new: true, runValidators: true }
    );

    const privacySettings = {
      isPublic: updatedStudent.isPublic,
      isOpenToWork: updatedStudent.isOpenToWork,
      isContactPublic: updatedStudent.isContactPublic,
      isProgressPublic: updatedStudent.isProgressPublic
    };

    return res.json(successResponse(privacySettings, "Privacy settings updated successfully"));
  } catch (error) {
    console.error("Error in updatePrivacySettings:", error);
    return res.json(serverErrorResponse("Failed to update privacy settings"));
  }
});

// ===============================
// UPDATE COMMUNICATION PREFERENCES
// ===============================
const updateCommunicationPreferences = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json(unauthorizedResponse("You do not have permission to update communication preferences"));
    }

    const { isCourseRecomendations, isMarketingCommunications } = req.body;

    // Find student profile
    const student = await Student.findOne({ userId: user._id });
    if (!student) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    // Build communication preferences update
    const communicationUpdates = {};
    if (typeof isCourseRecomendations === 'boolean') {
      communicationUpdates['communicationPreferences.isCourseRecomendations'] = isCourseRecomendations;
    }
    if (typeof isMarketingCommunications === 'boolean') {
      communicationUpdates['communicationPreferences.isMarketingCommunications'] = isMarketingCommunications;
    }

    const updatedStudent = await Student.findOneAndUpdate(
      { userId: user._id },
      { $set: communicationUpdates },
      { new: true, runValidators: true }
    );

    return res.json(successResponse(
      updatedStudent.communicationPreferences, 
      "Communication preferences updated successfully"
    ));
  } catch (error) {
    console.error("Error in updateCommunicationPreferences:", error);
    return res.json(serverErrorResponse("Failed to update communication preferences"));
  }
});

// ===============================
// GET PRIVACY SETTINGS
// ===============================
const getPrivacySettings = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json(unauthorizedResponse("You do not have permission to view privacy settings"));
    }

    const student = await Student.findOne({ userId: user._id })
      .select('isPublic isOpenToWork isContactPublic isProgressPublic')
      .lean();

    if (!student) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    const privacySettings = {
      isPublic: student.isPublic,
      isOpenToWork: student.isOpenToWork,
      isContactPublic: student.isContactPublic,
      isProgressPublic: student.isProgressPublic
    };

    return res.json(successResponse(privacySettings, "Privacy settings retrieved successfully"));
  } catch (error) {
    console.error("Error in getPrivacySettings:", error);
    return res.json(serverErrorResponse("Failed to retrieve privacy settings"));
  }
});

// ===============================
// GET COMMUNICATION PREFERENCES
// ===============================
const getCommunicationPreferences = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json(unauthorizedResponse("You do not have permission to view communication preferences"));
    }

    const student = await Student.findOne({ userId: user._id })
      .select('communicationPreferences')
      .lean();

    if (!student) {
      return res.json(notFoundResponse("Student profile not found"));
    }

    return res.json(successResponse(
      student.communicationPreferences || {
        isCourseRecomendations: false,
        isMarketingCommunications: false
      }, 
      "Communication preferences retrieved successfully"
    ));
  } catch (error) {
    console.error("Error in getCommunicationPreferences:", error);
    return res.json(serverErrorResponse("Failed to retrieve communication preferences"));
  }
});

// ===============================
// STUDENT DASHBOARD API
// ===============================
const getStudentDashboard = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json(unauthorizedResponse(
        "You do not have permission to access dashboard"
      ));
    }

    // Get all enrollments for the student
    const enrollments = await Enrollment.find({ studentId: user._id });

    if (!enrollments || enrollments.length === 0) {
      return res.json(successResponse({
        totalCoursesEnrolled: 0,
        completedCourses: 0,
        currentlyEnrolled: 0,
        activeCourses: 0
      }, "Dashboard data retrieved successfully"));
    }

    // Count different enrollment statuses
    const totalCoursesEnrolled = enrollments.length;
    const completedCourses = enrollments.filter(enrollment => enrollment.status === "completed").length;
    const currentlyEnrolled = enrollments.filter(enrollment => 
      enrollment.status === "enrolled" || enrollment.status === "in-progress"
    ).length;

    // Get all course IDs that the user has ever enrolled in
    const allEnrolledCourseIds = enrollments.map(enrollment => enrollment.courseId);

    // Count active courses (all courses user has ever enrolled in that are still approved/active)
    const activeCourses = await Course.countDocuments({
      _id: { $in: allEnrolledCourseIds },
      status: "approved"
    });    const dashboardData = {
      totalCoursesEnrolled,
      completedCourses,
      currentlyEnrolled,
      activeCourses
    };

    return res.json(successResponse(dashboardData, "Dashboard data retrieved successfully"));

  } catch (error) {
    console.error("Error in getStudentDashboard:", error);
    return res.json(internalServer("Failed to retrieve dashboard data"));
  }
});

// ===============================
// GET CURRENTLY ENROLLED COURSES
// ===============================
const getCurrentlyEnrolledCourses = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== "student") {
      return res.json(unauthorizedResponse(
        "You do not have permission to access enrolled courses"
      ));
    }

    // Get currently enrolled enrollments with course details
    const enrolledCourses = await Enrollment.find({
      studentId: user._id,
      status: { $in: ["enrolled", "in-progress"] }
    })
    .populate({
      path: "courseId",
      select: "title instructor instructorPicture duration price language type objectives description skills category status coverImage currentEnrollments maxEnrollments createdAt updatedAt",
      match: { status: "approved" } // Only get approved courses
    })
    .select("enrollmentDate status createdAt updatedAt")
    .sort({ enrollmentDate: -1 });

    // Filter out enrollments where course was not found (due to populate match condition)
    const validEnrolledCourses = enrolledCourses.filter(enrollment => enrollment.courseId !== null);

    // Format the response
    const formattedCourses = validEnrolledCourses.map(enrollment => ({
      enrollmentId: enrollment._id,
      enrollmentDate: enrollment.enrollmentDate,
      enrollmentStatus: enrollment.status,
      course: enrollment.courseId
    }));

    return res.json(successResponse(formattedCourses, `${formattedCourses.length} currently enrolled courses retrieved successfully`));

  } catch (error) {
    console.error("Error in getCurrentlyEnrolledCourses:", error);
    return res.json(internalServer("Failed to retrieve currently enrolled courses"));
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
  removeSkill,
  updatePrivacySettings,
  updateCommunicationPreferences,
  getPrivacySettings,
  getCommunicationPreferences,
  getStudentDashboard,
  getCurrentlyEnrolledCourses
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