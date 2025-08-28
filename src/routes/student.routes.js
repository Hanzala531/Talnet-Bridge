import express from "express";
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';
import { upload } from '../middlewares/Multer.middlewares.js'
import {
    createStudentProfile,
    getAllStudents,
    getStudentById,
    getMyStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    addCertification,
    profileConpletion,
    addSkills,
    removeSkill,
    addResult,
    updatePrivacySettings,
    updateCommunicationPreferences,
    getPrivacySettings,
    getCommunicationPreferences,
    getStudentDashboard,
    getCurrentlyEnrolledCourses
} from '../controllers/student.controller.js';
import {
    createExperience,
    getExperienceById,
    updateExperience,
    deleteExperience,
    searchExperiences,
    getExperiencesByCompany
} from '../controllers/experience.controller.js';
import {
    createCertification,
    getAllCertifications,
    getCertificationById,
    updateCertification,
    deleteCertification,
    searchCertifications,
    getCertificationsByIssuer
} from '../controllers/certification.controller.js';

const studentRouter = express.Router();

// =============================================
// =============================================
// STUDENT PROFILE ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students:
 *   post:
 *     summary: Create student profile
 *     description: Create a new student profile with personal information. Required for students to access platform features.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Student's first name
 *                 example: "Ahmed"
 *               lastName:
 *                 type: string
 *                 description: Student's last name
 *                 example: "Ali"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Student's email address
 *                 example: "ahmed.ali@example.com"
 *               phone:
 *                 type: string
 *                 description: Student's phone number
 *                 example: "03001234567"
 *               bio:
 *                 type: string
 *                 description: Short biography/description
 *                 example: "Computer Science student passionate about web development"
 *               location:
 *                 type: string
 *                 description: Student's location
 *                 example: "Karachi, Pakistan"
 *               website:
 *                 type: string
 *                 format: url
 *                 description: Personal website or portfolio URL
 *                 example: "https://ahmed-portfolio.com"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of student's skills
 *                 example: ["JavaScript", "React", "Node.js", "MongoDB"]
 *           example:
 *             firstName: "Ahmed"
 *             lastName: "Ali"
 *             email: "ahmed.ali@example.com"
 *             phone: "03001234567"
 *             bio: "Computer Science student passionate about web development"
 *             location: "Karachi, Pakistan"
 *             website: "https://ahmed-portfolio.com"
 *             skills: ["JavaScript", "React", "Node.js", "MongoDB"]
 *     responses:
 *       201:
 *         description: Student profile created successfully
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
 *                   example: "Student profile created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     studentId:
 *                       type: string
 *                       example: "64f123abc456def789012345"
 *                     userId:
 *                       type: string
 *                       example: "64f789abc123def456789012"
 *                     firstName:
 *                       type: string
 *                       example: "Ahmed"
 *                     lastName:
 *                       type: string
 *                       example: "Ali"
 *                     email:
 *                       type: string
 *                       example: "ahmed.ali@example.com"
 *                     phone:
 *                       type: string
 *                       example: "03001234567"
 *                     bio:
 *                       type: string
 *                       example: "Computer Science student passionate about web development"
 *                     location:
 *                       type: string
 *                       example: "Karachi, Pakistan"
 *                     website:
 *                       type: string
 *                       example: "https://ahmed-portfolio.com"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
studentRouter.post('/', requestLogger, verifyJWT, authorizeRoles('student'), createStudentProfile);

/**
 * @swagger
 * /api/v1/students:
 *   get:
 *     summary: Get all students (Admin only)
 *     tags: [Students]
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
 *         description: Number of records per page
 *       - in: query
 *         name: fullName
 *         schema:
 *           type: string
 *         description: Filter by user's full name (case-insensitive partial match)
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *         description: Filter by user's email (case-insensitive partial match)
 *       - in: query
 *         name: phone
 *         schema:
 *           type: string
 *         description: Filter by user's phone number (case-insensitive partial match)
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["active", "inactive", "suspended"]
 *         description: Filter by user status
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by student location (case-insensitive partial match)
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Filter by skills (comma-separated)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *         description: Sort field and order
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: Fields to select (comma-separated)
 *     responses:
 *       200:
 *         description: Students retrieved successfully
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
 *                     students:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Student'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 message:
 *                   type: string
 *                   example: "Students retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 */
studentRouter.get('/', requestLogger, verifyJWT, authorizeRoles('admin'), getAllStudents);

/**
 * @swagger
 * /api/v1/students/my:
 *   get:
 *     summary: Get current user's student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Student profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/my', requestLogger, verifyJWT, authorizeRoles('student'), getMyStudentProfile);

/**
 * @swagger
 * /api/v1/students/profile/completion:
 *   get:
 *     summary: Get current student's profile completion percentage
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile completion percentage and steps
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
 *                     percent:
 *                       type: number
 *                       example: 60
 *                     steps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Basic info completed", "KYC verification completed"]
 *                     studentId:
 *                       type: string
 *                       example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *                     userId:
 *                       type: string
 *                       example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *                 message:
 *                   type: string
 *                   example: "Profile completion calculated"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/profile/completion', requestLogger, verifyJWT, authorizeRoles('student'), profileConpletion);

/**
 * @swagger
 * /api/v1/students/gsce-result:
 *   post:
 *     summary: Add or update GSCE results for the authenticated student
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gsceResult
 *             properties:
 *               gsceResult:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GSCEResult'
 *     responses:
 *       200:
 *         description: GSCE results updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.post('/gsce-result', requestLogger, verifyJWT, authorizeRoles('student'), addResult);

// =============================================
// EXPERIENCE ROUTES (Student-related)
// =============================================

/**
 * @swagger
 * /api/v1/students/experiences:
 *   post:
 *     summary: Create a new experience for current student
 *     description: Add work experience to the authenticated student's profile
 *     tags: [Student Experiences]
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
 *               - company
 *               - startDate
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Job title or position held
 *                 example: "Software Engineer"
 *               company:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Company or organization name
 *                 example: "Google"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 description: Employment start date (YYYY-MM-DD)
 *                 example: "2022-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 description: Employment end date (YYYY-MM-DD). Leave empty if current job
 *                 example: "2023-06-30"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Job description, responsibilities, and achievements
 *                 example: "Developed web applications using React and Node.js. Led a team of 3 developers and improved application performance by 40%."
 *               location:
 *                 type: string
 *                 maxLength: 100
 *                 description: Job location (city, country)
 *                 example: "San Francisco, CA"
 *               employmentType:
 *                 type: string
 *                 enum: ["full-time", "part-time", "contract", "internship", "freelance"]
 *                 description: Type of employment
 *                 example: "full-time"
 *           example:
 *             title: "Software Engineer"
 *             company: "Google"
 *             startDate: "2022-01-15"
 *             endDate: "2023-06-30"
 *             description: "Developed web applications using React and Node.js. Led a team of 3 developers and improved application performance by 40%."
 *             location: "San Francisco, CA"
 *             employmentType: "full-time"
 *     responses:
 *       201:
 *         description: Experience created successfully
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
 *                   example: "Experience created successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     experienceId:
 *                       type: string
 *                       example: "64f0f4f4f4f4f4f4f4f4f4f4"
 *                     title:
 *                       type: string
 *                       example: "Software Engineer"
 *                     company:
 *                       type: string
 *                       example: "Google"
 *                     startDate:
 *                       type: string
 *                       format: date
 *                       example: "2022-01-15"
 *                     endDate:
 *                       type: string
 *                       format: date
 *                       example: "2023-06-30"
 *                     isCurrentJob:
 *                       type: boolean
 *                       example: false
 *                     duration:
 *                       type: string
 *                       example: "1 year 5 months"
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
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
studentRouter.post('/experiences', requestLogger, verifyJWT, authorizeRoles('student'), createExperience);

/**
 * @swagger
 * /api/v1/students/experiences/search:
 *   get:
 *     summary: Search experiences
 *     tags: [Student Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Experience'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.get('/experiences/search', requestLogger, verifyJWT, authorizeRoles('student'), searchExperiences);

/**
 * @swagger
 * /api/v1/students/experiences/company/{company}:
 *   get:
 *     summary: Get experiences by company
 *     tags: [Student Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: company
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Company name
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
 *           maximum: 100
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Experiences by company retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Experience'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.get('/experiences/company/:company', requestLogger, verifyJWT, authorizeRoles('student'), getExperiencesByCompany);

/**
 * @swagger
 * /api/v1/students/experiences/my:
 *   get:
 *     summary: Get experience by user ID
 *     tags: [Student Experiences]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Experience retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/experiences/my', requestLogger, verifyJWT, authorizeRoles('student'), getExperienceById);

/**
 * @swagger
 * /api/v1/students/experiences/{id}:
 *   put:
 *     summary: Update experience
 *     tags: [Student Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Experience ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Experience'
 *     responses:
 *       200:
 *         description: Experience updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.put('/experiences/:id', requestLogger, verifyJWT, authorizeRoles('student'), updateExperience);

/**
 * @swagger
 * /api/v1/students/experiences/{id}:
 *   delete:
 *     summary: Delete experience
 *     tags: [Student Experiences]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Experience ID
 *     responses:
 *       200:
 *         description: Experience deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.delete('/experiences/:id', requestLogger, verifyJWT, authorizeRoles('student'), deleteExperience);

// =============================================
// CERTIFICATION ROUTES (Student-related)
// =============================================

/**
 * @swagger
 * /api/v1/students/certifications:
 *   post:
 *     summary: Create a new certification for current student
 *     tags: [Student Certifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - issuedBy
 *             properties:
 *               name:
 *                 type: string
 *                 example: "AWS Certified Solutions Architect"
 *               issuedBy:
 *                 type: string
 *                 example: "Amazon Web Services"
 *               issueDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-06-15"
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload (JPG, PNG, GIF, WEBP)
 *     responses:
 *       201:
 *         description: Certification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
studentRouter.post('/certifications', requestLogger, verifyJWT, authorizeRoles('student'), upload.single('image'), createCertification);

/**
 * @swagger
 * /api/v1/students/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Student Certifications]
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
 *           default: 20
 *           maximum: 100
 *         description: Number of records per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by certification name
 *       - in: query
 *         name: issuedBy
 *         schema:
 *           type: string
 *         description: Filter by issuer
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "name"
 *         description: Sort field and order
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: Fields to select (comma-separated)
 *     responses:
 *       200:
 *         description: Certifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certification'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.get('/certifications', requestLogger, verifyJWT, authorizeRoles('student'), getAllCertifications);

/**
 * @swagger
 * /api/v1/students/certifications/search:
 *   get:
 *     summary: Search certifications
 *     tags: [Student Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Search query (minimum 2 characters)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.get('/certifications/search', requestLogger, verifyJWT, authorizeRoles('student'), searchCertifications);

/**
 * @swagger
 * /api/v1/students/certifications/issuer/{issuer}:
 *   get:
 *     summary: Get certifications by issuer
 *     tags: [Student Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: issuer
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 2
 *         description: Issuer name
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
 *           maximum: 100
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Certifications by issuer retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Certification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.get('/certifications/issuer/:issuer', requestLogger, verifyJWT, authorizeRoles('student'), getCertificationsByIssuer);

/**
 * @swagger
 * /api/v1/students/certifications/{id}:
 *   get:
 *     summary: Get certification by ID
 *     tags: [Student Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certification ID
 *     responses:
 *       200:
 *         description: Certification retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/certifications/:id', requestLogger,verifyJWT , authorizeRoles('student'),  getCertificationById);

/**
 * @swagger
 * /api/v1/students/certifications/{id}:
 *   put:
 *     summary: Update certification (Admin only)
 *     tags: [Student Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Certification'
 *     responses:
 *       200:
 *         description: Certification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.put('/certifications/:id', requestLogger, verifyJWT, authorizeRoles('admin'), updateCertification);

/**
 * @swagger
 * /api/v1/students/certifications/{id}:
 *   delete:
 *     summary: Delete certification (Admin only)
 *     tags: [Student Certifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Certification ID
 *     responses:
 *       200:
 *         description: Certification deleted successfully
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
studentRouter.delete('/certifications/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteCertification);

// =============================================
// ADDITIONAL ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students/skills:
 *   post:
 *     summary: Add skills to student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["JavaScript", "React", "Node.js"]
 *     responses:
 *       200:
 *         description: Skills added successfully
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
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
studentRouter.post('/skills', requestLogger, verifyJWT, addSkills);

/**
 * @swagger
 * /api/v1/students/skills/{skill}:
 *   delete:
 *     summary: Remove a skill from the authenticated student's profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: skill
 *         required: true
 *         schema:
 *           type: string
 *         description: Skill name to remove
 *         example: "Java"
 *     responses:
 *       200:
 *         description: Skill removed successfully
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
studentRouter.delete('/skills/:skill', requestLogger, verifyJWT, removeSkill);

// =============================================
// PRIVACY SETTINGS ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students/privacy-settings:
 *   get:
 *     summary: Get student privacy settings
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Privacy settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Privacy settings retrieved successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     isPublic:
 *                       type: boolean
 *                       description: Whether profile is public
 *                     isOpenToWork:
 *                       type: boolean
 *                       description: Whether student is open to work opportunities
 *                     isContactPublic:
 *                       type: boolean
 *                       description: Whether contact information is public
 *                     isProgressPublic:
 *                       type: boolean
 *                       description: Whether learning progress is public
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/privacy-settings', requestLogger, verifyJWT, authorizeRoles('student'), getPrivacySettings);

/**
 * @swagger
 * /api/v1/students/privacy-settings:
 *   put:
 *     summary: Update student privacy settings
 *     description: Update privacy preferences for student profile visibility and contact information
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPublic:
 *                 type: boolean
 *                 description: Whether profile should be public to other users
 *                 example: true
 *               isOpenToWork:
 *                 type: boolean
 *                 description: Whether student is open to work opportunities and job offers
 *                 example: true
 *               isContactPublic:
 *                 type: boolean
 *                 description: Whether contact information (email, phone) should be public
 *                 example: false
 *               isProgressPublic:
 *                 type: boolean
 *                 description: Whether learning progress and achievements should be public
 *                 example: true
 *           example:
 *             isPublic: true
 *             isOpenToWork: true
 *             isContactPublic: false
 *             isProgressPublic: true
 *     responses:
 *       200:
 *         description: Privacy settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Privacy settings updated successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     isPublic:
 *                       type: boolean
 *                       example: true
 *                     isOpenToWork:
 *                       type: boolean
 *                       example: true
 *                     isContactPublic:
 *                       type: boolean
 *                       example: false
 *                     isProgressPublic:
 *                       type: boolean
 *                       example: true
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
studentRouter.put('/privacy-settings', requestLogger, verifyJWT, authorizeRoles('student'), updatePrivacySettings);

// =============================================
// COMMUNICATION PREFERENCES ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students/communication-preferences:
 *   get:
 *     summary: Get student communication preferences
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Communication preferences retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Communication preferences retrieved successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     isCourseRecomendations:
 *                       type: boolean
 *                       description: Whether to receive course recommendations
 *                     isMarketingCommunications:
 *                       type: boolean
 *                       description: Whether to receive marketing communications
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/communication-preferences', requestLogger, verifyJWT, authorizeRoles('student'), getCommunicationPreferences);

/**
 * @swagger
 * /api/v1/students/communication-preferences:
 *   put:
 *     summary: Update student communication preferences
 *     description: Update notification and communication preferences for various student activities
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailNotifications:
 *                 type: boolean
 *                 description: Whether to receive email notifications for important updates
 *                 example: true
 *               pushNotifications:
 *                 type: boolean
 *                 description: Whether to receive push notifications on mobile/web
 *                 example: true
 *               smsNotifications:
 *                 type: boolean
 *                 description: Whether to receive SMS notifications for urgent matters
 *                 example: false
 *               jobAlerts:
 *                 type: boolean
 *                 description: Whether to receive notifications about new job opportunities
 *                 example: true
 *               courseUpdates:
 *                 type: boolean
 *                 description: Whether to receive notifications about course updates and announcements
 *                 example: true
 *               marketingEmails:
 *                 type: boolean
 *                 description: Whether to receive promotional and marketing emails
 *                 example: false
 *               weeklyDigest:
 *                 type: boolean
 *                 description: Whether to receive weekly summary digest emails
 *                 example: true
 *           example:
 *             emailNotifications: true
 *             pushNotifications: true
 *             smsNotifications: false
 *             jobAlerts: true
 *             courseUpdates: true
 *             marketingEmails: false
 *             weeklyDigest: true
 *     responses:
 *       200:
 *         description: Communication preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Communication preferences updated successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     emailNotifications:
 *                       type: boolean
 *                       example: true
 *                     pushNotifications:
 *                       type: boolean
 *                       example: true
 *                     smsNotifications:
 *                       type: boolean
 *                       example: false
 *                     jobAlerts:
 *                       type: boolean
 *                       example: true
 *                     courseUpdates:
 *                       type: boolean
 *                       example: true
 *                     marketingEmails:
 *                       type: boolean
 *                       example: false
 *                     weeklyDigest:
 *                       type: boolean
 *                       example: true
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
studentRouter.put('/communication-preferences', requestLogger, verifyJWT, authorizeRoles('student'), updateCommunicationPreferences);

// =============================================
// DASHBOARD AND ENROLLED COURSES ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students/dashboard:
 *   get:
 *     summary: Get student dashboard data
 *     description: Retrieve dashboard statistics including total courses enrolled, completed courses, currently enrolled courses, and active courses for the authenticated student.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
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
 *                   example: "Dashboard data retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalCoursesEnrolled:
 *                       type: number
 *                       description: Total number of courses the student has enrolled in
 *                       example: 15
 *                     completedCourses:
 *                       type: number
 *                       description: Number of courses completed by the student
 *                       example: 8
 *                     currentlyEnrolled:
 *                       type: number
 *                       description: Number of courses currently enrolled (enrolled or in-progress)
 *                       example: 5
 *                     activeCourses:
 *                       type: number
 *                       description: Number of currently enrolled courses that are active/approved
 *                       example: 4
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
studentRouter.get('/dashboard', requestLogger, verifyJWT, authorizeRoles('student'), getStudentDashboard);

/**
 * @swagger
 * /api/v1/students/currently-enrolled:
 *   get:
 *     summary: Get currently enrolled courses
 *     description: Retrieve all courses in which the authenticated student is currently enrolled (enrolled or in-progress status) with complete course details.
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Currently enrolled courses retrieved successfully
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
 *                   example: "5 currently enrolled courses retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       enrollmentId:
 *                         type: string
 *                         description: Unique enrollment ID
 *                         example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *                       enrollmentDate:
 *                         type: string
 *                         format: date-time
 *                         description: Date when student enrolled in the course
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       enrollmentStatus:
 *                         type: string
 *                         enum: [enrolled, in-progress]
 *                         description: Current enrollment status
 *                         example: "in-progress"
 *                       course:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *                           title:
 *                             type: string
 *                             description: Course title
 *                             example: "Advanced JavaScript Development"
 *                           instructor:
 *                             type: string
 *                             description: Instructor name
 *                             example: "John Doe"
 *                           instructorPicture:
 *                             type: string
 *                             description: Instructor profile picture URL
 *                             example: "https://example.com/instructor.jpg"
 *                           duration:
 *                             type: string
 *                             description: Course duration
 *                             example: "8 weeks"
 *                           price:
 *                             type: number
 *                             description: Course price
 *                             example: 299.99
 *                           language:
 *                             type: string
 *                             description: Course language
 *                             example: "English"
 *                           type:
 *                             type: string
 *                             description: Course type
 *                             example: "Online"
 *                           objectives:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Course objectives
 *                             example: ["Master advanced JavaScript concepts", "Build real-world applications"]
 *                           description:
 *                             type: string
 *                             description: Course description
 *                             example: "Comprehensive course covering advanced JavaScript topics"
 *                           skills:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Skills to be learned
 *                             example: ["JavaScript", "Node.js", "React"]
 *                           category:
 *                             type: string
 *                             description: Course category
 *                             example: "Programming"
 *                           status:
 *                             type: string
 *                             description: Course approval status
 *                             example: "approved"
 *                           coverImage:
 *                             type: string
 *                             description: Course cover image URL
 *                             example: "https://example.com/course-cover.jpg"
 *                           currentEnrollments:
 *                             type: number
 *                             description: Number of current enrollments
 *                             example: 45
 *                           maxEnrollments:
 *                             type: number
 *                             description: Maximum allowed enrollments
 *                             example: 100
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2023-12-01T08:00:00.000Z"
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2024-01-10T14:30:00.000Z"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
studentRouter.get('/currently-enrolled', requestLogger, verifyJWT, authorizeRoles('student'), getCurrentlyEnrolledCourses);

// =============================================
// PARAMETRIC ID ROUTES (MUST BE AT END)
// =============================================

/**
 * @swagger
 * /api/v1/students/{id}:
 *   get:
 *     summary: Get student by ID
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.get('/:id', requestLogger, verifyJWT, authorizeRoles('school'), getStudentById);

/**
 * @swagger
 * /api/v1/students/{id}:
 *   delete:
 *     summary: Delete student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student profile deleted successfully
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
studentRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteStudentProfile);

/**
 * @swagger
 * /api/v1/students/{id}/certifications:
 *   post:
 *     summary: Add certification to student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - certificationId
 *             properties:
 *               certificationId:
 *                 type: string
 *                 example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *     responses:
 *       200:
 *         description: Certification added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
studentRouter.post('/:id/certifications', requestLogger, verifyJWT, addCertification);

// =============================================
// EXPORT ROUTER
// =============================================
export default studentRouter;
