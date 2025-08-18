import express from "express";
import {
    createExperience,
    getAllExperiences,
    getExperienceById,
    updateExperience,
    deleteExperience,
    searchExperiences,
    getExperiencesByCompany
} from '../controllers/experience.controller.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const experienceRouter = express.Router();

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

/**
 * @swagger
 * /api/v1/experiences:
 *   post:
 *     summary: Create a new experience
 *     tags: [Experiences]
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
 *       400:
 *         description: Invalid data or date validation error
 *       401:
 *         description: Unauthorized
 */
experienceRouter.post('/', requestLogger, verifyJWT, createExperience);

/**
 * @swagger
 * /api/v1/experiences:
 *   get:
 *     summary: Get all experiences
 *     tags: [Experiences]
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
 *         name: company
 *         schema:
 *           type: string
 *         description: Filter by company name (case-insensitive partial match)
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filter by job title (case-insensitive partial match)
 *       - in: query
 *         name: isCurrentJob
 *         schema:
 *           type: boolean
 *         description: Filter by current job status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-startDate"
 *         description: Sort field and order
 *       - in: query
 *         name: select
 *         schema:
 *           type: string
 *         description: Fields to select (comma-separated)
 *     responses:
 *       200:
 *         description: Experiences retrieved successfully
 *       401:
 *         description: Unauthorized
 */
experienceRouter.get('/', requestLogger, verifyJWT, authorizeRoles('admin'), getAllExperiences);

/**
 * @swagger
 * /api/v1/experiences/search:
 *   get:
 *     summary: Search experiences
 *     tags: [Experiences]
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
 *       400:
 *         description: Search query too short
 *       401:
 *         description: Unauthorized
 */
experienceRouter.get('/search', requestLogger, verifyJWT, searchExperiences);

/**
 * @swagger
 * /api/v1/experiences/company/{company}:
 *   get:
 *     summary: Get experiences by company
 *     tags: [Experiences]
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
 *       400:
 *         description: Company name too short
 *       401:
 *         description: Unauthorized
 */
experienceRouter.get('/company/:company', requestLogger, verifyJWT, getExperiencesByCompany);

/**
 * @swagger
 * /api/v1/experiences/{id}:
 *   get:
 *     summary: Get experience by ID
 *     tags: [Experiences]
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
 *         description: Experience retrieved successfully
 *       404:
 *         description: Experience not found
 *       400:
 *         description: Invalid experience ID
 *       401:
 *         description: Unauthorized
 */
experienceRouter.get('/:id', requestLogger, verifyJWT, getExperienceById);

/**
 * @swagger
 * /api/v1/experiences/{id}:
 *   put:
 *     summary: Update experience
 *     tags: [Experiences]
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
 *       400:
 *         description: Invalid data or date validation error
 *       404:
 *         description: Experience not found
 *       401:
 *         description: Unauthorized
 */
experienceRouter.put('/:id', requestLogger, verifyJWT, updateExperience);

/**
 * @swagger
 * /api/v1/experiences/{id}:
 *   delete:
 *     summary: Delete experience
 *     tags: [Experiences]
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
experienceRouter.delete('/:id', requestLogger, verifyJWT, deleteExperience);

export default experienceRouter;
