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

/**
 * @swagger
 * components:
 *   schemas:
 *     Student:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *         userId:
 *           type: string
 *           example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *         bio:
 *           type: string
 *           example: "Passionate about technology and learning"
 *         location:
 *           type: string
 *           example: "Lahore, Pakistan"
 *         website:
 *           type: string
 *           example: "https://myportfolio.com"
 *         skills:
 *           type: array
 *           items:
 *             type: string
 *           example: ["JavaScript", "React", "Node.js"]
 *         gsceResult:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GSCEResult'
 *         certifications:
 *           type: array
 *           items:
 *             type: string
 *         experience:
 *           type: array
 *           items:
 *             type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     
 *     GSCEResult:
 *       type: object
 *       required:
 *         - subject
 *         - marks
 *         - grade
 *       properties:
 *         subject:
 *           type: string
 *           example: "Mathematics"
 *         marks:
 *           type: string
 *           example: "85"
 *         grade:
 *           type: string
 *           example: "A"
 *     
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
 *     
 *     Certification:
 *       type: object
 *       required:
 *         - name
 *         - issuedBy
 *       properties:
 *         _id:
 *           type: string
 *           example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *         name:
 *           type: string
 *           example: "AWS Certified Solutions Architect"
 *         issuedBy:
 *           type: string
 *           example: "Amazon Web Services"
 *         issueDate:
 *           type: string
 *           format: date
 *           example: "2023-06-15"
 *         certificateFile:
 *           type: string
 *           example: "https://cloudinary.com/certificate.pdf"
 *         extracted:
 *           type: boolean
 *           default: false
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

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
 *             type: object
 *             properties:
 *               bio:
 *                 type: string
 *                 example: "Passionate about technology and learning"
 *               location:
 *                 type: string
 *                 example: "Lahore, Pakistan"
 *               website:
 *                 type: string
 *                 example: "https://myportfolio.com"
 *     responses:
 *       201:
 *         description: Student profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Student'
 *       400:
 *         description: Invalid data or profile already exists
 *       401:
 *         description: Unauthorized
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
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           fullName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           role:
 *                             type: string
 *                           status:
 *                             type: string
 *                           studentInfo:
 *                             type: object
 *                             description: Student profile info if student-specific filters applied
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                 message:
 *                   type: string
 *                   example: "Students retrieved successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
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
 *       404:
 *         description: Student profile not found
 *       401:
 *         description: Unauthorized
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
 *       404:
 *         description: Student not found
 *       401:
 *         description: Unauthorized
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
 *         description: Unauthorized
 *       404:
 *         description: Student profile not found
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
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 example: "+923001234567"
 *               userName:
 *                 type: string
 *                 example: "johndoe"
 *               bio:
 *                 type: string
 *                 example: "Updated bio"
 *               location:
 *                 type: string
 *                 example: "Karachi, Pakistan"
 *               website:
 *                 type: string
 *                 example: "https://newportfolio.com"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Python", "Django", "PostgreSQL"]
 *               gsceResult:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GSCEResult'
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: ["male", "female", "other"]
 *               country:
 *                 type: string
 *                 example: "Pakistan"
 *               nationality:
 *                 type: string
 *                 example: "Pakistani"
 *     responses:
 *       200:
 *         description: Student profile updated successfully
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
 *                   description: Complete student profile with user data merged
 *                 message:
 *                   type: string
 *                   example: "Student profile updated successfully"
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Student profile not found
 *       401:
 *         description: Unauthorized
*/
studentRouter.get('/profile/completion', requestLogger,authorizeRoles('student'), verifyJWT, profileConpletion);

/**
 * @swagger
 * /api/v1/students/update:
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
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 example: "+923001234567"
 *               userName:
 *                 type: string
 *                 example: "johndoe"
 *               bio:
 *                 type: string
 *                 example: "Updated bio"
 *               location:
 *                 type: string
 *                 example: "Karachi, Pakistan"
 *               website:
 *                 type: string
 *                 example: "https://newportfolio.com"
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Python", "Django", "PostgreSQL"]
 *               gsceResult:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GSCEResult'
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *               gender:
 *                 type: string
 *                 enum: ["male", "female", "other"]
 *               country:
 *                 type: string
 *                 example: "Pakistan"
 *               nationality:
 *                 type: string
 *                 example: "Pakistani"
 *     responses:
 *       200:
 *         description: Student profile updated successfully
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
 *                   description: Complete student profile with user data merged
 *                 message:
 *                   type: string
 *                   example: "Student profile updated successfully"
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Student profile not found
 *       401:
 *         description: Unauthorized
*/
studentRouter.put('/update', requestLogger, verifyJWT,authorizeRoles('student'), updateStudentProfile);


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
 *       404:
 *         description: Student not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
*/
studentRouter.delete('/:id', requestLogger, verifyJWT,authorizeRoles('admin'), deleteStudentProfile);

// /**
//  * @swagger
//  * /api/v1/students/{id}/certifications:
//  *   post:
//  *     summary: Add certification to student profile
//  *     tags: [Students]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Student ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - certificationId
//  *             properties:
//  *               certificationId:
//  *                 type: string
//  *                 example: "60f0f4f4f4f4f4f4f4f4f4f4"
//  *     responses:
//  *       200:
//  *         description: Certification added successfully
//  *       400:
//  *         description: Invalid ID or certification already added
//  *       404:
//  *         description: Student not found
//  *       403:
//  *         description: Access denied
//  *       401:
//  *         description: Unauthorized
//  */
// studentRouter.post('/:id/certifications', requestLogger, verifyJWT, addCertification);

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
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   type: object
 *                   properties:
 *                     gsceResult:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/GSCEResult'
 *                 message:
 *                   type: string
 *                   example: "GSCE results updated successfully"
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
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
 *             type: object
 *             required:
 *               - title
 *               - company
 *               - startDate
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Software Engineer"
 *               company:
 *                 type: string
 *                 example: "Google"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2022-01-15"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: "2023-06-30"
 *               description:
 *                 type: string
 *                 example: "Developed web applications using React and Node.js"
 *     responses:
 *       201:
 *         description: Experience created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       400:
 *         description: Invalid data or date validation error
 *       401:
 *         description: Unauthorized
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
 *         description: Search query too short
 *       401:
 *         description: Unauthorized
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
 *         description: Company name too short
 *       401:
 *         description: Unauthorized
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
 *         schema:
 *           type: string
 *         description: Experience 
 *     responses:
 *       200:
 *         description: Experience retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       404:
 *         description: Experience not found
 *       400:
 *         description: Invalid experience ID
 *       401:
 *         description: Unauthorized
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
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Senior Software Engineer"
 *               company:
 *                 type: string
 *                 example: "Updated Company"
 *               startDate:
 *                 type: string
 *                 format: date
 *                 example: "2022-02-01"
 *               endDate:
 *                 type: string
 *                 format: date
 *                 nullable: true
 *                 example: null
 *               description:
 *                 type: string
 *                 example: "Updated description of responsibilities"
 *     responses:
 *       200:
 *         description: Experience updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Experience'
 *       400:
 *         description: Invalid data or date validation error
 *       404:
 *         description: Experience not found
 *       401:
 *         description: Unauthorized
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
 *       404:
 *         description: Experience not found
 *       401:
 *         description: Unauthorized
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
 *         application/json:
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
 *                 example: "certificate.jpg"
 *     responses:
 *       201:
 *         description: Certification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         description: Invalid data or certification already exists
 *       401:
 *         description: Unauthorized
 */
studentRouter.post('/certifications', requestLogger, verifyJWT,authorizeRoles('student'), upload.single('image') , createCertification);

/**
 * @swagger
 * /api/v1/students/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Student Certifications]
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
 */
studentRouter.get('/certifications', requestLogger,authorizeRoles('student'), getAllCertifications);

/**
 * @swagger
 * /api/v1/students/certifications/search:
 *   get:
 *     summary: Search certifications
 *     tags: [Student Certifications]
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
 *         description: Search query too short
 */
studentRouter.get('/certifications/search', requestLogger,authorizeRoles('student'), searchCertifications);

/**
 * @swagger
 * /api/v1/students/certifications/issuer/{issuer}:
 *   get:
 *     summary: Get certifications by issuer
 *     tags: [Student Certifications]
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
 *         description: Issuer name too short
 */
studentRouter.get('/certifications/issuer/:issuer', requestLogger,verifyJWT , authorizeRoles('student'),  getCertificationsByIssuer);

/**
 * @swagger
 * /api/v1/students/certifications/{id}:
 *   get:
 *     summary: Get certification by ID
 *     tags: [Student Certifications]
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
 *       404:
 *         description: Certification not found
 *       400:
 *         description: Invalid certification ID
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
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Updated Certification Name"
 *               issuedBy:
 *                 type: string
 *                 example: "Updated Issuer"
 *               issueDate:
 *                 type: string
 *                 format: date
 *                 example: "2023-07-20"
 *               certificateFile:
 *                 type: string
 *                 example: "https://cloudinary.com/new-certificate.pdf"
 *               extracted:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Certification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Certification'
 *       400:
 *         description: Invalid data or certification already exists
 *       404:
 *         description: Certification not found
 *       401:
 *         description: Unauthorized
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
 *       404:
 *         description: Certification not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
studentRouter.delete('/certifications/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteCertification);

// =============================================
// ADDITIONAL ROUTES
// =============================================

/**
 * @swagger
 * /api/v1/students/skills:
 *   post:
 *     summary: Add skills to the authenticated student's profile (merges with existing skills)
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
 *               - skills
 *             properties:
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Skills to add (will be merged, not replaced)
 *                 example: ["Node.js", "Express", "MongoDB"]
 *     responses:
 *       200:
 *         description: Skills updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: integer
 *                 message:
 *                   type: string
 *                 payload:
 *                   type: object
 *                   properties:
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
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
 *                     _id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                 message:
 *                   type: string
 *                   example: "Skills added successfully"
 *       400:
 *         description: Invalid data or skills already exist
 *       401:
 *         description: Unauthorized
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
 *                     skills:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["JavaScript", "React"]
 *                 message:
 *                   type: string
 *                   example: "Skill 'Java' removed successfully"
 *       400:
 *         description: Invalid skill
 *       404:
 *         description: Student or skill not found
 *       401:
 *         description: Unauthorized
 */
studentRouter.delete('/skills/:skill', requestLogger, verifyJWT, removeSkill);

// =============================================
// EXPORT ROUTER
// =============================================
export default studentRouter;
