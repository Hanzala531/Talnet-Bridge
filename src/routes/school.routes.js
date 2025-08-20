import express from "express";
import {
    getProfile,
    editProfile,
    getAllTrainingProviders,
    getTrainingProviderById,
    updateTrainingProviderStatus,
    deleteTrainingProvider,
    searchTrainingProviders,
    getTrainingProviderStats,
    matchStudents,
    studentsDirectory,
    dashboardController
} from '../controllers/school.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const schoolRouter = express.Router();

/**
 * @swagger
 * /api/v1/schools:
 *   get:
 *     summary: Get all training providers
 *     tags: [Training Providers]
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
 *         description: Number of providers per page
 *       - in: query
 *         name: focusArea
 *         schema:
 *           type: string
 *         description: Filter by focus area
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by city/location
 *     responses:
 *       200:
 *         description: List of training providers retrieved successfully
 *       404:
 *         description: No training providers found
 */
schoolRouter.get('/', requestLogger, getAllTrainingProviders);

/**
 * @swagger
 * /api/v1/schools/search:
 *   get:
 *     summary: Search training providers
 *     tags: [Training Providers]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: focusArea
 *         schema:
 *           type: string
 *         description: Filter by focus area
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 */
schoolRouter.get('/search', requestLogger, searchTrainingProviders);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   get:
 *     summary: Get own training provider profile
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Training provider only
 *       404:
 *         description: Profile not found
 */
schoolRouter.get('/profile', requestLogger, verifyJWT, authorizeRoles('school'), getProfile);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   put:
 *     summary: Update own training provider profile
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               about:
 *                 type: string
 *                 example: "Leading technology training institute"
 *               established:
 *                 type: string
 *                 format: date
 *                 example: "2015-01-01"
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Web Development", "Data Science", "AI/ML"]
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Training Street"
 *                   city:
 *                     type: string
 *                     example: "Karachi"
 *                   state:
 *                     type: string
 *                     example: "Sindh"
 *                   country:
 *                     type: string
 *                     example: "Pakistan"
 *                   postalCode:
 *                     type: string
 *                     example: "75000"
 *               contact:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                     example: "+92-300-1234567"
 *                   email:
 *                     type: string
 *                     example: "info@traininginstitute.com"
 *                   website:
 *                     type: string
 *                     example: "https://traininginstitute.com"
 *               accreditation:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ISO 9001", "NVQL Certified"]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
schoolRouter.put('/profile', requestLogger, verifyJWT, authorizeRoles('school'), editProfile);

/**
 * @swagger
 * /api/v1/schools/stats:
 *   get:
 *     summary: Get own training provider statistics
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Training provider only
 */
schoolRouter.get('/stats', requestLogger, verifyJWT, authorizeRoles('school'), getTrainingProviderStats);



/**
 * @swagger
 * /api/v1/schools/match-students:
 *   get:
 *     summary: Match students for a job based on required skills
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID to match students against
 *     responses:
 *       200:
 *         description: List of matched students with match percentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 job:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     jobTitle:
 *                       type: string
 *                     requiredSkills:
 *                       type: array
 *                       items:
 *                         type: string
 *                 matchedStudents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       studentId:
 *                         type: string
 *                       user:
 *                         type: object
 *                         properties:
 *                           fullName:
 *                             type: string
 *                           email:
 *                             type: string
 *                       skills:
 *                         type: array
 *                         items:
 *                           type: string
 *                       matchedSkills:
 *                         type: array
 *                         items:
 *                           type: string
 *                       matchPercent:
 *                         type: integer
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing or invalid jobId, or job has no required skills
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 */
schoolRouter.get(
  '/match-students',
  requestLogger,
  verifyJWT,
  authorizeRoles('school',"employer" , 'admin'),
  matchStudents
);

/**
 * @swagger
 * /api/v1/schools/dashboard:
 *   get:
 *     summary: Get dashboard analytics for a school
 *     tags: [Training Providers]
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *           example: "64e1a2b3c4d5e6f7890a1234"
 *         required: true
 *         description: The ID of the school (training provider)
 *     responses:
 *       200:
 *         description: Dashboard analytics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 payload:
 *                   type: object
 *                   properties:
 *                     totalEnrollments:
 *                       type: integer
 *                     completedEnrollments:
 *                       type: integer
 *                     completionRate:
 *                       type: string
 *                     totalRevenue:
 *                       type: number
 *                     totalActiveCourses:
 *                       type: integer
 *                     activeCourses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Course'
 *       400:
 *         description: schoolId query parameter is required
 *       500:
 *         description: Failed to fetch dashboard analytics
 */
schoolRouter.get('/dashboard', requestLogger,verifyJWT , authorizeRoles('school' ), dashboardController);


/**
 * @swagger
 * /api/v1/schools/students-directory:
 *   get:
 *     summary: Get all students of a particular school
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: schoolId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the school (training institute)
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
 *           default: 20
 *         description: Number of students per page
 *     responses:
 *       200:
 *         description: List of students retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 students:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       studentId:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       courses:
 *                         type: array
 *                         items:
 *                           type: string
 *                       status:
 *                         type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       400:
 *         description: schoolId query parameter is required
 *       404:
 *         description: No students found for the given school
 *       401:
 *         description: Unauthorized
 */
schoolRouter.get(
  '/students-directory',
  requestLogger,
  verifyJWT,
  authorizeRoles('school'),
  studentsDirectory
);


/**
 * @swagger
 * /api/v1/schools/{id}:
 *   get:
 *     summary: Get training provider by ID
 *     tags: [Training Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
 *     responses:
 *       200:
 *         description: Training provider retrieved successfully
 *       404:
 *         description: Training provider not found
 */
schoolRouter.get('/:id', requestLogger, getTrainingProviderById);

/**
 * @swagger
 * /api/v1/schools/{id}/status:
 *   patch:
 *     summary: Update training provider status (Admin only)
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
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
 *                 enum: ["active", "inactive", "suspended"]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Training provider not found
 */
schoolRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('admin'), updateTrainingProviderStatus);

/**
 * @swagger
 * /api/v1/schools/{id}:
 *   delete:
 *     summary: Delete training provider (Admin only)
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
 *     responses:
 *       200:
 *         description: Training provider deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Training provider not found
 */
schoolRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteTrainingProvider);


// Export the router
export default schoolRouter;
