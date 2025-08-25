import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendEmail = async ({ email, fullname, subject, text, html, phone }) => {
  // Email from student/user to the platform admin
  const mailOptions = {
    from: `"${fullname}" <${email}>`,
    to: process.env.GMAIL_USER,
    subject: `New Contact Form: ${subject}`,
    text: `
Name: ${fullname}
Email: ${email}
Phone: ${phone || 'Not provided'}
Subject: ${subject}

Message:
${text}
`,
    html: html || `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Contact Form Submission</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; background-color: #f4f6f8; margin: 0; padding: 0;">
  <div style="max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0077b6, #023e8a); padding: 25px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 500;">📩 New Contact Form Submission</h1>
      <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">Received on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 25px;">
      <!-- User Info -->
      <div style="background-color: #f9fbfd; border-radius: 8px; padding: 20px; margin-bottom: 20px; border-left: 5px solid #0077b6;">
        <h2 style="margin-top: 0; font-size: 18px; color: #0077b6; margin-bottom: 15px;">User Information</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; font-weight: bold; width: 100px;">Name:</td><td>${fullname}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Email:</td><td><a href="mailto:${email}" style="color: #0077b6;">${email}</a></td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Phone:</td><td>${phone || 'Not provided'}</td></tr>
          <tr><td style="padding: 8px 0; font-weight: bold;">Subject:</td><td>${subject}</td></tr>
        </table>
      </div>
      
      <!-- Message -->
      <div style="background: #fff; border: 1px solid #eaeaea; border-radius: 8px; padding: 20px;">
        <h3 style="margin-top: 0; font-size: 18px; color: #0077b6; margin-bottom: 15px;">Message</h3>
        <p style="color: #444; font-size: 15px;">${text.replace(/\n/g, '<br>')}</p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-top: 1px solid #eaeaea;">
      <p style="margin: 0; color: #777; font-size: 13px;">This message was sent via your Education Platform contact form.</p>
    </div>
  </div>
</body>
</html>
`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email received from ${email}`);
    
    // Confirmation email back to the student/user
    const confirmationOptions = {
      from: `"Education Platform" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Thank you for contacting us",
      text: `
Dear ${fullname},

Thank you for reaching out to us. We’ve received your inquiry and our team will get back to you shortly.

Best regards,
Education Platform Team
`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, sans-serif; line-height: 1.6; color: #333; background-color: #f4f6f8; margin: 0; padding: 0;">
  <div style="max-width: 650px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0077b6, #023e8a); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 26px;">Education Platform</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0; font-size: 14px;">Empowering Learning Everywhere</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 25px;">
      <h2 style="color: #0077b6; margin-top: 0; margin-bottom: 20px; text-align: center;">Thank You for Contacting Us</h2>
      
      <p>Dear ${fullname},</p>
      <p>We have received your inquiry regarding "<strong>${subject}</strong>". Our support team will get back to you soon, usually within 24–48 hours.</p>
      
      <!-- Info -->
      <div style="background-color: #f0f7ff; border-radius: 8px; padding: 15px 20px; margin: 20px 0; border-left: 4px solid #0077b6;">
        <p style="margin: 0; font-size: 14px; color: #333;"><strong>Date:</strong> ${new Date().toLocaleDateString()}<br><strong>Time:</strong> ${new Date().toLocaleTimeString()}<br><strong>Reference #:</strong> ${Math.random().toString(36).substring(2, 8).toUpperCase()}</p>
      </div>
      
      <p>If you have any additional questions, feel free to reply directly to this email.</p>
      
      <p style="margin-bottom: 0;">Best regards,</p>
      <p style="margin-top: 5px; font-weight: bold;">Education Platform Team</p>
      
      <!-- CTA -->
      <div style="text-align: center; margin: 30px 0 10px;">
        <a href="https://youreducationplatform.com" style="display: inline-block; background: #0077b6; color: white; text-decoration: none; padding: 12px 25px; border-radius: 6px; font-weight: 500;">Visit Our Platform</a>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eaeaea;">
      <p style="margin: 0; color: #777; font-size: 13px;">© ${new Date().getFullYear()} Education Platform. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`
    };
    
    await transporter.sendMail(confirmationOptions);
    console.log(`Confirmation email sent to ${email}`);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to process email for ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};
