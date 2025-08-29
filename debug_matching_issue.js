/**
 * Debug Test for Job Matching Issue
 * 
 * This script tests the data structure compatibility between student skills
 * and job skill requirements to identify the matching issue.
 * 
 * Note: Matching utilities are now integrated into the job controller.
 * This debug file demonstrates the data structures but cannot directly
 * test the functions since they are now part of the controller module.
 */

console.log('🔍 Debugging Job Matching Issue\n');
console.log('⚠️  Note: Matching utilities have been moved into the job controller.');
console.log('   This debug script now shows data structure examples only.\n');

// Test data structures
console.log('1. Testing Data Structure Compatibility:');

// Student skills (as stored in database)
const studentSkills = ['JavaScript', 'React', 'Node.js', 'MongoDB'];
console.log('   Student skills:', studentSkills);
console.log('   Type:', typeof studentSkills, ', Array:', Array.isArray(studentSkills));

// Job skills required (as stored in database)
const jobSkillsRequired = [
    { skill: 'JavaScript', proficiency: 'Advanced' },
    { skill: 'React', proficiency: 'Intermediate' },
    { skill: 'Node.js', proficiency: 'Intermediate' }
];
console.log('   Job skills required:', jobSkillsRequired);
console.log('   Type:', typeof jobSkillsRequired, ', Array:', Array.isArray(jobSkillsRequired));

// Test the matching function
console.log('\n2. Testing calculateMatchPercentage:');
try {
    const matchPercentage = calculateMatchPercentage(studentSkills, jobSkillsRequired);
    console.log('   ✅ Match percentage:', matchPercentage + '%');
} catch (error) {
    console.log('   ❌ Error in calculateMatchPercentage:', error.message);
}

// Test with fuzzy options
console.log('\n3. Testing with Fuzzy Options:');
try {
    const fuzzyOptions = {
        fuzzyThreshold: 0.8,
        exactMatchWeight: 1.0,
        partialMatchWeight: 0.9,
        fuzzyMatchWeight: 0.7,
        abbreviationMatchWeight: 0.95
    };
    const fuzzyMatchPercentage = calculateMatchPercentage(studentSkills, jobSkillsRequired, fuzzyOptions);
    console.log('   ✅ Fuzzy match percentage:', fuzzyMatchPercentage + '%');
} catch (error) {
    console.log('   ❌ Error in fuzzy matching:', error.message);
}

// Test findMatchingStudents
console.log('\n4. Testing findMatchingStudents:');
const testStudents = [
    {
        _id: '1',
        firstName: 'John',
        lastName: 'Doe',
        skills: ['JavaScript', 'React', 'Node.js', 'MongoDB']
    },
    {
        _id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        skills: ['Python', 'Django', 'PostgreSQL']
    },
    {
        _id: '3',
        firstName: 'Bob',
        lastName: 'Johnson',
        skills: ['JavaScript', 'Vue.js', 'Express.js']
    }
];

try {
    const fuzzyOptions = {
        fuzzyThreshold: 0.8,
        exactMatchWeight: 1.0,
        partialMatchWeight: 0.9,
        fuzzyMatchWeight: 0.7,
        abbreviationMatchWeight: 0.95
    };
    const matchingStudents = findMatchingStudents(testStudents, jobSkillsRequired, 50, fuzzyOptions);
    console.log('   ✅ Found matching students:', matchingStudents.length);
    matchingStudents.forEach(match => {
        const student = testStudents.find(s => s._id === match.student);
        console.log(`   - ${student.firstName} ${student.lastName}: ${match.matchPercentage}%`);
    });
} catch (error) {
    console.log('   ❌ Error in findMatchingStudents:', error.message);
    console.log('   Stack:', error.stack);
}

// Test edge cases
console.log('\n5. Testing Edge Cases:');

// Empty arrays
console.log('   Testing empty arrays:');
try {
    const emptyMatch = calculateMatchPercentage([], []);
    console.log('   ✅ Empty arrays result:', emptyMatch + '%');
} catch (error) {
    console.log('   ❌ Error with empty arrays:', error.message);
}

// Mixed data types
console.log('   Testing mixed data types:');
try {
    const mixedMatch = calculateMatchPercentage(['JavaScript'], ['React']);
    console.log('   ✅ String array to string array:', mixedMatch + '%');
} catch (error) {
    console.log('   ❌ Error with string arrays:', error.message);
}

// Null/undefined
console.log('   Testing null/undefined:');
try {
    const nullMatch = calculateMatchPercentage(null, undefined);
    console.log('   ✅ Null/undefined result:', nullMatch + '%');
} catch (error) {
    console.log('   ❌ Error with null/undefined:', error.message);
}

console.log('\n📋 Summary:');
console.log('- Student skills: Array of strings ✅');
console.log('- Job skills: Array of objects with skill property ✅');
console.log('- Matching function should handle both formats ✅');
console.log('- Test completed ✅');

console.log('\n💡 Next Steps:');
console.log('1. Verify the matching function handles object format correctly');
console.log('2. Add debug logging to job creation process');
console.log('3. Check if students are being found in database');
console.log('4. Verify skill comparison logic');
