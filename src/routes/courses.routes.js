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
 *         description: No courses found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
courseRouter.get('/', requestLogger,verifyJWT , coursesCache, getCourses);

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
 *         description: Invalid search parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: No courses found matching search criteria
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
courseRouter.get('/search', requestLogger, coursesCache, searchCourses);

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
 *         description: No courses found for this provider or provider not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
courseRouter.get('/provider/:providerId', requestLogger, getCoursesByProvider);

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
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
courseRouter.get('/:id', requestLogger, coursesCache, getCoursesById);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     description: Create a new course (Only available to training providers with active subscription)
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
 *                 description: Course cover image file
 *               title:
 *                 type: string
 *                 example: "Golang -Go beigner to Advance"
 *               instructor:
 *                 type: string
 *                 example: "John ven"
 *               duration:
 *                 type: string
 *                 example: "8 weeks"
 *               price:
 *                 type: number
 *                 example: 299.99
 *               language:
 *                 type: string
 *                 example: "English"
 *               type:
 *                 type: string
 *                 enum: ["online", "oncampus", "hybrid"]
 *                 example: "oncampus"
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Learn HTML,Learn CSS,Learn JavaScript"]
 *               description:
 *                 type: string
 *                 example: "Learn the fundamentals of web development"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Frontend Development,Responsive Design"]
 *               category:
 *                 type: string
 *                 example: "Technology"
 *     responses:
 *       201:
 *         description: Course created successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Course created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     course:
 *                       type: object
 *                       example:
 *                         coverImage: "http://res.cloudinary.com/hanzalascloud/image/upload/v1756104538/loopwin-products/otiyhb0xg2k2vly4hcfv.jpg"
 *                         title: "Golang -Go beigner to Advance"
 *                         instructor: "John ven"
 *                         duration: "8 weeks"
 *                         price: 299.99
 *                         language: "English"
 *                         type: "oncampus"
 *                         objectives: ["Learn HTML,Learn CSS,Learn JavaScript"]
 *                         description: "Learn the fundamentals of web development"
 *                         skills: ["Frontend Development,Responsive Design"]
 *                         trainingProvider: "68a592c676bf09279c431214"
 *                         category: "Technology"
 *                         status: "approved"
 *                         maxEnrollments: 50
 *                         currentEnrollments: 0
 *                         _id: "68ac075a03b1574c514c9fbb"
 *                         createdAt: "2025-08-25T06:48:58.537Z"
 *                         updatedAt: "2025-08-25T06:48:58.537Z"
 *                         __v: 0
 *       400:
 *         description: Missing required fields or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - Only training providers can create courses or subscription required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       429:
 *         description: Course limit exceeded for current subscription plan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
courseRouter.post('/', requestLogger, verifyJWT, authorizeRoles('school'), requireActiveSubscription, checkCourseLimit, upload.single('coverImage'), createCourse);

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
 *       404:
 *         description: Course not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Can only update own courses
 */
courseRouter.put('/:id', requestLogger, verifyJWT, authorizeRoles('school'), requireActiveSubscription, updateCourse);

// /**
//  * @swagger
//  * /api/v1/courses/{id}/status:
//  *   patch:
//  *     summary: Update course status (Admin only)
//  *     tags: [Courses]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Course ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - status
//  *             properties:
//  *               status:
//  *                 type: string
//  *                 enum: ["draft", "pending_approval", "approved", "rejected", "archived"]
//  *                 example: "approved"
//  *     responses:
//  *       200:
//  *         description: Course status updated successfully
//  *       400:
//  *         description: Invalid status value
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Forbidden - Admin access required
//  *       404:
//  *         description: Course not found
//  */
// courseRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('school'), updateCourseStatus);

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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Course not found
 */
courseRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('school'), deleteCourseById);

// Export the router
export default courseRouter;
