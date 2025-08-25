import { Router } from "express";
import { registerAdmin } from "../controllers/admin.Controller.js";
import { requestLogger } from "../middlewares/ReqLog.middlewares.js";

const adminRouter = Router();

/**
 * @swagger
 * /api/v1/admin/registerAdmin:
 *   post:
 *     summary: Register a new admin
 *     description: Create a new admin user account (internal use only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Admin User"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "StrongPassword123!"
 *     responses:
 *       201:
 *         description: Admin registered successfully
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
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "Admin registered successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     admin:
 *                       type: object
 *                       example:
 *                         _id: "68ac075a03b1574c514c9fa1"
 *                         fullName: "Admin User"
 *                         email: "admin@example.com"
 *                         role: "admin"
 *                         createdAt: "2025-08-25T06:48:58.537Z"
 *                         updatedAt: "2025-08-25T06:48:58.537Z"
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       409:
 *         description: Admin already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
adminRouter.post('/registerAdmin' , requestLogger , registerAdmin)

export default adminRouter