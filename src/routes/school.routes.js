import express from "express";
import {
    getProfile,
    editProfile,
    getAllTrainingProviders,
    getTrainingProviderById,
    updateTrainingProviderStatus,
    deleteTrainingProvider,
    searchTrainingProviders,
    getTrainingProviderStats
} from '../controllers/school.controllers.js';
import { requestLogger } from '../middlewares/ReqLog.middlewares.js';
import { verifyJWT } from '../middlewares/Auth.middlewares.js';
import { authorizeRoles } from '../middlewares/Role.middlewares.js';

const schoolRouter = express.Router();

/**
 * @swagger
 * /api/v1/schools:
 *   get:
 *     summary: Get all training providers
 *     tags: [Training Providers]
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
 *         description: Number of providers per page
 *       - in: query
 *         name: focusArea
 *         schema:
 *           type: string
 *         description: Filter by focus area
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by city/location
 *     responses:
 *       200:
 *         description: List of training providers retrieved successfully
 *       404:
 *         description: No training providers found
 */
schoolRouter.get('/', requestLogger, getAllTrainingProviders);

/**
 * @swagger
 * /api/v1/schools/search:
 *   get:
 *     summary: Search training providers
 *     tags: [Training Providers]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: Search query
 *       - in: query
 *         name: focusArea
 *         schema:
 *           type: string
 *         description: Filter by focus area
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *         description: Filter by city
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 */
schoolRouter.get('/search', requestLogger, searchTrainingProviders);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   get:
 *     summary: Get own training provider profile
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Training provider only
 *       404:
 *         description: Profile not found
 */
schoolRouter.get('/profile', requestLogger, verifyJWT, authorizeRoles('school'), getProfile);

/**
 * @swagger
 * /api/v1/schools/profile:
 *   put:
 *     summary: Update own training provider profile
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               about:
 *                 type: string
 *                 example: "Leading technology training institute"
 *               established:
 *                 type: string
 *                 format: date
 *                 example: "2015-01-01"
 *               focusAreas:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Web Development", "Data Science", "AI/ML"]
 *               location:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     example: "123 Training Street"
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
 *                     example: "75000"
 *               contact:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                     example: "+92-300-1234567"
 *                   email:
 *                     type: string
 *                     example: "info@traininginstitute.com"
 *                   website:
 *                     type: string
 *                     example: "https://traininginstitute.com"
 *               accreditation:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["ISO 9001", "NVQL Certified"]
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 */
schoolRouter.put('/profile', requestLogger, verifyJWT, authorizeRoles('school'), editProfile);

/**
 * @swagger
 * /api/v1/schools/stats:
 *   get:
 *     summary: Get own training provider statistics
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Training provider only
 */
schoolRouter.get('/stats', requestLogger, verifyJWT, authorizeRoles('school'), getTrainingProviderStats);

/**
 * @swagger
 * /api/v1/schools/{id}:
 *   get:
 *     summary: Get training provider by ID
 *     tags: [Training Providers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
 *     responses:
 *       200:
 *         description: Training provider retrieved successfully
 *       404:
 *         description: Training provider not found
 */
schoolRouter.get('/:id', requestLogger, getTrainingProviderById);

/**
 * @swagger
 * /api/v1/schools/{id}/status:
 *   patch:
 *     summary: Update training provider status (Admin only)
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
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
 *                 enum: ["active", "inactive", "suspended"]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: Status updated successfully
 *       400:
 *         description: Invalid status value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Training provider not found
 */
schoolRouter.patch('/:id/status', requestLogger, verifyJWT, authorizeRoles('admin'), updateTrainingProviderStatus);

/**
 * @swagger
 * /api/v1/schools/{id}:
 *   delete:
 *     summary: Delete training provider (Admin only)
 *     tags: [Training Providers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Training provider ID
 *     responses:
 *       200:
 *         description: Training provider deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Training provider not found
 */
schoolRouter.delete('/:id', requestLogger, verifyJWT, authorizeRoles('admin'), deleteTrainingProvider);

// Export the router
export default schoolRouter;
