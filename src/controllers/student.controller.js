import { Student } from "../models/student models/students.models.js";
import { User } from "../models/contents/User.models.js";
import { successResponse, createdResponse, updatedResponse, badRequestResponse } from "../utils/ApiResponse.js";
import { badRequest, internalServer, notFound, forbidden, unauthorized } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

// ===============================
// CREATE STUDENT PROFILE
// ===============================
// Create a student profile (after signup)
const createStudentProfile = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'student') {
      throw unauthorized('You do not have permission to create a student profile');
    }

    // Check if student profile already exists
    const existingStudent = await Student.findOne({ userId: user._id });
    if (existingStudent) {
      throw badRequest('Student profile already exists');
    }

    // Extract student-specific fields from the request body
    const {
      bio,
      dateOfBirth,
      gender,
      gsceResult,
      alevelResult,
      degree,
      classLevel,
      school,
      workExperience,
      employmentHistory,
      skills,
      certifications,
      qualifications,
      portfolio,
      objective,
      workPreference,
      desiredField,
      website,
      cv,
      personalStatement,
      location,
      country,
      reasonForStudying,
      subjectInstitution,
      phoneNumber,
      emergencyContactName,
      emergencyContactPhone,
      nationality,
      whatsappNumber,
      linkedinProfile
    } = req.body;

    // Create the student profile
    const studentProfile = await Student.create({
      userId: user._id,
      publicProfile: {
        displayName: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        profilePicture: user.profilePicture,
        status: user.status
      },
      bio,
      dateOfBirth,
      gender,
      gsceResult,
      alevelResult,
      degree,
      classLevel,
      school,
      workExperience,
      employmentHistory,
      skills,
      certifications,
      qualifications,
      portfolio,
      objective,
      workPreference,
      desiredField,
      website,
      cv,
      personalStatement,
      location,
      country,
      reasonForStudying,
      subjectInstitution,
      phoneNumber,
      emergencyContactName,
      emergencyContactPhone,
      nationality,
      whatsappNumber,
      linkedinProfile
    });

    return res.status(201).json(
      successResponse(
        studentProfile,
        'Student profile created successfully'
      )
    );
  } catch (error) {
    console.error('Error in createStudentProfile:', error);
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
      sort = '-createdAt',
      select,
      fullName,
      email,
      phone,
      status
    } = req.query;

    // Parse pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Base filter → only students
    const userFilter = { role: "student" };

    // User-level filters
    if (fullName) userFilter.fullName = { $regex: fullName, $options: 'i' };
    if (email) userFilter.email = { $regex: email, $options: 'i' };
    if (phone) userFilter.phone = { $regex: phone, $options: 'i' };
    if (status) userFilter.status = status;

    // Student-level filters (need to join with Student)
    const studentFilter = {};
    if (location) {
      studentFilter.location = { $regex: location, $options: 'i' };
    }
    if (skills) {
      const skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      if (skillsArray.length) studentFilter.skills = { $in: skillsArray };
    }

    // Build projection
    let projection = 'fullName email role status phone';
    if (select && select.trim()) {
      projection = select.split(',').join(' ');
    }

    // Fetch matching users with role=student
    const [users, total] = await Promise.all([
      User.find(userFilter)
        .select(projection)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(userFilter)
    ]);

    // If student-specific filters exist → enrich with Student collection
    let resultUsers = users;
    if (Object.keys(studentFilter).length > 0) {
      const userIds = users.map(u => u._id);
      const students = await Student.find({
        userId: { $in: userIds },
        ...studentFilter
      })
        .select('userId bio location skills createdAt updatedAt')
        .lean();

      const studentMap = new Map(students.map(s => [s.userId.toString(), s]));
      resultUsers = users
        .map(u => ({
          ...u,
          studentInfo: studentMap.get(u._id.toString()) || null
        }))
        .filter(u => u.studentInfo); // remove users that didn’t match student filters
    }

    return res.status(200).json(
      successResponse(
        {
          students: resultUsers,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
          }
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
    } catch (error) {throw error;
    }
});

// Get my student profile (for authenticated student)
const getMyStudentProfile = asyncHandler(async (req, res) => {
  try {
    const reqUser = req.user;
    if (!reqUser || reqUser.role !== 'student') {
      throw unauthorized('You do not have permission to view student profile');
    }

    // Fetch freshest user record (exclude sensitive fields)
    const user = await User.findById(reqUser._id).select('-password -refreshToken').lean();
    if (!user) {
      throw notFound('Linked user not found');
    }

    // Load student profile (lean) and populated relations
    const studentProfile = await Student.findOne({ userId: user._id })
      .populate('kycVerification')
      .populate('certifications')
      .populate('experience')
      .populate('qualifications')
      .populate('enrollments')
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
          isEmailVerified: user.isEmailVerified,
          profilePicture: user.profilePicture,
          status: user.status,
          role: user.role
        }
      };

      return res.status(200).json(
        successResponse(basic, 'Student profile not found. Returning basic user details')
      );
    }

    // Merge user fields under `user` to avoid clobbering student fields
    const completeProfile = {
      ...studentProfile,
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
        role: user.role
      }
    };

    return res.status(200).json(
      successResponse(
        completeProfile,
        'Student profile retrieved successfully'
      )
    );
  } catch (error) {
    console.error('Error in getMyStudentProfile:', error);
    throw internalServer(error.message || 'Failed to retrieve student profile');
  }
});

// ===============================
// UPDATE STUDENT PROFILE
// ===============================
const updateStudentProfile = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    if (!user || user.role !== 'student') {
      throw unauthorized('You do not have permission to update student profile');
    }

    // Separate user fields from student fields
    const userFields = ['firstName', 'lastName', 'phone', 'userName'];
    const userUpdates = {};
    const studentUpdates = { ...req.body };

    // Extract user fields from the request
    userFields.forEach(field => {
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
    ).populate('kycVerification')
     .populate('certifications')
     .populate('experience')
     .populate('qualifications')
     .populate('enrollments');

    if (!updatedStudent) {
      throw notFound('Student profile not found');
    }

    // Merge updated user data with student profile
    const completeProfile = {
      ...updatedStudent.toObject(),
      userName: updatedUser.userName,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      phone: updatedUser.phone,
      isEmailVerified: updatedUser.isEmailVerified,
      profilePicture: updatedUser.profilePicture,
      status: updatedUser.status,
    };

    // Keep denormalized publicProfile in-sync when user fields changed
    if (Object.keys(userUpdates).length > 0) {
      await Student.findOneAndUpdate({ userId: user._id }, {
        $set: {
          'publicProfile.firstName': updatedUser.firstName,
          'publicProfile.lastName': updatedUser.lastName,
          'publicProfile.displayName': updatedUser.fullName || `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
          'publicProfile.email': updatedUser.email,
          'publicProfile.phone': updatedUser.phone,
          'publicProfile.profilePicture': updatedUser.profilePicture,
          'publicProfile.status': updatedUser.status
        }
      });
    }

    return res.status(200).json(
      successResponse(
        completeProfile,
        'Student profile updated successfully'
      )
    );
  } catch (error) {
    console.error('Error in updateStudentProfile:', error);
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
        if (req.user.role !== 'admin' && student.userId.toString() !== req.user._id.toString()) {
            throw forbidden("Access denied");
        }

        await Student.findByIdAndDelete(id);

        return res.status(200).json(successResponse(null, "Student profile deleted successfully"));
    } catch (error) {throw internalServer("Failed to delete student profile");
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
    } catch (error) {throw error;
    }
});




// ===============================
// Show student profile completion in percentage 
// ===============================
const profileConpletion = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();
    if (!user || user.role !== 'student') {
      throw badRequest('User is not a student');
    }

    // Always start with 5% for being registered as a student
    let percent = 5;
    const steps = ['Registered as student'];

    let student = await Student.findOne({ userId })
      .populate('kycVerification')
      .populate('certifications')
      .populate('experience')
      .lean();

    // If student profile does not exist, return 5% completion
    if (!student) {
      return res.status(200).json(
        successResponse(
          {
            percent,
            steps,
            studentId: null,
            userId: user._id
          },
          'You have 5% completion for registering as a student. Please create your student profile to continue.'
        )
      );
    }

    // 1. Basic info (20%)
    const basicFields = ['bio', 'location', 'skills', 'website', 'gsceResult'];
    const hasBasic = basicFields.some(field => {
      const value = student[field];
      return Array.isArray(value) ? value.length > 0 : !!value;
    });

    if (hasBasic) {
      percent += 15; // Total: 20%
      steps.push('Basic info completed');
    }

    // 2. KYC verification (20%)
    if (Array.isArray(student.kycVerification) && student.kycVerification.length > 0) {
      percent += 20; // Total: 40%
      steps.push('KYC verification completed');
    }

    // 3. Certifications (20%)
    if (Array.isArray(student.certifications) && student.certifications.length > 0) {
      percent += 20; // Total: 60%
      steps.push('Certifications added');
    }

    // 4. Experience (20%)
    if (Array.isArray(student.experience) && student.experience.length > 0) {
      percent += 20; // Total: 80%
      steps.push('Experience added');
    }

    // 5. Profile picture (20%)
    const defaultPic =
      'https://static.vecteezy.com/system/resources/thumbnails/009/292/244/small/default-avatar-icon-of-social-media-user-vector.jpg';

    if (user.profilePicture && user.profilePicture !== defaultPic) {
      percent += 20; // Total: 100%
      steps.push('Profile picture uploaded');
    }

    // Cap at 100
    percent = Math.min(percent, 100);

    return res.status(200).json(
      successResponse(
        {
          percent,
          steps,
          studentId: student._id,
          userId: user._id
        },
        'Profile completion calculated'
      )
    );
  } catch (error) {
    console.error(error);
    throw internalServer(error.message || 'Failed to calculate profile completion');
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
    profileConpletion
};
