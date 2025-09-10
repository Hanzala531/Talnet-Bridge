// Debug script to inspect enrollment document structure
import mongoose from 'mongoose';
import { Enrollment, Course, TrainingInstitute, User } from './src/models/index.js';

// Connect to MongoDB (using the same connection as the app)
const debugEnrollment = async () => {
    try {
        console.log('=== Debugging Enrollment Structure ===');
        
        const enrollmentId = '68c1bdd107fd1e0554ccfeb3';
        console.log('Looking for enrollment ID:', enrollmentId);
        
        // First, let's see if the enrollment exists
        const enrollment = await Enrollment.findById(enrollmentId);
        console.log('\n1. Raw Enrollment Document:');
        console.log(JSON.stringify(enrollment, null, 2));
        
        if (!enrollment) {
            console.log('❌ Enrollment not found!');
            return;
        }
        
        // Check what fields are available in enrollment
        console.log('\n2. Available fields in enrollment:');
        console.log(Object.keys(enrollment.toObject()));
        
        // Try to populate course
        const enrollmentWithCourse = await Enrollment.findById(enrollmentId).populate('course');
        console.log('\n3. Enrollment with populated course:');
        console.log(JSON.stringify(enrollmentWithCourse, null, 2));
        
        // If course exists, check training provider
        if (enrollmentWithCourse?.course) {
            const courseDoc = await Course.findById(enrollmentWithCourse.course._id).populate('trainingProvider');
            console.log('\n4. Course with populated training provider:');
            console.log(JSON.stringify(courseDoc, null, 2));
            
            // If training provider exists, check user
            if (courseDoc?.trainingProvider) {
                const trainingProvider = await TrainingInstitute.findById(courseDoc.trainingProvider._id).populate('userId');
                console.log('\n5. Training provider with populated user:');
                console.log(JSON.stringify(trainingProvider, null, 2));
            }
        }
        
        console.log('\n=== Debug Complete ===');
        
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Note: This would need to be run in the actual app context
console.log('This debug script shows the approach to investigate the data structure.');
console.log('The issue is likely field name mismatches in the aggregation pipeline.');
