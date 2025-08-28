import express from "express";
import {
    getCourses,
    getCoursesById,
    createCourse,
    updateCourse,
    updateCourseStatus,
    deleteCourseById,
    searchCourses,
    getCoursesByProvider
} from '../controllers/courses.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';
import { requireActiveSubscription, checkCourseLimit } from '../middlewares/subscription.middlewares.js';
import { upload } from '../middlewares/Multer.middlewares.js'
import { coursesCache, invalidateUserCache } from '../middlewares/redis.middlewares.js';

const courseRouter = express.Router();

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Get all courses with pagination and filtering
 *     description: Retrieve a paginated list of approved courses with optional filtering by category, price range, and type
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of courses per page (max 50)
 *         example: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by course category
 *         example: "Technology"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ["online", "offline", "hybrid"]
 *         description: Filter by course delivery type
 *         example: "online"
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *         example: 100
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *         example: 500
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Course'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 message:
 *                   type: string
 *                   example: "Courses retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
courseRouter.get('/', requestLogger,verifyJWT , authorizeRoles('school' , 'student'), coursesCache, getCourses);

/**
 * @swagger
 * /api/v1/courses/search:
 *   get:
 *     summary: Search courses by title, instructor, or category
 *     description: Perform advanced search across courses with multiple filter options and full-text search capabilities
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           minLength: 3
 *         required: true
 *         description: Search query for course title, instructor, or description (minimum 3 characters)
 *         example: "web development"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by course category
 *         example: "Technology"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: ["online", "offline", "hybrid"]
 *         description: Filter by course delivery type
 *         example: "online"
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price filter
 *         example: 100
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price filter
 *         example: 500
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of courses per page (max 50)
 *         example: 10
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Course'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                     searchQuery:
 *                       type: string
 *                       example: "web development"
 *                 message:
 *                   type: string
 *                   example: "Search completed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
courseRouter.get('/search', requestLogger,authorizeRoles('school' , 'student'), coursesCache, searchCourses);

/**
 * @swagger
 * /api/v1/courses/provider/{providerId}:
 *   get:
 *     summary: Get courses by training provider
 *     description: Retrieve all courses offered by a specific training provider/school
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider (school) ID
 *         example: "64f789abc123def456789012"
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of courses per page (max 50)
 *         example: 10
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["draft", "pending_approval", "approved", "rejected", "archived"]
 *         description: Filter by course status
 *         example: "approved"
 *     responses:
 *       200:
 *         description: Provider courses retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     courses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Course'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                     providerId:
 *                       type: string
 *                       example: "64f789abc123def456789012"
 *                 message:
 *                   type: string
 *                   example: "Provider courses retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
courseRouter.get('/provider/:providerId', requestLogger, verifyJWT , authorizeRoles('school','student'), getCoursesByProvider);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     description: Create a new course with cover image upload (Only available to training providers with active subscription and within course limits)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - coverImage
 *               - instructorImage
 *               - title
 *               - instructor
 *               - duration
 *               - price
 *               - language
 *               - type
 *               - description
 *               - objectives
 *               - skills
 *               - category
 *             properties:
 *               coverImage:
 *                 type: string
 *                 format: binary
 *                 description: Course cover image file (JPEG, PNG, WebP, max 5MB)
 *               instructorImage:
 *                 type: string
 *                 format: binary
 *                 description: Instructor profile image (JPEG, PNG, WebP, max 5MB)
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Course title/name
 *                 example: "Complete Web Development - HTML, CSS, JavaScript & React"
 *               instructor:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Primary instructor name
 *                 example: "John Doe"
 *               duration:
 *                 type: string
 *                 description: Course duration in human-readable format
 *                 example: "12 weeks"
 *               price:
 *                 type: number
 *                 minimum: 0
 *                 multipleOf: 0.01
 *                 description: Course price in USD (0 for free courses)
 *                 example: 299.99
 *               language:
 *                 type: string
 *                 minLength: 2
 *                 description: Primary course language
 *                 example: "English"
 *               type:
 *                 type: string
 *                 enum: ["online", "oncampus", "hybrid"]
 *                 description: Course delivery method
 *                 example: "online"
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 5
 *                 minItems: 1
 *                 maxItems: 10
 *                 description: Learning objectives (what students will achieve)
 *                 example: ["Build responsive websites with HTML & CSS", "Develop interactive web applications with JavaScript", "Create modern UIs with React framework", "Understand web development best practices"]
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 2000
 *                 description: Detailed course description
 *                 example: "This comprehensive web development course takes you from absolute beginner to confident developer. You'll learn HTML, CSS, JavaScript, and React through hands-on projects and real-world examples. Perfect for career changers and students looking to enter the tech industry."
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 2
 *                 minItems: 1
 *                 maxItems: 15
 *                 description: Skills students will gain
 *                 example: ["HTML5", "CSS3", "JavaScript ES6+", "React.js", "Responsive Design", "Git & GitHub", "Web APIs", "Frontend Development"]
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 description: Course category/field
 *                 example: "Technology"
 *               prerequisites:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Course prerequisites (optional)
 *                 example: ["Basic computer skills", "No prior coding experience required"]
 *               difficulty:
 *                 type: string
 *                 enum: ["beginner", "intermediate", "advanced"]
 *                 description: Course difficulty level (optional)
 *                 example: "beginner"
 *               maxStudents:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Maximum number of students (optional)
 *                 example: 50
 *           example:
 *             title: "Complete Web Development - HTML, CSS, JavaScript & React"
 *             instructor: "John Doe"
 *             duration: "12 weeks"
 *             price: 299.99
 *             language: "English"
 *             type: "online"
 *             objectives: ["Build responsive websites with HTML & CSS", "Develop interactive web applications with JavaScript", "Create modern UIs with React framework"]
 *             description: "This comprehensive web development course takes you from absolute beginner to confident developer. You'll learn HTML, CSS, JavaScript, and React through hands-on projects."
 *             skills: ["HTML5", "CSS3", "JavaScript ES6+", "React.js", "Responsive Design"]
 *             category: "Technology"
 *             prerequisites: ["Basic computer skills", "No prior coding experience required"]
 *             difficulty: "beginner"
 *             maxStudents: 50
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Course created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     courseId:
 *                       type: string
 *                       example: "64f456def789abc123456789"
 *                     title:
 *                       type: string
 *                       example: "Complete Web Development - HTML, CSS, JavaScript & React"
 *                     instructor:
 *                       type: string
 *                       example: "John Doe"
 *                     status:
 *                       type: string
 *                       example: "pending_approval"
 *                     coverImageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/talentbridge/image/upload/v1234567890/courses/cover_abc123.jpg"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-28T10:30:00.000Z"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Validation error - Invalid request data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "title"
 *                       message:
 *                         type: string
 *                         example: "Course title is required and must be at least 3 characters"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions or inactive subscription
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Only training providers with active subscription can create courses"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       413:
 *         description: File too large
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 413
 *                 message:
 *                   type: string
 *                   example: "Cover image file size exceeds 5MB limit"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       429:
 *         description: Course limit exceeded for current subscription plan
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 429
 *                 message:
 *                   type: string
 *                   example: "Course creation limit exceeded for your current subscription plan"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
courseRouter.post(
    '/',
    requestLogger,
    verifyJWT,
    authorizeRoles('school'),
    requireActiveSubscription,
    checkCourseLimit,
    upload.fields([
        { name: 'coverImage', maxCount: 1 },
        { name: 'instructorImage', maxCount: 1 }
    ]),
    createCourse
);

// =============================================
// PARAMETRIC ID ROUTES (MUST BE AT END)
// =============================================

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     description: Retrieve detailed information about a specific course including instructor details and enrollment information
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course unique identifier
 *         example: "64f456def789abc123456789"
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     course:
 *                       $ref: '#/components/schemas/Course'
 *                 message:
 *                   type: string
 *                   example: "Course retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
courseRouter.get('/:id', requestLogger,verifyJWT ,authorizeRoles('school' , 'student'), coursesCache, getCoursesById);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Update a course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               instructor:
 *                 type: string
 *               duration:
 *                 type: string
 *               price:
 *                 type: number
 *               language:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: ["online", "offline", "hybrid"]
 *               description:
 *                 type: string
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *               category:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
courseRouter.put('/:id', requestLogger, verifyJWT, authorizeRoles('school'), requireActiveSubscription, updateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/status:
 *   patch:
 *     summary: Update course status (Admin only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["draft", "pending_approval", "approved", "rejected", "archived"]
 *                 example: "approved"
 *     responses:
 *       200:
 *         description: Course status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
courseRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('school'), updateCourseStatus);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Delete a course (school only)
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
courseRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('school'), deleteCourseById);

// Export the router
export default courseRouter;
