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
jobsRouter.get('/', requestLogger, jobsCache, verifyJWT, authorizeRoles('school'), getAllJobs);

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job post
 *     description: Create a new job posting with detailed requirements and benefits (Only available to verified employers with active subscription)
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
 *                 minLength: 3
 *                 maxLength: 100
 *                 description: Job position title
 *                 example: "Senior Full Stack Developer"
 *               department:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 50
 *                 description: Department or team name
 *                 example: "Engineering"
 *               location:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: Job location (city, state, country or remote)
 *                 example: "Lahore, Pakistan / Remote"
 *               employmentType:
 *                 type: string
 *                 enum: ["Full-time", "Part-time", "Internship", "Contract", "Freelance"]
 *                 description: Type of employment arrangement
 *                 example: "Full-time"
 *               workMode:
 *                 type: string
 *                 enum: ["onsite", "remote", "hybrid"]
 *                 description: Work arrangement mode
 *                 example: "hybrid"
 *               experience:
 *                 type: object
 *                 description: Experience requirements
 *                 properties:
 *                   minimum:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 50
 *                     description: Minimum years of experience required
 *                     example: 3
 *                   maximum:
 *                     type: integer
 *                     minimum: 0
 *                     maximum: 50
 *                     description: Maximum years of experience (optional)
 *                     example: 7
 *                   level:
 *                     type: string
 *                     enum: ["entry", "junior", "mid", "senior", "lead", "executive"]
 *                     description: Experience level category
 *                     example: "senior"
 *               salary:
 *                 type: object
 *                 description: Compensation details
 *                 properties:
 *                   min:
 *                     type: number
 *                     minimum: 0
 *                     description: Minimum salary amount
 *                     example: 120000
 *                   max:
 *                     type: number
 *                     minimum: 0
 *                     description: Maximum salary amount
 *                     example: 180000
 *                   currency:
 *                     type: string
 *                     minLength: 3
 *                     maxLength: 3
 *                     description: ISO currency code
 *                     example: "PKR"
 *                   period:
 *                     type: string
 *                     enum: ["hourly", "monthly", "yearly"]
 *                     description: Salary period
 *                     example: "yearly"
 *                   negotiable:
 *                     type: boolean
 *                     description: Whether salary is negotiable
 *                     example: true
 *               jobDescription:
 *                 type: string
 *                 minLength: 100
 *                 maxLength: 5000
 *                 description: Comprehensive job description including responsibilities and requirements
 *                 example: "We are seeking a Senior Full Stack Developer to join our innovative engineering team. You will lead the development of scalable web applications, mentor junior developers, architect solutions, and drive technical excellence across multiple projects. This role offers the opportunity to work with cutting-edge technologies while building products that impact thousands of users."
 *               responsibilities:
 *                 type: array
 *                 items:
 *                   type: string
 *                   minLength: 10
 *                 minItems: 3
 *                 maxItems: 15
 *                 description: Key job responsibilities and duties
 *                 example: ["Design and develop scalable web applications using modern frameworks", "Lead code reviews and ensure adherence to best practices", "Mentor junior developers and provide technical guidance", "Collaborate with product managers and designers on feature development", "Optimize application performance and troubleshoot complex issues"]
 *               skillsRequired:
 *                 type: array
 *                 description: Required technical and soft skills with proficiency levels
 *                 items:
 *                   type: object
 *                   required:
 *                     - skill
 *                     - proficiency
 *                     - required
 *                   properties:
 *                     skill:
 *                       type: string
 *                       minLength: 2
 *                       description: Skill name
 *                       example: "React.js"
 *                     proficiency:
 *                       type: string
 *                       enum: ["Beginner", "Intermediate", "Advanced", "Expert"]
 *                       description: Required proficiency level
 *                       example: "Advanced"
 *                     required:
 *                       type: boolean
 *                       description: Whether this skill is mandatory
 *                       example: true
 *                     experience:
 *                       type: integer
 *                       minimum: 0
 *                       description: Years of experience with this skill
 *                       example: 3
 *                 example: [
 *                   {"skill": "JavaScript", "proficiency": "Advanced", "required": true, "experience": 5},
 *                   {"skill": "React.js", "proficiency": "Advanced", "required": true, "experience": 3},
 *                   {"skill": "Node.js", "proficiency": "Intermediate", "required": true, "experience": 2},
 *                   {"skill": "PostgreSQL", "proficiency": "Intermediate", "required": false, "experience": 1}
 *                 ]
 *               qualifications:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Educational and professional qualifications
 *                 example: ["Bachelor's degree in Computer Science or related field", "5+ years of full-stack development experience", "Experience with cloud platforms (AWS/Azure)"]
 *               benefits:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Job benefits, perks, and compensation details
 *                 example: ["Competitive salary with performance bonuses", "Comprehensive health insurance", "Flexible working hours and remote work options", "Professional development budget ($2000/year)", "Stock options", "Paid time off and sabbatical leave"]
 *               category:
 *                 type: string
 *                 minLength: 2
 *                 description: Job category or industry
 *                 example: "Technology"
 *               applicationDeadline:
 *                 type: string
 *                 format: date
 *                 description: Last date to apply (YYYY-MM-DD format)
 *                 example: "2025-12-31"
 *               applicationInstructions:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Special instructions for applicants
 *                 example: "Please include a portfolio link and cover letter explaining why you're interested in this role."
 *               numberOfPositions:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 100
 *                 description: Number of positions available
 *                 example: 2
 *               urgency:
 *                 type: string
 *                 enum: ["low", "medium", "high", "urgent"]
 *                 description: Hiring urgency level
 *                 example: "medium"
 *           example:
 *             jobTitle: "Senior Full Stack Developer"
 *             department: "Engineering"
 *             location: "Lahore, Pakistan / Remote"
 *             employmentType: "Full-time"
 *             workMode: "hybrid"
 *             experience:
 *               minimum: 3
 *               maximum: 7
 *               level: "senior"
 *             salary:
 *               min: 120000
 *               max: 180000
 *               currency: "PKR"
 *               period: "yearly"
 *               negotiable: true
 *             jobDescription: "We are seeking a Senior Full Stack Developer to join our innovative engineering team. You will lead the development of scalable web applications, mentor junior developers, and drive technical excellence."
 *             responsibilities: ["Design and develop scalable web applications", "Lead code reviews and ensure best practices", "Mentor junior developers", "Collaborate with product teams"]
 *             skillsRequired: [
 *               {"skill": "JavaScript", "proficiency": "Advanced", "required": true, "experience": 5},
 *               {"skill": "React.js", "proficiency": "Advanced", "required": true, "experience": 3}
 *             ]
 *             qualifications: ["Bachelor's degree in Computer Science", "5+ years of full-stack development experience"]
 *             benefits: ["Competitive salary with bonuses", "Health insurance", "Flexible working hours", "Professional development budget"]
 *             category: "Technology"
 *             applicationDeadline: "2025-12-31"
 *             applicationInstructions: "Please include portfolio link and cover letter"
 *             numberOfPositions: 2
 *             urgency: "medium"
 *     responses:
 *       201:
 *         description: Job posted successfully
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
 *                   example: "Job posted successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       example: "64f456def789abc123456789"
 *                     jobTitle:
 *                       type: string
 *                       example: "Senior Full Stack Developer"
 *                     department:
 *                       type: string
 *                       example: "Engineering"
 *                     status:
 *                       type: string
 *                       example: "active"
 *                     postedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-28T10:30:00.000Z"
 *                     applicationDeadline:
 *                       type: string
 *                       format: date
 *                       example: "2025-12-31"
 *                     applicationsCount:
 *                       type: integer
 *                       example: 0
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Validation error - Invalid request data
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
 *                         example: "jobTitle"
 *                       message:
 *                         type: string
 *                         example: "Job title is required and must be at least 3 characters"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Insufficient permissions or unverified employer
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
 *                   example: "Access denied. Only verified employers can post jobs"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       429:
 *         description: Rate limit exceeded or job posting limit reached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 429
 *                 message:
 *                   type: string
 *                   example: "Job posting limit exceeded for your current subscription plan"
 *                 success:
 *                   type: boolean
 *                   example: false
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
jobsRouter.get('/search/advanced', requestLogger, jobsCache, authorizeRoles('school', 'employer'), searchJobs);

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

// =============================================
// PARAMETRIC ID ROUTES (MUST BE AT END)
// =============================================

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get job by ID
 *     description: Get detailed information about a specific job posting
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *         example: "64f123abc456def789012345"
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
jobsRouter.get('/:id', requestLogger, jobsCache,authorizeRoles('school', 'employer'), getJobById);

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
jobsRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('employer'), updateJobStatus);

export default jobsRouter;
