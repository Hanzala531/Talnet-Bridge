import express from "express";
import {
    creatCompanyProfile,
    getAllCompanies,
    getCompanyProfile,
    getCompanyById,
    updateCompanyDetails,
    deleteCompanyProfile
} from '../controllers/employer.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const employerRouter = express.Router();

/**
 * @swagger
 * /api/v1/employers:
 *   post:
 *     summary: Create a new company profile
 *     description: Create a new employer/company profile (Only available to users with employer role)
 *     tags: [Employers]
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
 *               - companySize
 *               - industry
 *               - websiteLink
 *             properties:
 *               name:
 *                 type: string
 *                 description: Company or organization name
 *                 example: "TechCorp Solutions"
 *               description:
 *                 type: string
 *                 description: Brief description of the company
 *                 example: "Leading software development company specializing in web and mobile applications"
 *               companySize:
 *                 type: string
 *                 enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
 *                 description: Company size range
 *                 example: "51-200"
 *               industry:
 *                 type: string
 *                 description: Industry sector
 *                 example: "Information Technology"
 *               websiteLink:
 *                 type: string
 *                 format: url
 *                 description: Company website URL
 *                 example: "https://techcorp.com"
 *               location:
 *                 type: string
 *                 description: Company location/address
 *                 example: "Karachi, Pakistan"
 *               establishedYear:
 *                 type: integer
 *                 minimum: 1800
 *                 maximum: 2025
 *                 description: Year company was established
 *                 example: 2015
 *               totalEmployees:
 *                 type: integer
 *                 minimum: 0
 *                 description: Total number of employees
 *                 example: 150
 *           example:
 *             name: "TechCorp Solutions"
 *             description: "Leading software development company specializing in web and mobile applications"
 *             companySize: "51-200"
 *             industry: "Information Technology"
 *             websiteLink: "https://techcorp.com"
 *             location: "Karachi, Pakistan"
 *             establishedYear: 2015
 *             totalEmployees: 150
 *     responses:
 *       201:
 *         description: Employer profile created successfully
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
 *       409:
 *         $ref: '#/components/responses/ConflictError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
employerRouter.post('/', requestLogger, verifyJWT, authorizeRoles('employer'), creatCompanyProfile);

/**
 * @swagger
 * /api/v1/employers:
 *   get:
 *     summary: Get all companies with pagination and filtering
 *     description: Retrieve a paginated list of verified company profiles with optional filtering
 *     tags: [Employers]
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
 *         description: Number of companies per page (max 50)
 *         example: 20
 *       - in: query
 *         name: industry
 *         schema:
 *           type: string
 *         description: Filter by industry sector
 *         example: "Information Technology"
 *       - in: query
 *         name: companySize
 *         schema:
 *           type: string
 *           enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
 *         description: Filter by company size
 *         example: "51-200"
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by company location (city)
 *         example: "Karachi"
 *     responses:
 *       200:
 *         description: Companies retrieved successfully
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
 *                     companies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Employer'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                 message:
 *                   type: string
 *                   example: "Companies retrieved successfully"
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
employerRouter.get('/', requestLogger, getAllCompanies);

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   get:
 *     summary: Get a company by ID
 *     tags: [Employers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employer'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
employerRouter.get('/', requestLogger, getAllCompanies);

/**
 * @swagger
 * /api/v1/employers/me:
 *   get:
 *     summary: Get my company profile
 *     description: Get the authenticated employer's company profile
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Company profile fetched successfully
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
 *                   example: "Company profile fetched successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                       example: "64f123abc456def789012345"
 *                     name:
 *                       type: string
 *                       example: "TechCorp Solutions"
 *                     description:
 *                       type: string
 *                       example: "Leading software development company"
 *                     companySize:
 *                       type: string
 *                       example: "51-200"
 *                     industry:
 *                       type: string
 *                       example: "Information Technology"
 *                     websiteLink:
 *                       type: string
 *                       example: "https://techcorp.com"
 *                     location:
 *                       type: string
 *                       example: "Karachi, Pakistan"
 *                     userId:
 *                       type: string
 *                       example: "64f789abc123def456789012"
 *                     userDetails:
 *                       type: object
 *                       properties:
 *                         fullName:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john@techcorp.com"
 *                         phone:
 *                           type: string
 *                           example: "03001234567"
 *                         profilePicture:
 *                           type: string
 *                           example: "https://example.com/profile.jpg"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
employerRouter.get('/me', requestLogger, verifyJWT, authorizeRoles('employer'), getCompanyProfile);

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   get:
 *     summary: Get a company by ID
 *     tags: [Employers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employer'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
/**
 * @swagger
 * /api/v1/employers/me:
 *   get:
 *     summary: Get employers own profile
 *     tags: [Employers]
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employer'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
employerRouter.get('/me', requestLogger, verifyJWT, authorizeRoles('employer'), getCompanyProfile);

// =============================================
// PARAMETRIC ID ROUTES (MUST BE AT END)
// =============================================

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   get:
 *     summary: Get company by ID
 *     tags: [Employers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *     responses:
 *       200:
 *         description: Company fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employer'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
employerRouter.get('/:id', requestLogger, getCompanyById);

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   put:
 *     summary: Update company details
 *     description: Update specific fields of a company profile. Only the company owner can update their profile.
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID
 *         example: "64f890abc123def456789013"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Company name
 *                 example: "TechCorp Solutions Updated"
 *               description:
 *                 type: string
 *                 description: Company description
 *                 example: "Updated description - Leading software development company specializing in web and mobile applications"
 *               companySize:
 *                 type: string
 *                 enum: ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"]
 *                 description: Company size range
 *                 example: "201-500"
 *               industry:
 *                 type: string
 *                 description: Industry sector
 *                 example: "Information Technology"
 *               websiteLink:
 *                 type: string
 *                 format: url
 *                 description: Company website URL
 *                 example: "https://updated-techcorp.com"
 *               location:
 *                 type: string
 *                 description: Company location
 *                 example: "Lahore, Pakistan"
 *               establishedYear:
 *                 type: integer
 *                 minimum: 1800
 *                 maximum: 2025
 *                 description: Year company was established
 *                 example: 2010
 *               totalEmployees:
 *                 type: integer
 *                 minimum: 0
 *                 description: Total number of employees
 *                 example: 250
 *           example:
 *             name: "TechCorp Solutions Updated"
 *             description: "Updated description - Leading software development company"
 *             companySize: "201-500"
 *             industry: "Information Technology"
 *             websiteLink: "https://updated-techcorp.com"
 *             location: "Lahore, Pakistan"
 *             establishedYear: 2010
 *             totalEmployees: 250
 *     responses:
 *       200:
 *         description: Company profile updated successfully
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
 *                   example: "Company profile updated successfully"
 *                 payload:
 *                   $ref: '#/components/schemas/Employer'
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
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
employerRouter.put('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), updateCompanyDetails);

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   delete:
 *     summary: Delete company profile and related jobs
 *     description: Permanently delete a company profile and all associated job postings. Only the company owner can delete their profile.
 *     tags: [Employers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Company ID to delete
 *         example: "64f890abc123def456789013"
 *     responses:
 *       200:
 *         description: Company profile and related jobs deleted successfully
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
 *                   example: "Company profile and related jobs deleted successfully"
 *                 payload:
 *                   type: null
 *                   example: null
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
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
employerRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), deleteCompanyProfile);

export default employerRouter;