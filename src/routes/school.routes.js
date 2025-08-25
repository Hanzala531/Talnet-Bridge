import express from "express";
import {
     getProfile,
  editProfile,
  createProfile,
  addPicture,
  getAllTrainingProviders,
  getTrainingProviderById,
  searchTrainingProviders,
  updateTrainingProviderStatus,
  deleteTrainingProvider,
  getTrainingProviderStats,
  matchStudents,
  studentsDirectory,
  dashboardController,
  employerDirectory
} from '../controllers/school.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';
import { upload } from "../middlewares/Multer.middlewares.js";

const schoolRouter = express.Router();

/**
 * @swagger
 * /api/v1/schools:
 *   get:
 *     summary: Retrieve a paginated list of all training providers
 *     description: Returns a list of training providers (schools) with optional filtering by focus area and location. Supports pagination.
 *     tags: [Training Providers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination. Default is 1.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of providers per page. Default is 10.
 *       - in: query
 *         name: focusArea
 *         schema:
 *           type: string
 *         description: Filter providers by focus area
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter providers by city or location
 *     responses:
 *       200:
 *         description: List of training providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 providers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TrainingProvider'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 *       404:
 *         description: No training providers found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 404
 *               message: "No training providers found"
 */
schoolRouter.get('/', requestLogger, getAllTrainingProviders);

/**
 * @swagger
 * /api/v1/schools/search:
 *   get:
 *     summary: Search training providers by name, focus area, or city
 *     description: Returns a list of training providers matching the search query and optional filters.
 *     tags: [Training Providers]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query (e.g., provider name)
 *       - in: query
 *         name: focusArea
 *         schema:
 *           type: string
 *         description: Filter by focus area (e.g., "AI/ML")
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city (e.g., "Lahore")
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
 *                 providers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/TrainingProvider'
 *       400:
 *         description: Search query is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "Search query is required"
 */
schoolRouter.get('/search', requestLogger, searchTrainingProviders);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   get:
 *     summary: Get the authenticated training provider's profile
 *     description: Returns the profile of the currently authenticated training provider (school).
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingProvider'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Unauthorized"
 *       403:
 *         description: Access denied - Training provider only
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 403
 *               message: "Access denied - Training provider only"
 *       404:
 *         description: Profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 404
 *               message: "Profile not found"
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
 *                 type: string                   
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
 *         description: Profile updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingProvider'
 *       400:
 *         description: Validation error.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "Validation error"
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Unauthorized"
 *       403:
 *         description: Access denied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 403
 *               message: "Access denied"
 */
schoolRouter.put('/profile', requestLogger, verifyJWT, authorizeRoles('school'), editProfile);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   post:
 *     summary: Create a new training provider profile
 *     description: Allows a school to create its training provider profile. Only accessible to authenticated users with the 'school' role.
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - phone
 *               - about
 *               - established
 *               - location
 *             properties:
 *               name:
 *                 type: string
 *                 example: "ABC Institute"
 *               email:
 *                 type: string
 *                 example: "info@abcinstitute.com"
 *               phone:
 *                 type: string
 *                 example: "+1234567890"
 *               about:
 *                 type: string
 *                 example: "A leading provider of technical education."
 *               established:
 *                 type: string
 *                 example: "2005"
 *               location:
 *                 type: string
 *                 example: "123 Main St, City, Country"
 *     responses:
 *       201:
 *         description: Training provider profile created successfully
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
 *                   example: Training provider profile created successfully
 *                 payload:
 *                   $ref: '#/components/schemas/TrainingInstitute'
 *       400:
 *         description: Validation error or missing required fields
 *       409:
 *         description: Profile already exists for this user
 *       422:
 *         description: Validation failed
 *       500:
 *         description: Internal server error
 */
schoolRouter.post('/profile', requestLogger, verifyJWT, authorizeRoles('school'), createProfile);

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
 *         description: Statistics retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 stats:
 *                   type: object
 *                   description: Statistics object
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Unauthorized"
 *       403:
 *         description: Access denied. Only training providers can access this resource.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 403
 *               message: "Access denied - Training provider only"
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
 *         description: List of matched students with match percentage.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 job:
 *                   type: object
 *                 matchedStudents:
 *                   type: array
 *                 message:
 *                   type: string
 *       400:
 *         description: Missing or invalid jobId, or job has no required skills.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "Missing or invalid jobId, or job has no required skills."
 *       404:
 *         description: Job not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 404
 *               message: "Job not found."
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Unauthorized."
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
 *         description: Dashboard analytics fetched successfully.
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
 *       400:
 *         description: schoolId query parameter is required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "schoolId query parameter is required."
 *       500:
 *         description: Failed to fetch dashboard analytics.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 500
 *               message: "Failed to fetch dashboard analytics."
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
 *         description: List of students retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 students:
 *                   type: array
 *                 pagination:
 *                   type: object
 *       400:
 *         description: schoolId query parameter is required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 400
 *               message: "schoolId query parameter is required."
 *       404:
 *         description: No students found for the given school.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 404
 *               message: "No students found for the given school."
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               statusCode: 401
 *               message: "Unauthorized."
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

// Route for employer directory
/**
 * @swagger
 * /api/v1/schools/employers:
 *   get:
 *     summary: Retrieve a list of employers
 *     description: Returns a list of employers with optional filters and pagination.
 *     tags: [Employers]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination. Default is 1.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of employers per page. Default is 10.
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter employers by location.
 *     responses:
 *       200:
 *         description: List of employers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 employers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Employer'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 100
 *                     totalPages:
 *                       type: integer
 *                       example: 10
 */
schoolRouter.get('/employers/dir', requestLogger, verifyJWT, authorizeRoles('school'), employerDirectory);

/**
 * @swagger
 * /api/v1/schools/profile/picture:
 *   post:
 *     summary: Upload or update training provider profile picture
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               picture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TrainingProvider'
 *       400:
 *         description: Invalid file type or size
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Training provider only
 */
schoolRouter.post('/profile/picture', requestLogger, verifyJWT, authorizeRoles('school'),upload.single('image'), addPicture);

// Export the router
export default schoolRouter;
