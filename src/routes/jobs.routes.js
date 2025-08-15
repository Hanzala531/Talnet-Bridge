import express from "express";
import {
    getAllJobs,
    getJobById,
    createJobPost,
    updateJobPost,
    deleteJobPost
} from '../controllers/jobs.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const jobsRouter = express.Router();

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get all job posts
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Jobs fetched successfully
 *       404:
 *         description: No jobs found
 */
jobsRouter.get('/', requestLogger, getAllJobs);

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get a job by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job fetched successfully
 *       404:
 *         description: Job not found
 */
jobsRouter.get('/:id', requestLogger, getJobById);

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job post
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jobTitle
 *               - department
 *               - location
 *               - employmentType
 *               - jobDescription
 *               - category
 *             properties:
 *               jobTitle:
 *                 type: string
 *                 example: "Software Engineer"
 *               department:
 *                 type: string
 *                 example: "Engineering"
 *               location:
 *                 type: string
 *                 example: "Lahore"
 *               employmentType:
 *                 type: string
 *                 enum: ["Full-time", "Part-time", "Internship", "Contract"]
 *                 example: "Full-time"
 *               salary:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                     example: 50000
 *                   max:
 *                     type: number
 *                     example: 100000
 *                   currency:
 *                     type: string
 *                     example: "PKR"
 *               jobDescription:
 *                 type: string
 *                 example: "Develop and maintain web applications."
 *               skillsRequired:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     skill:
 *                       type: string
 *                       example: "JavaScript"
 *                     proficiency:
 *                       type: string
 *                       enum: ["Beginner", "Intermediate", "Advanced"]
 *                       example: "Intermediate"
 *               benefits:
 *                 type: string
 *                 example: "Health insurance, Flexible hours"
 *               category:
 *                 type: string
 *                 example: "Technology"
 *               applicationDeadline:
 *                 type: string
 *                 format: date
 *                 example: "2025-12-31"
 *     responses:
 *       201:
 *         description: Job created successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only employers can create jobs
 */
jobsRouter.post('/', requestLogger, verifyJWT, authorizeRoles('employer'), createJobPost);

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   put:
 *     summary: Update a job post
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               jobTitle:
 *                 type: string
 *               department:
 *                 type: string
 *               location:
 *                 type: string
 *               employmentType:
 *                 type: string
 *                 enum: ["Full-time", "Part-time", "Internship", "Contract"]
 *               salary:
 *                 type: object
 *                 properties:
 *                   min:
 *                     type: number
 *                   max:
 *                     type: number
 *                   currency:
 *                     type: string
 *               jobDescription:
 *                 type: string
 *               skillsRequired:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     skill:
 *                       type: string
 *                     proficiency:
 *                       type: string
 *                       enum: ["Beginner", "Intermediate", "Advanced"]
 *               benefits:
 *                 type: string
 *               category:
 *                 type: string
 *               applicationDeadline:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Job updated successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only the job creator can update
 */
jobsRouter.put('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), updateJobPost);

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   delete:
 *     summary: Delete a job post
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job deleted successfully
 *       404:
 *         description: Job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only the job creator can delete
 */
jobsRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), deleteJobPost);

export default jobsRouter;
