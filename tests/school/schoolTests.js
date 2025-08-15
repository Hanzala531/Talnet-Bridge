import { ApiClient, TestLogger, assert } from '../utils.js';
import { ENDPOINTS, TEST_TOKENS } from '../config.js';
import { TRAINING_INSTITUTES } from '../data/testData.js';

const api = new ApiClient();
const logger = new TestLogger();

export async function runSchoolTests() {
    console.log('\n🏫 RUNNING SCHOOL TESTS');
    console.log('='.repeat(50));

    try {
        await testCreateSchoolProfile();
        await testGetSchoolProfile();
        await testUpdateSchoolProfile();
        await testGetAllSchools();
        await testSearchSchools();
        await testSchoolStatistics();
        await testUpdateSchoolStatus();
        await testDeleteSchoolProfile();
    } catch (error) {
        logger.log('School Tests', false, `Unexpected error: ${error.message}`);
    }

    logger.summary();
    return logger.results;
}

async function testCreateSchoolProfile() {
    try {
        const { response, data, success } = await api.post(ENDPOINTS.SCHOOLS.PROFILE, TRAINING_INSTITUTES.TECH_ACADEMY, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 201, 'Create school profile should return 201');
            assert.exists(data.data._id, 'Response should contain school profile ID');
            assert.equals(data.data.instituteName, TRAINING_INSTITUTES.TECH_ACADEMY.instituteName, 'School name should match');
            logger.log('Create School Profile', true, 'School profile created successfully');
        } else {
            logger.log('Create School Profile', false, `Failed: ${data.message}`);
        }

        // Test unauthorized profile creation (student trying to create school profile)
        const unauthorizedResult = await api.post(ENDPOINTS.SCHOOLS.PROFILE, TRAINING_INSTITUTES.BUSINESS_SCHOOL, TEST_TOKENS.student);
        
        if (!unauthorizedResult.success && (unauthorizedResult.response.status === 403 || unauthorizedResult.response.status === 401)) {
            logger.log('Unauthorized School Profile Creation', true, 'Student properly prevented from creating school profile');
        } else {
            logger.log('Unauthorized School Profile Creation', false, 'Student was allowed to create school profile');
        }

    } catch (error) {
        logger.log('Create School Profile', false, error.message);
    }
}

async function testGetSchoolProfile() {
    try {
        const { response, data, success } = await api.get(ENDPOINTS.SCHOOLS.PROFILE, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Get school profile should return 200');
            assert.exists(data.data, 'Response should contain school profile data');
            assert.exists(data.data.instituteName, 'Profile should contain institute name');
            logger.log('Get School Profile', true, 'School profile retrieved successfully');
        } else if (response.status === 404) {
            logger.log('Get School Profile', true, 'No profile found (expected for new school)');
        } else {
            logger.log('Get School Profile', false, `Failed: ${data.message}`);
        }

        // Test unauthorized access (student trying to access school profile)
        const unauthorizedResult = await api.get(ENDPOINTS.SCHOOLS.PROFILE, TEST_TOKENS.student);
        
        if (!unauthorizedResult.success && (unauthorizedResult.response.status === 403 || unauthorizedResult.response.status === 401)) {
            logger.log('Unauthorized School Profile Access', true, 'Student properly prevented from accessing school profile');
        } else {
            logger.log('Unauthorized School Profile Access', false, 'Student was allowed to access school profile');
        }

    } catch (error) {
        logger.log('Get School Profile', false, error.message);
    }
}

async function testUpdateSchoolProfile() {
    try {
        const updateData = {
            description: "Updated: Leading technology training institute with modern facilities",
            contact: {
                phone: "+1-555-999-8888",
                email: "updated@techacademy.com",
                website: "https://newtechacademy.com"
            },
            specializations: ["Web Development", "Data Science", "AI/ML", "Cloud Computing"]
        };

        const { response, data, success } = await api.put(ENDPOINTS.SCHOOLS.UPDATE, updateData, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Update school profile should return 200');
            assert.equals(data.data.contact.phone, updateData.contact.phone, 'Phone should be updated');
            logger.log('Update School Profile', true, 'School profile updated successfully');
        } else {
            logger.log('Update School Profile', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Update School Profile', false, error.message);
    }
}

async function testGetAllSchools() {
    try {
        // Test admin access to all schools
        const { response, data, success } = await api.get(ENDPOINTS.SCHOOLS.ALL, TEST_TOKENS.admin);
        
        if (success) {
            assert.statusCode(response, 200, 'Get all schools should return 200');
            assert.isObject(data.data, 'Response should contain schools data object');
            assert.isArray(data.data.schools, 'Response should contain schools array');
            logger.log('Get All Schools (Admin)', true, `Retrieved ${data.data.schools.length} schools`);
        } else {
            logger.log('Get All Schools (Admin)', false, `Failed: ${data.message}`);
        }

        // Test public access to all schools
        const publicResult = await api.get(ENDPOINTS.SCHOOLS.ALL);
        if (publicResult.success) {
            logger.log('Get All Schools (Public)', true, 'Public access to schools successful');
        } else {
            logger.log('Get All Schools (Public)', false, 'Public access to schools failed');
        }

        // Test pagination
        const paginatedResult = await api.get(`${ENDPOINTS.SCHOOLS.ALL}?page=1&limit=5`, TEST_TOKENS.admin);
        if (paginatedResult.success) {
            logger.log('Get Schools with Pagination', true, 'Pagination working correctly');
        } else {
            logger.log('Get Schools with Pagination', false, 'Pagination failed');
        }

    } catch (error) {
        logger.log('Get All Schools', false, error.message);
    }
}

async function testSearchSchools() {
    try {
        // Test search by name
        const searchResult = await api.get(`${ENDPOINTS.SCHOOLS.SEARCH}?q=Tech`);
        
        if (searchResult.success) {
            assert.statusCode(searchResult.response, 200, 'Search schools should return 200');
            assert.isArray(searchResult.data.data.schools, 'Search should return schools array');
            logger.log('Search Schools by Name', true, `Found ${searchResult.data.data.schools.length} schools`);
        } else {
            logger.log('Search Schools by Name', false, `Search failed: ${searchResult.data.message}`);
        }

        // Test search by specialization
        const specializationSearch = await api.get(`${ENDPOINTS.SCHOOLS.SEARCH}?specialization=Web Development`);
        if (specializationSearch.success) {
            logger.log('Search Schools by Specialization', true, 'Specialization search successful');
        } else {
            logger.log('Search Schools by Specialization', false, 'Specialization search failed');
        }

        // Test search by location
        const locationSearch = await api.get(`${ENDPOINTS.SCHOOLS.SEARCH}?city=San Francisco`);
        if (locationSearch.success) {
            logger.log('Search Schools by Location', true, 'Location search successful');
        } else {
            logger.log('Search Schools by Location', false, 'Location search failed');
        }

        // Test search with verified filter
        const verifiedSearch = await api.get(`${ENDPOINTS.SCHOOLS.SEARCH}?verified=true`);
        if (verifiedSearch.success) {
            logger.log('Search Verified Schools', true, 'Verified schools filter working');
        } else {
            logger.log('Search Verified Schools', false, 'Verified schools filter failed');
        }

    } catch (error) {
        logger.log('Search Schools', false, error.message);
    }
}

async function testSchoolStatistics() {
    try {
        // First, get the school profile to get the school ID
        const profileResult = await api.get(ENDPOINTS.SCHOOLS.PROFILE, TEST_TOKENS.school);
        
        if (!profileResult.success) {
            logger.log('School Statistics', false, 'Could not get school ID for statistics');
            return;
        }

        const schoolId = profileResult.data.data._id;
        const endpoint = ENDPOINTS.SCHOOLS.STATISTICS.replace(':id', schoolId);
        
        const { response, data, success } = await api.get(endpoint, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Get school statistics should return 200');
            assert.exists(data.data, 'Response should contain statistics data');
            logger.log('Get School Statistics', true, 'School statistics retrieved successfully');
        } else {
            logger.log('Get School Statistics', false, `Failed: ${data.message}`);
        }

        // Test admin access to school statistics
        const adminStatsResult = await api.get(endpoint, TEST_TOKENS.admin);
        if (adminStatsResult.success) {
            logger.log('Get School Statistics (Admin)', true, 'Admin can access school statistics');
        } else {
            logger.log('Get School Statistics (Admin)', false, 'Admin cannot access school statistics');
        }

    } catch (error) {
        logger.log('School Statistics', false, error.message);
    }
}

async function testUpdateSchoolStatus() {
    try {
        // First, get the school profile to get the school ID
        const profileResult = await api.get(ENDPOINTS.SCHOOLS.PROFILE, TEST_TOKENS.school);
        
        if (!profileResult.success) {
            logger.log('Update School Status', false, 'Could not get school ID for status update');
            return;
        }

        const schoolId = profileResult.data.data._id;
        const endpoint = ENDPOINTS.SCHOOLS.UPDATE_STATUS.replace(':id', schoolId);
        
        const statusData = {
            isVerified: true,
            status: 'active'
        };

        const { response, data, success } = await api.patch(endpoint, statusData, TEST_TOKENS.admin);
        
        if (success) {
            assert.statusCode(response, 200, 'Update school status should return 200');
            logger.log('Update School Status', true, 'School status updated successfully');
        } else {
            logger.log('Update School Status', false, `Failed: ${data.message}`);
        }

        // Test unauthorized status update (school trying to update own status)
        const unauthorizedResult = await api.patch(endpoint, statusData, TEST_TOKENS.school);
        if (!unauthorizedResult.success && (unauthorizedResult.response.status === 403 || unauthorizedResult.response.status === 401)) {
            logger.log('Unauthorized School Status Update', true, 'School properly prevented from updating own status');
        } else {
            logger.log('Unauthorized School Status Update', false, 'School was allowed to update own status');
        }

    } catch (error) {
        logger.log('Update School Status', false, error.message);
    }
}

async function testDeleteSchoolProfile() {
    try {
        // Test delete with school token (should be allowed)
        const { response, data, success } = await api.delete(ENDPOINTS.SCHOOLS.DELETE, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Delete school profile should return 200');
            logger.log('Delete School Profile', true, 'School profile deleted successfully');
        } else if (response.status === 404) {
            logger.log('Delete School Profile', true, 'No profile to delete (expected)');
        } else {
            logger.log('Delete School Profile', false, `Failed: ${data.message}`);
        }

        // Test unauthorized delete (student trying to delete school profile)
        const unauthorizedResult = await api.delete(ENDPOINTS.SCHOOLS.DELETE, TEST_TOKENS.student);
        if (!unauthorizedResult.success && (unauthorizedResult.response.status === 403 || unauthorizedResult.response.status === 401)) {
            logger.log('Unauthorized School Profile Delete', true, 'Student properly prevented from deleting school profile');
        } else {
            logger.log('Unauthorized School Profile Delete', false, 'Student was allowed to delete school profile');
        }

    } catch (error) {
        logger.log('Delete School Profile', false, error.message);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSchoolTests();
}
