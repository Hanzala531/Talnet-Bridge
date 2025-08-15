import { ApiClient, TestLogger, assert } from '../utils.js';
import { ENDPOINTS, TEST_TOKENS } from '../config.js';
import { COURSES } from '../data/testData.js';

const api = new ApiClient();
const logger = new TestLogger();

let createdCourseIds = [];

export async function runCourseTests() {
    console.log('\n📚 RUNNING COURSE TESTS');
    console.log('='.repeat(50));

    try {
        await testCreateCourses();
        await testGetAllCourses();
        await testGetCourseById();
        await testUpdateCourse();
        await testSearchCourses();
        await testGetCoursesByProvider();
        await testCoursesPagination();
        await testDeleteCourse();
    } catch (error) {
        logger.log('Course Tests', false, `Unexpected error: ${error.message}`);
    }

    logger.summary();
    return logger.results;
}

async function testCreateCourses() {
    try {
        // Test creating Web Development course
        const webDevResult = await api.post(ENDPOINTS.COURSES.CREATE, COURSES.WEB_DEVELOPMENT, TEST_TOKENS.school);
        
        if (webDevResult.success) {
            assert.statusCode(webDevResult.response, 201, 'Course creation should return 201');
            assert.exists(webDevResult.data.data._id, 'Response should contain course ID');
            createdCourseIds.push(webDevResult.data.data._id);
            logger.log('Create Web Dev Course', true, 'Web Development course created successfully');
        } else {
            logger.log('Create Web Dev Course', false, `Failed: ${webDevResult.data.message}`);
        }

        // Test creating Data Science course
        const dataScienceResult = await api.post(ENDPOINTS.COURSES.CREATE, COURSES.DATA_SCIENCE, TEST_TOKENS.school);
        
        if (dataScienceResult.success) {
            createdCourseIds.push(dataScienceResult.data.data._id);
            logger.log('Create Data Science Course', true, 'Data Science course created successfully');
        } else {
            logger.log('Create Data Science Course', false, `Failed: ${dataScienceResult.data.message}`);
        }

        // Test creating unpublished course
        const marketingResult = await api.post(ENDPOINTS.COURSES.CREATE, COURSES.DIGITAL_MARKETING, TEST_TOKENS.school);
        
        if (marketingResult.success) {
            createdCourseIds.push(marketingResult.data.data._id);
            logger.log('Create Marketing Course', true, 'Marketing course created successfully');
        } else {
            logger.log('Create Marketing Course', false, `Failed: ${marketingResult.data.message}`);
        }

        // Test unauthorized course creation (student trying to create course)
        const unauthorizedResult = await api.post(ENDPOINTS.COURSES.CREATE, COURSES.WEB_DEVELOPMENT, TEST_TOKENS.student);
        
        if (!unauthorizedResult.success && (unauthorizedResult.response.status === 403 || unauthorizedResult.response.status === 401)) {
            logger.log('Unauthorized Course Creation', true, 'Student properly prevented from creating course');
        } else {
            logger.log('Unauthorized Course Creation', false, 'Student was allowed to create course');
        }

    } catch (error) {
        logger.log('Create Courses', false, error.message);
    }
}

async function testGetAllCourses() {
    try {
        // Test getting all courses (public access)
        const { response, data, success } = await api.get(ENDPOINTS.COURSES.BASE);
        
        assert.statusCode(response, 200, 'Get all courses should return 200');
        assert.isObject(data.data, 'Response should contain courses data object');
        assert.isArray(data.data.courses, 'Response should contain courses array');
        
        logger.log('Get All Courses', success, `Retrieved ${data.data.courses.length} courses`);

        // Test with pagination parameters
        const paginatedResult = await api.get(`${ENDPOINTS.COURSES.BASE}?page=1&limit=5`);
        if (paginatedResult.success) {
            logger.log('Get Courses with Pagination', true, 'Pagination parameters accepted');
        } else {
            logger.log('Get Courses with Pagination', false, 'Pagination failed');
        }

    } catch (error) {
        logger.log('Get All Courses', false, error.message);
    }
}

async function testGetCourseById() {
    try {
        if (createdCourseIds.length === 0) {
            logger.log('Get Course By ID', false, 'No courses available for testing');
            return;
        }

        const courseId = createdCourseIds[0];
        const { response, data, success } = await api.get(`${ENDPOINTS.COURSES.BASE}/${courseId}`);
        
        assert.statusCode(response, 200, 'Get course by ID should return 200');
        assert.exists(data.data, 'Response should contain course data');
        assert.equals(data.data._id, courseId, 'Returned course should have correct ID');
        
        logger.log('Get Course By ID', success, 'Course retrieved by ID successfully');

        // Test invalid course ID
        const invalidResult = await api.get(`${ENDPOINTS.COURSES.BASE}/invalid_id`);
        if (invalidResult.response.status === 400 || invalidResult.response.status === 404) {
            logger.log('Get Invalid Course ID', true, 'Invalid course ID properly handled');
        } else {
            logger.log('Get Invalid Course ID', false, 'Invalid course ID not properly handled');
        }

    } catch (error) {
        logger.log('Get Course By ID', false, error.message);
    }
}

async function testUpdateCourse() {
    try {
        if (createdCourseIds.length === 0) {
            logger.log('Update Course', false, 'No courses available for testing');
            return;
        }

        const courseId = createdCourseIds[0];
        const updateData = {
            title: "Updated Web Development Course",
            price: 129.99,
            isPublished: true
        };

        const endpoint = ENDPOINTS.COURSES.UPDATE.replace(':id', courseId);
        const { response, data, success } = await api.put(endpoint, updateData, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Update course should return 200');
            assert.equals(data.data.price, 129.99, 'Course price should be updated');
            logger.log('Update Course', true, 'Course updated successfully');
        } else {
            logger.log('Update Course', false, `Update failed: ${data.message}`);
        }

        // Test unauthorized update (student trying to update course)
        const unauthorizedUpdate = await api.put(endpoint, updateData, TEST_TOKENS.student);
        if (!unauthorizedUpdate.success && (unauthorizedUpdate.response.status === 403 || unauthorizedUpdate.response.status === 401)) {
            logger.log('Unauthorized Course Update', true, 'Student properly prevented from updating course');
        } else {
            logger.log('Unauthorized Course Update', false, 'Student was allowed to update course');
        }

    } catch (error) {
        logger.log('Update Course', false, error.message);
    }
}

async function testSearchCourses() {
    try {
        // Test search by title
        const searchResult = await api.get(`${ENDPOINTS.COURSES.SEARCH}?q=development`);
        
        if (searchResult.success) {
            assert.statusCode(searchResult.response, 200, 'Search courses should return 200');
            assert.isArray(searchResult.data.data.courses, 'Search should return courses array');
            logger.log('Search Courses by Title', true, `Found ${searchResult.data.data.courses.length} courses`);
        } else {
            logger.log('Search Courses by Title', false, `Search failed: ${searchResult.data.message}`);
        }

        // Test search by category
        const categorySearch = await api.get(`${ENDPOINTS.COURSES.SEARCH}?category=Programming`);
        if (categorySearch.success) {
            logger.log('Search Courses by Category', true, `Found courses in Programming category`);
        } else {
            logger.log('Search Courses by Category', false, 'Category search failed');
        }

        // Test search by level
        const levelSearch = await api.get(`${ENDPOINTS.COURSES.SEARCH}?level=beginner`);
        if (levelSearch.success) {
            logger.log('Search Courses by Level', true, `Found beginner level courses`);
        } else {
            logger.log('Search Courses by Level', false, 'Level search failed');
        }

    } catch (error) {
        logger.log('Search Courses', false, error.message);
    }
}

async function testGetCoursesByProvider() {
    try {
        // We need a provider ID - let's use the school user's ID
        // First, get the school user's profile to get their ID
        const profileResult = await api.get(ENDPOINTS.USERS.PROFILE, TEST_TOKENS.school);
        
        if (!profileResult.success) {
            logger.log('Get Courses by Provider', false, 'Could not get provider ID');
            return;
        }

        const providerId = profileResult.data.data._id;
        const endpoint = ENDPOINTS.COURSES.BY_PROVIDER.replace(':providerId', providerId);
        const { response, data, success } = await api.get(endpoint);
        
        if (success) {
            assert.statusCode(response, 200, 'Get courses by provider should return 200');
            assert.isArray(data.data.courses, 'Response should contain courses array');
            logger.log('Get Courses by Provider', true, `Found ${data.data.courses.length} courses by provider`);
        } else {
            logger.log('Get Courses by Provider', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Get Courses by Provider', false, error.message);
    }
}

async function testCoursesPagination() {
    try {
        // Test pagination with different page sizes
        const page1 = await api.get(`${ENDPOINTS.COURSES.BASE}?page=1&limit=2`);
        
        if (page1.success) {
            assert.statusCode(page1.response, 200, 'Paginated request should return 200');
            assert.exists(page1.data.data.pagination, 'Response should contain pagination info');
            assert.isTrue(page1.data.data.pagination.limit === 2, 'Should respect limit parameter');
            logger.log('Courses Pagination Page 1', true, 'First page retrieved successfully');
        } else {
            logger.log('Courses Pagination Page 1', false, 'Pagination failed');
        }

        // Test second page
        const page2 = await api.get(`${ENDPOINTS.COURSES.BASE}?page=2&limit=2`);
        if (page2.success) {
            logger.log('Courses Pagination Page 2', true, 'Second page retrieved successfully');
        } else {
            logger.log('Courses Pagination Page 2', false, 'Second page retrieval failed');
        }

    } catch (error) {
        logger.log('Courses Pagination', false, error.message);
    }
}

async function testDeleteCourse() {
    try {
        if (createdCourseIds.length === 0) {
            logger.log('Delete Course', false, 'No courses available for testing');
            return;
        }

        // Try to delete the last created course
        const courseId = createdCourseIds[createdCourseIds.length - 1];
        const endpoint = ENDPOINTS.COURSES.DELETE.replace(':id', courseId);
        const { response, data, success } = await api.delete(endpoint, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Delete course should return 200');
            logger.log('Delete Course', true, 'Course deleted successfully');
            createdCourseIds.pop(); // Remove from our tracking array
        } else {
            logger.log('Delete Course', false, `Failed: ${data.message}`);
        }

        // Test unauthorized delete (student trying to delete course)
        if (createdCourseIds.length > 0) {
            const anotherCourseId = createdCourseIds[0];
            const unauthorizedEndpoint = ENDPOINTS.COURSES.DELETE.replace(':id', anotherCourseId);
            const unauthorizedDelete = await api.delete(unauthorizedEndpoint, TEST_TOKENS.student);
            
            if (!unauthorizedDelete.success && (unauthorizedDelete.response.status === 403 || unauthorizedDelete.response.status === 401)) {
                logger.log('Unauthorized Course Delete', true, 'Student properly prevented from deleting course');
            } else {
                logger.log('Unauthorized Course Delete', false, 'Student was allowed to delete course');
            }
        }

    } catch (error) {
        logger.log('Delete Course', false, error.message);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runCourseTests();
}
