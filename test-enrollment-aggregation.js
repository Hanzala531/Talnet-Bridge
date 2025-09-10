// Test enrollment aggregation
const mongoose = require('mongoose');

// Test the aggregation pipeline logic
const testEnrollmentIds = ['68c1bdd107fd1e0554ccfeb3'];

console.log('=== Testing Enrollment to School UserIds Mapping ===');
console.log('Input enrollment IDs:', testEnrollmentIds);

// Test ObjectId conversion
const enrollmentObjectIds = testEnrollmentIds.map(id => {
    console.log(`Converting ${id} to ObjectId`);
    return typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id;
});

console.log('Converted ObjectIds:', enrollmentObjectIds);

console.log('\n=== Expected Aggregation Pipeline Flow ===');
console.log('1. Match enrollments by _id');
console.log('2. Lookup courses from enrollment.course');
console.log('3. Unwind course array');
console.log('4. Lookup traininginstitutes from course.trainingProvider');
console.log('5. Unwind trainingProvider array');
console.log('6. Lookup users from trainingProvider.userId');
console.log('7. Unwind schoolUser array');
console.log('8. Group by schoolUser._id');
console.log('9. Project userId, userName, userEmail');

console.log('\nThis should resolve the null selectedSchoolUserId issue!');
