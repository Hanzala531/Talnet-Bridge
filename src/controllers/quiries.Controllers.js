import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, internalServer } from "../utils/ApiError.js";
import { successResponse, badRequestResponse } from "../utils/ApiResponse.js";
import { sendEmail } from "../services/email.service.js";
// @desc    Handle contact form submission and send email
// @route   POST /api/v1/quiries/contact
// @access  Public
export const contactFormController = asyncHandler(async (req, res) => {
  const { email, name, subject="Quiery", text, html } = req.body;

  if (!email || !name || !subject || !text) {
    return res.status(400).json(badRequestResponse("All required fields must be provided"));
  }

  const result = await sendEmail({ email, name, subject, text, html});

  if (result.success) {
    return res.status(200).json(successResponse(null, "Your inquiry has been received. We'll get back to you soon."));
  } else {
    throw internalServer(result.error || "Failed to send email");
  }
});


