import express from "express";
import {
    createStudentProfile,
    getAllStudents,
    getStudentById,
    getMyStudentProfile,
    updateStudentProfile,
    deleteStudentProfile,
    addCertification,
    removeCertification
} from '../controllers/student.controller.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const studentRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     GSCEResult:
 *       type: object
 *       required:
 *         - subject
 *         - grade
 *       properties:
 *         subject:
 *           type: string
 *           example: "Mathematics"
 *         grade:
 *           type: string
 *           example: "A*"
 *     Student:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "60f0f4f4f4f4f4f4f4f4f4f4"
 *         userId:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             fullName:
 *               type: string
 *             email:
 *               type: string
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
 *         certifications:
 *           type: array
 *           items:
 *             type: string
 *         experience:
 *           type: array
 *           items:
 *             type: string
 *         gsceResult:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GSCEResult'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

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
 *               skills:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["JavaScript", "React", "Node.js"]
 *               gsceResult:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/GSCEResult'
 *     responses:
 *       201:
 *         description: Student profile created successfully
 *       400:
 *         description: Invalid data or profile already exists
 *       401:
 *         description: Unauthorized
 */
studentRouter.post('/', requestLogger, verifyJWT, createStudentProfile);

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
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (case-insensitive partial match)
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
studentRouter.get('/my', requestLogger, verifyJWT, getMyStudentProfile);

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
studentRouter.get('/:id', requestLogger, verifyJWT, getStudentById);

/**
 * @swagger
 * /api/v1/students/{id}:
 *   put:
 *     summary: Update student profile
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
 *             properties:
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
 *     responses:
 *       200:
 *         description: Student profile updated successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Student not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
studentRouter.put('/:id', requestLogger, verifyJWT, updateStudentProfile);

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
studentRouter.delete('/:id', requestLogger, verifyJWT, deleteStudentProfile);

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
 *       400:
 *         description: Invalid ID or certification already added
 *       404:
 *         description: Student not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
studentRouter.post('/:id/certifications', requestLogger, verifyJWT, addCertification);

/**
 * @swagger
 * /api/v1/students/{id}/certifications/{certId}:
 *   delete:
 *     summary: Remove certification from student profile
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
 *       - in: path
 *         name: certId
 *         required: true
 *         schema:
 *           type: string
 *         description: Certification ID
 *     responses:
 *       200:
 *         description: Certification removed successfully
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Student not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
studentRouter.delete('/:id/certifications/:certId', requestLogger, verifyJWT, removeCertification);

export default studentRouter;
