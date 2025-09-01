import express from "express";
import {
    contactFormController
} from  '../controllers/quiries.Controllers.js'
import { requestLogger } from "../middlewares/ReqLog.middlewares.js";
import { sendAutomatedEmails } from '../cronJobs/emailCron.js';


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

/**
 * @swagger
 * /api/v1/email/test:
 *   post:
 *     summary: Send test automated emails
 *     description: Manually triggers the sending of automated test emails.
 *     tags: [Email]
 *     responses:
 *       200:
 *         description: Test emails sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Test emails sent successfully."
 *       500:
 *         description: Failed to send test emails
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to send test emails."
 *                 error:
 *                   type: string
 *                   example: "Detailed error message"
 */
emailRouter.post('/test', async (req, res) => {
  try {
    await sendAutomatedEmails();
    res.status(200).json({ message: 'Test emails sent successfully.' });
  } catch (error) {
    console.error('Error sending test emails:', error);
    res.status(500).json({ message: 'Failed to send test emails.', error: error.message });
  }
});


export default emailRouter