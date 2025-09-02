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
 *                     $ref: '#/components/schemas/School'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
schoolRouter.get('/', requestLogger, authorizeRoles('student'), getAllTrainingProviders);

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
 *                     $ref: '#/components/schemas/School'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 */
schoolRouter.get('/search', requestLogger,authorizeRoles('student' , 'school'), searchTrainingProviders);

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
 *               $ref: '#/components/schemas/School'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 *               $ref: '#/components/schemas/School'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
schoolRouter.put('/profile', requestLogger, verifyJWT, authorizeRoles('school'), editProfile);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   post:
 *     summary: Create a new training provider profile
 *     description: Create a comprehensive training provider profile with institution details, contact information, and educational focus areas
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - institutionName
 *               - institutionType
 *               - email
 *               - phone
 *               - address
 *               - city
 *               - country
 *               - focusAreas
 *               - description
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *                 description: Institution logo/profile image (JPEG, PNG, WebP, max 5MB)
 *               institutionName:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 200
 *                 description: Official name of the training institution
 *                 example: "Tech Excellence Institute"
 *               institutionType:
 *                 type: string
 *                 enum: ["university", "college", "vocational_school", "training_center", "bootcamp", "online_academy"]
 *                 description: Type of educational institution
 *                 example: "training_center"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Primary contact email for the institution
 *                 example: "contact@techexcellence.edu"
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9+\\-\\s()]{10,20}$"
 *                 description: Primary contact phone number
 *                 example: "+1-555-123-4567"
 *               website:
 *                 type: string
 *                 format: uri
 *                 description: Institution website URL
 *                 example: "https://www.techexcellence.edu"
 *               address:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 300
 *                 description: Complete physical address
 *                 example: "123 Education Street, Tech District"
 *               city:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: City where institution is located
 *                 example: "San Francisco"
 *               state:
 *                 type: string
 *                 description: State or province
 *                 example: "California"
 *               country:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Country where institution is located
 *                 example: "United States"
 *               postalCode:
 *                 type: string
 *                 description: Postal or ZIP code
 *                 example: "94105"
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 10
 *                 description: Primary areas of educational focus
 *                 example: ["Software Development", "Data Science", "Cybersecurity", "Cloud Computing"]
 *               description:
 *                 type: string
 *                 minLength: 50
 *                 maxLength: 2000
 *                 description: Detailed description of the institution and its programs
 *                 example: "Tech Excellence Institute is a leading provider of cutting-edge technology education, specializing in software development, data science, and cybersecurity training. We offer hands-on, industry-relevant programs designed to prepare students for successful careers in tech."
 *               accreditation:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of accreditations and certifications
 *                 example: ["ACCET Accredited", "ISO 9001:2015 Certified", "CompTIA Authorized Partner"]
 *               establishedYear:
 *                 type: integer
 *                 minimum: 1800
 *                 maximum: 2025
 *                 description: Year the institution was established
 *                 example: 2010
 *               studentCapacity:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 50000
 *                 description: Maximum number of students the institution can accommodate
 *                 example: 500
 *               facultyCount:
 *                 type: integer
 *                 minimum: 1
 *                 description: Number of faculty members
 *                 example: 25
 *               languages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Languages of instruction
 *                 example: ["English", "Spanish"]
 *               socialMedia:
 *                 type: object
 *                 properties:
 *                   facebook:
 *                     type: string
 *                     format: uri
 *                     example: "https://facebook.com/techexcellence"
 *                   twitter:
 *                     type: string
 *                     format: uri
 *                     example: "https://twitter.com/techexcellence"
 *                   linkedin:
 *                     type: string
 *                     format: uri
 *                     example: "https://linkedin.com/company/techexcellence"
 *                   instagram:
 *                     type: string
 *                     format: uri
 *                     example: "https://instagram.com/techexcellence"
 *           example:
 *             institutionName: "Tech Excellence Institute"
 *             institutionType: "training_center"
 *             email: "contact@techexcellence.edu"
 *             phone: "+1-555-123-4567"
 *             website: "https://www.techexcellence.edu"
 *             address: "123 Education Street, Tech District"
 *             city: "San Francisco"
 *             state: "California"
 *             country: "United States"
 *             postalCode: "94105"
 *             focusAreas: ["Software Development", "Data Science", "Cybersecurity"]
 *             description: "Leading provider of cutting-edge technology education with hands-on, industry-relevant programs."
 *             accreditation: ["ACCET Accredited", "ISO 9001:2015 Certified"]
 *             establishedYear: 2010
 *             studentCapacity: 500
 *             facultyCount: 25
 *             languages: ["English"]
 *             socialMedia:
 *               facebook: "https://facebook.com/techexcellence"
 *               linkedin: "https://linkedin.com/company/techexcellence"
 *     responses:
 *       201:
 *         description: Training provider profile created successfully
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
 *                   example: "Training provider profile created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     profileId:
 *                       type: string
 *                       example: "64f456def789abc123456789"
 *                     institutionName:
 *                       type: string
 *                       example: "Tech Excellence Institute"
 *                     institutionType:
 *                       type: string
 *                       example: "training_center"
 *                     status:
 *                       type: string
 *                       example: "pending_verification"
 *                     profileImageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/talentbridge/image/upload/v1234567890/schools/logo_abc123.jpg"
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
 *         description: Validation error - Invalid or missing required fields
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
 *                         example: "institutionName"
 *                       message:
 *                         type: string
 *                         example: "Institution name is required and must be at least 3 characters"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - School role required
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
 *                   example: "Access denied. Only users with school role can create training provider profiles"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       409:
 *         description: Profile already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: "Training provider profile already exists for this user"
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
 *                   example: "Profile image file size exceeds 5MB limit"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
schoolRouter.post('/profile', requestLogger, verifyJWT, authorizeRoles('school'),upload.single('profileImage'), createProfile);


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
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
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
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
schoolRouter.get(
  '/match-students',
  requestLogger,
  verifyJWT,
  authorizeRoles('school'),
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
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
 *                   items:
 *                     $ref: '#/components/schemas/Student'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginationInfo'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
 * /api/v1/schools/employers-directory:
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
schoolRouter.get('/employers-directory', requestLogger, verifyJWT, authorizeRoles('school'), employerDirectory);

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

// =============================================
// PARAMETRIC ID ROUTES (MUST BE AT END)
// =============================================

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/School'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
schoolRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('school'), updateTrainingProviderStatus);

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
schoolRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('school'), deleteTrainingProvider);

// Export the router
export default schoolRouter;
