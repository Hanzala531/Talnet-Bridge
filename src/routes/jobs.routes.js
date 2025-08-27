import express from "express";
import {
    getAllJobs,
    getJobById,
    createJobPost,
    updateJobPost,
    deleteJobPost,
    searchJobs,
    getMyJobs,
    updateJobStatus
} from '../controllers/jobs.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';
import { jobsCache, invalidateUserCache } from '../middlewares/redis.middlewares.js';

const jobsRouter = express.Router();

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get all job posts with pagination and filtering
 *     description: Retrieve a paginated list of active job posts with optional filtering by location, employment type, and category
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 20
 *         description: Number of jobs per page (max 50)
 *         example: 20
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by job location
 *         example: "Lahore"
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *           enum: ["Full-time", "Part-time", "Internship", "Contract"]
 *         description: Filter by employment type
 *         example: "Full-time"
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by job category
 *         example: "Technology"
 *       - in: query
 *         name: salaryMin
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum salary filter
 *         example: 50000
 *       - in: query
 *         name: salaryMax
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum salary filter
 *         example: 150000
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
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
 *                     jobs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Job'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 message:
 *                   type: string
 *                   example: "Jobs retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
jobsRouter.get('/', requestLogger, jobsCache, getAllJobs);

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get a job by ID
 *     description: Retrieve detailed information about a specific job posting including company details and requirements
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job unique identifier
 *         example: "64f789abc123def456789012"
 *     responses:
 *       200:
 *         description: Job retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
jobsRouter.get('/:id', requestLogger, jobsCache, getJobById);

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job post
 *     description: Create a new job posting (Only available to verified employers)
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
 *               - applicationDeadline
 *             properties:
 *               jobTitle:
 *                 type: string
 *                 description: Job position title
 *                 example: "Senior Software Engineer"
 *               department:
 *                 type: string
 *                 description: Department or team
 *                 example: "Engineering"
 *               location:
 *                 type: string
 *                 description: Job location (city/remote)
 *                 example: "Lahore"
 *               employmentType:
 *                 type: string
 *                 enum: ["Full-time", "Part-time", "Internship", "Contract"]
 *                 description: Type of employment
 *                 example: "Full-time"
 *               salary:
 *                 type: object
 *                 description: Salary range information
 *                 properties:
 *                   min:
 *                     type: number
 *                     description: Minimum salary
 *                     example: 80000
 *                   max:
 *                     type: number
 *                     description: Maximum salary
 *                     example: 150000
 *                   currency:
 *                     type: string
 *                     description: Currency code
 *                     example: "PKR"
 *               jobDescription:
 *                 type: string
 *                 description: Detailed job description and responsibilities
 *                 example: "We are looking for a Senior Software Engineer to join our team. You will be responsible for developing scalable web applications, mentoring junior developers, and contributing to architectural decisions."
 *               skillsRequired:
 *                 type: array
 *                 description: Required skills and proficiency levels
 *                 items:
 *                   type: object
 *                   properties:
 *                     skill:
 *                       type: string
 *                       example: "JavaScript"
 *                     proficiency:
 *                       type: string
 *                       enum: ["Beginner", "Intermediate", "Advanced"]
 *                       example: "Advanced"
 *                 example: [
 *                   {"skill": "JavaScript", "proficiency": "Advanced"},
 *                   {"skill": "React", "proficiency": "Intermediate"},
 *                   {"skill": "Node.js", "proficiency": "Intermediate"}
 *                 ]
 *               benefits:
 *                 type: string
 *                 description: Job benefits and perks
 *                 example: "Health insurance, Flexible working hours, Remote work options, Professional development budget"
 *               category:
 *                 type: string
 *                 description: Job category
 *                 example: "Technology"
 *               applicationDeadline:
 *                 type: string
 *                 format: date
 *                 description: Application deadline (YYYY-MM-DD)
 *                 example: "2025-12-31"
 *     responses:
 *       201:
 *         description: Job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
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
jobsRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), deleteJobPost);

// Additional routes
/**
 * @swagger
 * /api/v1/jobs/search/advanced:
 *   get:
 *     summary: Search jobs with advanced filtering
 *     tags: [Jobs]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search term for job title, description, or company
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location filter
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Job category filter
 *       - in: query
 *         name: employmentType
 *         schema:
 *           type: string
 *         description: Employment type filter
 *       - in: query
 *         name: minSalary
 *         schema:
 *           type: number
 *         description: Minimum salary filter
 *       - in: query
 *         name: maxSalary
 *         schema:
 *           type: number
 *         description: Maximum salary filter
 *       - in: query
 *         name: skills
 *         schema:
 *           type: string
 *         description: Comma-separated skills filter
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
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
 *                     jobs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Job'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 message:
 *                   type: string
 *                   example: "Jobs retrieved successfully"
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
jobsRouter.get('/search/advanced', requestLogger, jobsCache, searchJobs);

/**
 * @swagger
 * /api/v1/jobs/my/posts:
 *   get:
 *     summary: Get jobs posted by current employer
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jobs retrieved successfully
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
 *                     jobs:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Job'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 message:
 *                   type: string
 *                   example: "Jobs retrieved successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
jobsRouter.get('/my/posts', requestLogger, verifyJWT, authorizeRoles('employer'), getMyJobs);

/**
 * @swagger
 * /api/v1/jobs/{id}/status:
 *   patch:
 *     summary: Update job status
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["active", "closed", "expired"]
 *     responses:
 *       200:
 *         description: Job status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Job'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
jobsRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('employer', 'admin'), updateJobStatus);

export default jobsRouter;
