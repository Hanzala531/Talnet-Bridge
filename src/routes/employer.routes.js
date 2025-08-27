import express from "express";
import {
    creatCompanyProfile,
    getAllCompanies,
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
 *               - companyName
 *               - companySize
 *               - industry
 *             properties:
 *               companyName:
 *                 type: string
 *                 description: Company or organization name
 *                 example: "TechCorp Solutions"
 *               companyDescription:
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
 *               website:
 *                 type: string
 *                 format: url
 *                 description: Company website URL
 *                 example: "https://techcorp.com"
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: "456 Business Avenue"
 *                   city:
 *                     type: string
 *                     example: "Karachi"
 *                   state:
 *                     type: string
 *                     example: "Sindh"
 *                   country:
 *                     type: string
 *                     example: "Pakistan"
 *                   postalCode:
 *                     type: string
 *                     example: "75600"
 *               establishedYear:
 *                 type: integer
 *                 minimum: 1800
 *                 maximum: 2025
 *                 description: Year company was established
 *                 example: 2015
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
employerRouter.get('/:id', requestLogger, getCompanyById);

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   put:
 *     summary: Update company details
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               companySize:
 *                 type: string
 *               industry:
 *                 type: string
 *     responses:
 *       200:
 *         description: Company profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Employer'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
employerRouter.put('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), updateCompanyDetails);

/**
 * @swagger
 * /api/v1/employers/{id}:
 *   delete:
 *     summary: Delete company profile and related jobs
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
 *     responses:
 *       200:
 *         description: Company profile and related jobs deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
employerRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), deleteCompanyProfile);

export default employerRouter;