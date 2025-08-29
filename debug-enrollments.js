// Debug script for enrollment issues
// Add this to your enrollments controller temporarily to debug

// Enhanced debugging version of getEnrollmentById
const debugGetEnrollmentById = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;
        const userRole = req.user.role;

        console.log("=== DEBUG: GET ENROLLMENT BY ID ===");
        console.log("Enrollment ID from params:", id);
        console.log("User ID:", userId);
        console.log("User Role:", userRole);
        console.log("ID type:", typeof id);
        console.log("ID length:", id.length);

        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(id)) {
            console.log("❌ Invalid ObjectId format:", id);
            return res.json(badRequestResponse("Invalid enrollment ID format"));
        }

        console.log("✅ ObjectId format is valid");

        // Check if any enrollments exist in the database
        const totalEnrollments = await Enrollment.countDocuments();
        console.log("Total enrollments in database:", totalEnrollments);

        // Find enrollment without populate first
        const basicEnrollment = await Enrollment.findById(id);
        console.log("Basic enrollment found:", !!basicEnrollment);
        if (basicEnrollment) {
            console.log("Basic enrollment data:", JSON.stringify(basicEnrollment, null, 2));
        }

        // Try to find with populate
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

        console.log("Populated enrollment found:", !!enrollment);
        if (enrollment) {
            console.log("Populated enrollment data:", JSON.stringify(enrollment, null, 2));
        }

        if (!enrollment) {
            // List all enrollments to help debug
            const allEnrollments = await Enrollment.find({}).limit(5).select('_id studentId courseId status');
            console.log("Sample enrollments in database:", JSON.stringify(allEnrollments, null, 2));
            return res.json(notFoundResponse("Enrollment not found"));
        }

        // Authorization check (simplified for debugging)
        const isStudent = userRole === 'student' && enrollment.studentId._id.toString() === userId.toString();
        const isAdmin = userRole === 'admin';
        const isSchoolOwner = userRole === 'school' && enrollment.courseId?.trainingProvider?.userId?.toString() === userId.toString();

        console.log("Authorization check:");
        console.log("- Is student:", isStudent);
        console.log("- Is admin:", isAdmin);
        console.log("- Is school owner:", isSchoolOwner);

        if (!isStudent && !isAdmin && !isSchoolOwner) {
            return res.json(badRequestResponse("Access denied"));
        }

        return res.json(successResponse({ enrollment }, "Enrollment found successfully"));

    } catch (error) {
        console.error("❌ Error in debugGetEnrollmentById:", error);
        throw internalServer("Failed to get enrollment");
    }
});

// Enhanced debugging version of updateEnrollmentStatus
const debugUpdateEnrollmentStatus = asyncHandler(async (req, res) => {
    try {
        const { enrollmentId } = req.params;
        const { status } = req.body;
        const userId = req.user._id;
        const userRole = req.user.role;

        console.log("=== DEBUG: UPDATE ENROLLMENT STATUS ===");
        console.log("Enrollment ID from params:", enrollmentId);
        console.log("Status from body:", status);
        console.log("User ID:", userId);
        console.log("User Role:", userRole);

        // Validate ObjectId format
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(enrollmentId)) {
            console.log("❌ Invalid ObjectId format:", enrollmentId);
            return res.json(badRequestResponse("Invalid enrollment ID format"));
        }

        console.log("✅ ObjectId format is valid");

        // Only school and admin can update enrollment status
        if (userRole !== "school" && userRole !== "admin") {
            return res.json(badRequestResponse("Access denied: Only schools and admins can update enrollment status"));
        }

        const validStatuses = ["enrolled", "in-progress", "completed", "withdrawn", "suspended"];
        if (!status || !validStatuses.includes(status)) {
            return res.json(badRequestResponse("Invalid or missing status value"));
        }

        // Check if any enrollments exist
        const totalEnrollments = await Enrollment.countDocuments();
        console.log("Total enrollments in database:", totalEnrollments);

        // Find enrollment without populate first
        const basicEnrollment = await Enrollment.findById(enrollmentId);
        console.log("Basic enrollment found:", !!basicEnrollment);
        if (basicEnrollment) {
            console.log("Basic enrollment data:", JSON.stringify(basicEnrollment, null, 2));
        }

        // Find the specific enrollment with populate
        const enrollment = await Enrollment.findById(enrollmentId)
            .populate("courseId", "title instructor trainingProvider")
            .populate("studentId", "fullName email");

        console.log("Populated enrollment found:", !!enrollment);

        if (!enrollment) {
            // List sample enrollments
            const sampleEnrollments = await Enrollment.find({}).limit(5).select('_id studentId courseId status');
            console.log("Sample enrollments:", JSON.stringify(sampleEnrollments, null, 2));
            return res.json(notFoundResponse("Enrollment not found"));
        }

        // Authorization check for schools
        if (userRole === "school") {
            const school = await TrainingInstitute.findOne({ userId: userId });
            console.log("School found:", !!school);
            if (school) {
                console.log("School ID:", school._id);
                console.log("Course training provider:", enrollment.courseId.trainingProvider);
            }

            if (!school) {
                return res.json(badRequestResponse("School profile not found"));
            }

            if (enrollment.courseId.trainingProvider.toString() !== school._id.toString()) {
                return res.json(badRequestResponse("Access denied: You can only update enrollments for your own courses"));
            }
        }

        // Update the enrollment
        const oldStatus = enrollment.status;
        enrollment.status = status;
        enrollment.updatedAt = new Date();
        await enrollment.save();

        console.log(`✅ Enrollment status updated from ${oldStatus} to ${status}`);

        return res.json(successResponse(
            { 
                enrollment,
                statusChange: { from: oldStatus, to: status }
            },
            `Enrollment status updated from ${oldStatus} to ${status}`
        ));

    } catch (error) {
        console.error("❌ Error in debugUpdateEnrollmentStatus:", error);
        throw internalServer("Failed to update enrollment status");
    }
});

export { debugGetEnrollmentById, debugUpdateEnrollmentStatus };
