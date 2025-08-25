import express from "express";
import {
    contactFormController
} from  '../controllers/quiries.Controllers.js'
import { requestLogger } from "../middlewares/ReqLog.middlewares.js";


const emailRouter = express.Router()
/**
 * @swagger
 * /api/v1/email/contact:
 *   post:
 *     summary: Send a contact/inquiry email
 *     description: Submits a contact form and sends an email to the platform admin. Also sends a confirmation email to the user.
 *     tags: [Email]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - subject
 *               - text
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "student@example.com"
 *               name:
 *                 type: string
 *                 example: "Student Name"
 *               subject:
 *                 type: string
 *                 example: "Inquiry about course enrollment"
 *               text:
 *                 type: string
 *                 example: "I would like to know more about the available courses."
 *               html:
 *                 type: string
 *                 example: "<p>I would like to know more about the available courses.</p>"
 *     responses:
 *       200:
 *         description: Inquiry received and emails sent successfully
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
 *                 message:
 *                   type: string
 *                   example: "Your inquiry has been received. We'll get back to you soon."
 *       400:
 *         description: Missing required fields
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
emailRouter.post('/contact', requestLogger, contactFormController);


export default emailRouter