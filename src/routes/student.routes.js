import express from "express";

// ===== MIDDLEWARE IMPORTS =====
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';
import { upload } from '../middlewares/Multer.middlewares.js'
// ===== CONTROLLER IMPORTS =====
// Student Controllers
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
    addResult
} from '../controllers/student.controller.js';

// Experience Controllers
import {
    createExperience,
    getAllExperiences,
    getExperienceById,
    updateExperience,
    deleteExperience,
    searchExperiences,
    getExperiencesByCompany
} from '../controllers/experience.controller.js';

// Certification Controllers
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
// SWAGGER SCHEMAS DEFINITIONS
// =============================================



// =============================================
// =============================================
// STUDENT PROFILE ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students:
 *   post:
 *     summary: Create student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       201:
 *         description: Student profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 */
studentRouter.post('/', requestLogger, verifyJWT,authorizeRoles('student'), createStudentProfile);

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
studentRouter.get('/my', requestLogger, verifyJWT,authorizeRoles('student'), getMyStudentProfile);

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
studentRouter.get('/:id', requestLogger, verifyJWT,authorizeRoles('school'), getStudentById);
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
/**
 * @swagger
 * /api/v1/students/my:
 *   put:
 *     summary: Update current user's student profile
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Student'
 *     responses:
 *       200:
 *         description: Student profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
*/
studentRouter.get('/profile/completion', requestLogger ,verifyJWT,authorizeRoles('student'), profileConpletion);




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
studentRouter.delete('/:id', requestLogger, verifyJWT,authorizeRoles('admin'), deleteStudentProfile);

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
studentRouter.post('/gsce-result', requestLogger, verifyJWT,authorizeRoles('student'), addResult);


/**
 * @swagger
 * components:
 *   schemas:
 *     Experience:
 *       type: object
 *       required:
 *         - title
 *         - company
 *         - startDate
 *       properties:
 *         _id:
 *           type: string
 *           example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *         title:
 *           type: string
 *           example: "Software Engineer"
 *         company:
 *           type: string
 *           example: "Google"
 *         startDate:
 *           type: string
 *           format: date
 *           example: "2022-01-15"
 *         endDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2023-06-30"
 *         description:
 *           type: string
 *           example: "Developed web applications using React and Node.js"
 *         isCurrentJob:
 *           type: boolean
 *           readOnly: true
 *           example: false
 *         duration:
 *           type: string
 *           readOnly: true
 *           example: "1 year 5 months"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

// =============================================
// EXPERIENCE ROUTES (Student-related)
// =============================================

/**
 * @swagger
 * /api/v1/students/experiences:
 *   post:
 *     summary: Create a new experience for current student
 *     tags: [Student Experiences]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Experience'
 *     responses:
 *       201:
 *         description: Experience created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
studentRouter.post('/experiences', requestLogger, verifyJWT,authorizeRoles('student'), createExperience);

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
studentRouter.get('/experiences/search', requestLogger, verifyJWT,authorizeRoles('student'), searchExperiences);

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
studentRouter.get('/experiences/company/:company', requestLogger, verifyJWT,authorizeRoles('student'), getExperiencesByCompany);

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
studentRouter.get('/experiences/my', requestLogger, verifyJWT,authorizeRoles('student'), getExperienceById);

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
studentRouter.put('/experiences/:id', requestLogger, verifyJWT,authorizeRoles('student'), updateExperience);

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
studentRouter.delete('/experiences/:id', requestLogger, verifyJWT,authorizeRoles('student'), deleteExperience);

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
studentRouter.post('/certifications', requestLogger, verifyJWT,authorizeRoles('student'), upload.single('image') , createCertification);

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
studentRouter.get('/certifications', requestLogger,authorizeRoles('student'), getAllCertifications);

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
studentRouter.get('/certifications/search', requestLogger,authorizeRoles('student'), searchCertifications);

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
studentRouter.get('/certifications/issuer/:issuer', requestLogger,verifyJWT , authorizeRoles('student'),  getCertificationsByIssuer);

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
// EXPORT ROUTER
// =============================================
export default studentRouter;
