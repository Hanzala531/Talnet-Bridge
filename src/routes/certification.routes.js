import express from "express";
import {
    createCertification,
    getAllCertifications,
    getCertificationById,
    updateCertification,
    deleteCertification,
    searchCertifications,
    getCertificationsByIssuer
} from '../controllers/certification.controller.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const certificationRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
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

/**
 * @swagger
 * /api/v1/certifications:
 *   post:
 *     summary: Create a new certification
 *     tags: [Certifications]
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
 *               certificateFile:
 *                 type: string
 *                 example: "https://cloudinary.com/certificate.pdf"
 *     responses:
 *       201:
 *         description: Certification created successfully
 *       400:
 *         description: Invalid data or certification already exists
 *       401:
 *         description: Unauthorized
 */
certificationRouter.post('/', requestLogger, verifyJWT, createCertification);

/**
 * @swagger
 * /api/v1/certifications:
 *   get:
 *     summary: Get all certifications
 *     tags: [Certifications]
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
 */
certificationRouter.get('/', requestLogger, getAllCertifications);

/**
 * @swagger
 * /api/v1/certifications/search:
 *   get:
 *     summary: Search certifications
 *     tags: [Certifications]
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
 */
certificationRouter.get('/search', requestLogger, searchCertifications);

/**
 * @swagger
 * /api/v1/certifications/issuer/{issuer}:
 *   get:
 *     summary: Get certifications by issuer
 *     tags: [Certifications]
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
 *       400:
 *         description: Issuer name too short
 */
certificationRouter.get('/issuer/:issuer', requestLogger, getCertificationsByIssuer);

/**
 * @swagger
 * /api/v1/certifications/{id}:
 *   get:
 *     summary: Get certification by ID
 *     tags: [Certifications]
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
 *       404:
 *         description: Certification not found
 *       400:
 *         description: Invalid certification ID
 */
certificationRouter.get('/:id', requestLogger, getCertificationById);

/**
 * @swagger
 * /api/v1/certifications/{id}:
 *   put:
 *     summary: Update certification
 *     tags: [Certifications]
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
 *       400:
 *         description: Invalid data or certification already exists
 *       404:
 *         description: Certification not found
 *       401:
 *         description: Unauthorized
 */
certificationRouter.put('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), updateCertification);

/**
 * @swagger
 * /api/v1/certifications/{id}:
 *   delete:
 *     summary: Delete certification (Admin only)
 *     tags: [Certifications]
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
certificationRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteCertification);

export default certificationRouter;
