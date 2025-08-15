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

const courseRouter = express.Router();

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: Get all courses
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of courses per page
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by course category
 *     responses:
 *       200:
 *         description: List of courses retrieved successfully
 *       404:
 *         description: No courses found
 */
courseRouter.get('/', requestLogger, getCourses);

/**
 * @swagger
 * /api/v1/courses/search:
 *   get:
 *     summary: Search courses by title, instructor, or category
 *     tags: [Courses]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Invalid search parameters
 */
courseRouter.get('/search', requestLogger, searchCourses);

/**
 * @swagger
 * /api/v1/courses/provider/{providerId}:
 *   get:
 *     summary: Get courses by training provider
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
 *     responses:
 *       200:
 *         description: Provider courses retrieved successfully
 *       404:
 *         description: No courses found for this provider
 */
courseRouter.get('/provider/:providerId', requestLogger, getCoursesByProvider);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get course by ID
 *     tags: [Courses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *     responses:
 *       200:
 *         description: Course retrieved successfully
 *       404:
 *         description: Course not found
 */
courseRouter.get('/:id', requestLogger, getCoursesById);

/**
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
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
 *               title:
 *                 type: string
 *                 example: "Web Development Fundamentals"
 *               instructor:
 *                 type: string
 *                 example: "John Doe"
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
 *                 enum: ["online", "offline", "hybrid"]
 *                 example: "online"
 *               description:
 *                 type: string
 *                 example: "Learn the fundamentals of web development"
 *               objectives:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Learn HTML", "Learn CSS", "Learn JavaScript"]
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Frontend Development", "Responsive Design"]
 *               category:
 *                 type: string
 *                 example: "Technology"
 *     responses:
 *       201:
 *         description: Course created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only training providers can create courses
 */
courseRouter.post('/', requestLogger, verifyJWT, authorizeRoles('school'), requireActiveSubscription, checkCourseLimit, createCourse);

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
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Course not found
 */
courseRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('admin'), updateCourseStatus);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Delete a course (Admin only)
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
courseRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteCourseById);

// Export the router
export default courseRouter;
