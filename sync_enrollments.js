// Utility script to sync existing enrollments to student profiles
// This should be run once to ensure all existing enrollments are properly linked

import { Enrollment } from "./src/models/contents/enrollments.models.js";
import { Student } from "./src/models/student models/students.models.js";
import mongoose from "mongoose";

async function syncEnrollmentsToStudents() {
    try {
        console.log("🔄 Starting enrollment sync...");
        
        // Get all enrollments
        const enrollments = await Enrollment.find({}).lean();
        console.log(`Found ${enrollments.length} enrollments to sync`);
        
        const updates = [];
        
        // Group enrollments by studentId
        const enrollmentsByStudent = {};
        enrollments.forEach(enrollment => {
            const studentId = enrollment.studentId.toString();
            if (!enrollmentsByStudent[studentId]) {
                enrollmentsByStudent[studentId] = [];
            }
            enrollmentsByStudent[studentId].push(enrollment._id);
        });
        
        // Update each student's enrollments array
        for (const [studentUserId, enrollmentIds] of Object.entries(enrollmentsByStudent)) {
            const updateResult = await Student.findOneAndUpdate(
                { userId: studentUserId },
                { $addToSet: { enrollments: { $each: enrollmentIds } } },
                { new: true }
            );
            
            if (updateResult) {
                console.log(`✅ Updated student ${studentUserId} with ${enrollmentIds.length} enrollments`);
            } else {
                console.log(`⚠️ Student not found for userId: ${studentUserId}`);
            }
        }
        
        console.log("✅ Enrollment sync completed successfully!");
        
    } catch (error) {
        console.error("❌ Error syncing enrollments:", error);
    }
}

// Uncomment the line below to run the sync
// syncEnrollmentsToStudents();

console.log("📋 Sync script ready. To run it, uncomment the last line and execute this file.");
console.log("💡 Command: node sync_enrollments.js");
