import express from "express";
import {
    createEnrollment,
    getUserEnrollments,
    getEnrollmentById,
    updateEnrollmentStatus,
    getCourseEnrollments,
    getEnrollmentStatistics,
    withdrawFromCourse,
    debugEnrollments
} from '../controllers/enrollments.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const enrollmentRouter = express.Router();

/**
 * @swagger
 * /api/v1/enrollments:
 *   post:
 *     summary: Enroll in a course
 *     description: Create a new enrollment for a student in a specific course with payment and preferences
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - paymentMethod
 *             properties:
 *               courseId:
 *                 type: string
 *                 format: objectId
 *                 description: Unique identifier of the course to enroll in
 *                 example: "64abc123def456789012def1"
 *               paymentMethod:
 *                 type: string
 *                 enum: [stripe, paypal, credit_card, bank_transfer, free]
 *                 description: Payment method for course enrollment
 *                 example: "stripe"
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code for discount
 *                 example: "SAVE20"
 *               enrollmentType:
 *                 type: string
 *                 enum: [full, trial, audit]
 *                 description: Type of enrollment access
 *                 default: "full"
 *                 example: "full"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Preferred start date for the course (if flexible)
 *                 example: "2025-09-01"
 *               notifications:
 *                 type: object
 *                 description: Notification preferences for this enrollment
 *                 properties:
 *                   email:
 *                     type: boolean
 *                     default: true
 *                     example: true
 *                   sms:
 *                     type: boolean
 *                     default: false
 *                     example: false
 *                   push:
 *                     type: boolean
 *                     default: true
 *                     example: true
 *           example:
 *             courseId: "64abc123def456789012def1"
 *             paymentMethod: "stripe"
 *             couponCode: "SAVE20"
 *             enrollmentType: "full"
 *             startDate: "2025-09-01"
 *             notifications:
 *               email: true
 *               sms: false
 *               push: true
 *     responses:
 *       201:
 *         description: Successfully enrolled in course
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
 *                   example: "Successfully enrolled in course"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     enrollmentId:
 *                       type: string
 *                       example: "64abc123def456789012def2"
 *                     courseId:
 *                       type: string
 *                       example: "64abc123def456789012def1"
 *                     studentId:
 *                       type: string
 *                       example: "64abc123def456789012def3"
 *                     enrollmentDate:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-28T10:30:00.000Z"
 *                     status:
 *                       type: string
 *                       example: "enrolled"
 *                     paymentStatus:
 *                       type: string
 *                       example: "paid"
 *                     progress:
 *                       type: number
 *                       example: 0
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Bad request - Already enrolled, course at capacity, or course not available
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
 *                   example: "Student is already enrolled in this course"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         description: Course not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "Course not found"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
enrollmentRouter.post('/', requestLogger, verifyJWT, authorizeRoles('student'), createEnrollment);

/**
 * @swagger
 * /api/v1/enrollments:
 *   get:
 *     summary: Get user's enrollments
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
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
 *           maximum: 100
 *         description: Number of enrollments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [enrolled, in-progress, completed, withdrawn, suspended]
 *         description: Filter by enrollment status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Enrollments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Enrollments fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     enrollments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Enrollment'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 */
enrollmentRouter.get('/', requestLogger, verifyJWT, authorizeRoles('student' , 'school' ), getUserEnrollments);

/**
 * @swagger
 * /api/v1/enrollments/course/{courseId}:
 *   get:
 *     summary: Get course enrollments (Provider/Admin only)
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Course ID
 *         example: "64f789abc123def456789012"
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
 *           maximum: 100
 *         description: Number of enrollments per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [enrolled, in-progress, completed, withdrawn, suspended]
 *         description: Filter by enrollment status
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [pending, paid, failed, refunded]
 *         description: Filter by payment status
 *     responses:
 *       200:
 *         description: Course enrollments retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Course enrollments fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     enrollments:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Enrollment'
 *                     courseInfo:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: "JavaScript Fundamentals"
 *                         instructor:
 *                           type: string
 *                           example: "John Doe"
 *                         totalEnrollments:
 *                           type: integer
 *                           example: 25
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         pages:
 *                           type: integer
 *                           example: 3
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Course not found
 */
enrollmentRouter.get('/course/:courseId', requestLogger, verifyJWT, authorizeRoles('admin', 'school'), getCourseEnrollments);

/**
 * @swagger
 * /api/v1/enrollments/statistics:
 *   get:
 *     summary: Get enrollment statistics
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Enrollment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Enrollment statistics fetched successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalEnrollments:
 *                           type: integer
 *                           example: 150
 *                         completedEnrollments:
 *                           type: integer
 *                           example: 45
 *                         activeEnrollments:
 *                           type: integer
 *                           example: 90
 *                         paidEnrollments:
 *                           type: integer
 *                           example: 120
 *                         totalRevenue:
 *                           type: number
 *                           example: 359880
 *                         completionRate:
 *                           type: string
 *                           example: "30.00"
 *                         paymentRate:
 *                           type: string
 *                           example: "80.00"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
enrollmentRouter.get('/statistics', requestLogger, verifyJWT, authorizeRoles('admin', 'school', 'student'), getEnrollmentStatistics);

// =============================================
// PARAMETRIC ID ROUTES (MUST BE AT END)
// =============================================

/**
 * @swagger
 * /api/v1/enrollments/{id}:
 *   get:
 *     summary: Get enrollment by ID
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Enrollment retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Enrollment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Enrollment not found
 */
enrollmentRouter.get('/:id', requestLogger, verifyJWT, getEnrollmentById);

/**
 * @swagger
 * /api/v1/enrollments/{id}/status:
 *   patch:
 *     summary: Update enrollment status
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["enrolled", "in-progress", "completed", "dropped", "suspended"]
 *                 example: "in-progress"
 *               progress:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 75
 *               completionDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-09-20T15:30:00.000Z"
 *     responses:
 *       200:
 *         description: Enrollment status updated successfully
 *       400:
 *         description: Invalid status value or access denied
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enrollment not found
 */
enrollmentRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles( 'school'), updateEnrollmentStatus);

/**
 * @swagger
 * /api/v1/enrollments/{id}/withdraw:
 *   patch:
 *     summary: Withdraw from course
 *     tags: [Enrollments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Enrollment ID
 *     responses:
 *       200:
 *         description: Successfully withdrawn from course
 *       400:
 *         description: Already withdrawn or course completed
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Enrollment not found
 */
enrollmentRouter.patch('/:id/withdraw', requestLogger, verifyJWT, authorizeRoles('student'), withdrawFromCourse);

// DEBUG ROUTE - Remove in production
enrollmentRouter.get('/debug/all', requestLogger, verifyJWT, authorizeRoles('admin', 'school'), debugEnrollments);

export default enrollmentRouter;
