import express from "express";
import {
    uploadDocs,
    updatePersonalInfo,
    submitInitialKYC,
    addDocuments,
    getAllKYCDocs,
    getKYCById,
    getMyKYC,
    verifyKYC,
    updateKYCDocs,
    deleteKYC
} from '../controllers/kyc.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';
import { upload } from "../middlewares/Multer.middlewares.js";
const kycRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     KYCDocument:
 *       type: object
 *       required:
 *         - docType
 *         - docUrl
 *       properties:
 *         docType:
 *           type: string
 *           enum: ["addressProof", "govtId", "electricityBill", "bankStatement", "educationalCertificates", "other"]
 *           example: "addressProof"
 *         docUrl:
 *           type: string
 *           example: "https://cloudinary.com/image.jpg"
 *     KYC:
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
 *         documents:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/KYCDocument'
 *         status:
 *           type: string
 *           enum: ["pending", "verified", "rejected"]
 *           example: "pending"
 *         verifiedAt:
 *           type: string
 *           format: date-time
 *         verifiedBy:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *             fullName:
 *               type: string
 *         rejectionReason:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/kyc/initial:
 *   post:
 *     summary: Submit initial KYC information
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - fullLegalName
 *               - dateOfBirth
 *               - documents
 *             properties:
 *               fullLegalName:
 *                 type: string
 *                 example: "John Doe"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               nationalInsuranceNumber:
 *                 type: string
 *                 example: "AB123456C"
 *               educationalQualifications:
 *                 type: string
 *                 description: JSON string of educational qualifications array
 *                 example: '[{"level":"Bachelors Degree","institution":"University","year":2020}]'
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 minItems: 1
 *     responses:
 *       201:
 *         description: Initial KYC information submitted successfully
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Unauthorized
 */
kycRouter.post('/initial', requestLogger, verifyJWT, 
    upload.fields([
    { name: "addressProof", maxCount: 1 },
    { name: "govtId", maxCount: 1 },
    { name: "electricityBill", maxCount: 1 },
    { name: "bankStatement", maxCount: 1 },
    { name: "educationalCertificates", maxCount: 1 },
  ])
, submitInitialKYC);


/**
 * @swagger
 * /api/v1/kyc/documents:
 *   post:
 *     summary: Add additional documents to KYC
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: Additional documents added successfully
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Unauthorized
 */
kycRouter.post('/documents', requestLogger, verifyJWT, upload.array('documents', 10), addDocuments);

/**
 * @swagger
 * /api/v1/kyc:
 *   get:
 *     summary: Get all KYC documents (Admin only)
 *     tags: [KYC]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: ["pending", "verified", "rejected"]
 *         description: Filter by verification status
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "-createdAt"
 *         description: Sort field and order
 *     responses:
 *       200:
 *         description: KYC documents retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
kycRouter.get('/', requestLogger, verifyJWT, authorizeRoles('admin'), getAllKYCDocs);

/**
 * @swagger
 * /api/v1/kyc/my:
 *   get:
 *     summary: Get current user's KYC status
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KYC retrieved successfully
 *       404:
 *         description: No KYC record found
 *       401:
 *         description: Unauthorized
 */
kycRouter.get('/my', requestLogger, verifyJWT, getMyKYC);

/**
 * @swagger
 * /api/v1/kyc/{id}:
 *   get:
 *     summary: Get KYC by ID
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KYC ID
 *     responses:
 *       200:
 *         description: KYC retrieved successfully
 *       404:
 *         description: KYC not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
kycRouter.get('/:id', requestLogger, verifyJWT, getKYCById);

/**
 * @swagger
 * /api/v1/kyc/{id}/verify:
 *   patch:
 *     summary: Verify or reject KYC (Admin only)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KYC ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["verified", "rejected"]
 *                 example: "verified"
 *               rejectionReason:
 *                 type: string
 *                 description: Required when status is 'rejected'
 *                 example: "Document quality is poor"
 *     responses:
 *       200:
 *         description: KYC verification status updated
 *       400:
 *         description: Invalid status or missing rejection reason
 *       404:
 *         description: KYC not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
kycRouter.patch('/:id/verify', requestLogger, verifyJWT, authorizeRoles('admin'), verifyKYC);

/**
 * @swagger
 * /api/v1/kyc/{id}:
 *   put:
 *     summary: Update KYC documents
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KYC ID (will be ignored, uses current user's KYC)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/KYCDocument'
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: KYC documents updated successfully
 *       400:
 *         description: Invalid document data or cannot update verified KYC
 *       404:
 *         description: KYC not found
 *       401:
 *         description: Unauthorized
 */
kycRouter.put('/:id', requestLogger, verifyJWT, updateKYCDocs);

/**
 * @swagger
 * /api/v1/kyc/upload-docs:
 *   post:
 *     summary: Upload documents to existing KYC
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - documents
 *             properties:
 *               documents:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/KYCDocument'
 *                 minItems: 1
 *     responses:
 *       200:
 *         description: Documents uploaded successfully
 *       400:
 *         description: Invalid document data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KYC record not found
 */
kycRouter.post('/upload-docs', requestLogger, verifyJWT, uploadDocs);

/**
 * @swagger
 * /api/v1/kyc/personal-info:
 *   put:
 *     summary: Update personal information in KYC
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullLegalName
 *               - dateOfBirth
 *             properties:
 *               fullLegalName:
 *                 type: string
 *                 example: "John Doe"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               nationalInsuranceNumber:
 *                 type: string
 *                 example: "AB123456C"
 *               educationalQualifications:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     level:
 *                       type: string
 *                       enum: ["High School Diploma/Gcse", "A-Levels", "Bachelors Degree", "Masters Degree", "Professional Diploma", "Trade Certificate", "Other"]
 *                     institution:
 *                       type: string
 *                     year:
 *                       type: number
 *     responses:
 *       200:
 *         description: Personal information updated successfully
 *       400:
 *         description: Invalid data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: KYC record not found
 */
kycRouter.put('/personal-info', requestLogger, verifyJWT, updatePersonalInfo);

/**
 * @swagger
 * /api/v1/kyc/{id}:
 *   delete:
 *     summary: Delete KYC record (Admin only)
 *     tags: [KYC]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: KYC ID
 *     responses:
 *       200:
 *         description: KYC record deleted successfully
 *       404:
 *         description: KYC not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 */
kycRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteKYC);

export default kycRouter;
