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
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Acme Corp"
 *               companySize:
 *                 type: string
 *                 example: "100-500"
 *               industry:
 *                 type: string
 *                 example: "Technology"
 *               websiteLink:
 *                 type: string
 *                 example: "www.google.com" 
 *     responses:
 *       201:
 *         description: Employer profile created successfully
 *       400:
 *         description: Bad request
 */
employerRouter.post('/', requestLogger, verifyJWT, authorizeRoles('employer'), creatCompanyProfile);

/**
 * @swagger
 * /api/v1/employers:
 *   get:
 *     summary: Get all companies
 *     tags: [Employers]
 *     responses:
 *       200:
 *         description: Companies fetched successfully
 *       404:
 *         description: No companies found
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
 *       404:
 *         description: Company not found
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
 *       404:
 *         description: Company not found
 *       403:
 *         description: Forbidden
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
 *       404:
 *         description: Company not found
 *       403:
 *         description: Forbidden
 */
employerRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('employer'), deleteCompanyProfile);

export default employerRouter;