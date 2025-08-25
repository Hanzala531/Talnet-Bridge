import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendEmail = async ({ email, name, subject, text, html }) => {
  // Email from student/user to the platform admin
  const mailOptions = {
    from: `"${name}" <${email}>`,
    to: process.env.GMAIL_USER,
    subject: `New Contact Form: ${subject}`,
    text: `
Name: ${name}
Email: ${email}
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
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f7fa; margin: 0; padding: 20px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; text-align: center; line-height: 60px; margin-bottom: 15px;">
                <span style="font-size: 24px;">📧</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Contact Submission</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">
                Received on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        
        <!-- Priority Alert -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
          <tr>
            <td style="text-align: center;">
              <span style="display: inline-block; background: #ff6b6b; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
                New Message Alert
              </span>
            </td>
          </tr>
        </table>

        <!-- User Information Card -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8faff; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 20px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                      <div style="width: 40px; height: 40px; background: #667eea; border-radius: 50%; color: white; text-align: center; line-height: 40px; font-weight: 600; margin-right: 10px; display: inline-block;">
                        ${name.charAt(0).toUpperCase()}
                      </div>
                      <h3 style="margin: 0; color: #2d3748; font-size: 18px;">Contact Information</h3>
                    </div>
                  </td>
                </tr>
              </table>
              
              <table cellpadding="5" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding: 8px 0; width: 30px;">
                    <span style="font-size: 16px;">👤</span>
                  </td>
                  <td style="padding: 8px 0;">
                    <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Full Name</div>
                    <div style="font-size: 15px; color: #2d3748; font-weight: 500;">${name}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="font-size: 16px;">✉️</span>
                  </td>
                  <td style="padding: 8px 0;">
                    <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Email Address</div>
                    <div><a href="mailto:${email}" style="color: #667eea; text-decoration: none; font-size: 15px;">${email}</a></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0;">
                    <span style="font-size: 16px;">📋</span>
                  </td>
                  <td style="padding: 8px 0;">
                    <div style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Subject</div>
                    <div style="font-size: 15px; color: #2d3748; font-weight: 500;">${subject}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
        
        <!-- Message Content -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border: 1px solid #e2e8f0; border-radius: 8px;">
          <tr>
            <td style="background: #667eea; padding: 15px; border-radius: 8px 8px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <span style="display: inline-block; width: 30px; height: 30px; background: rgba(255,255,255,0.2); border-radius: 6px; text-align: center; line-height: 30px; margin-right: 10px;">💬</span>
                    <span style="color: #ffffff; font-size: 16px; font-weight: 600;">Message Content</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px; background: #f7fafc;">
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${text.replace(/\n/g, '<br>')}</p>
            </td>
          </tr>
        </table>
        
        <!-- Action Button -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 25px;">
          <tr>
            <td style="text-align: center;">
              <a href="mailto:${email}?subject=Re: ${subject}" style="display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px;">
                Reply to ${name}
              </a>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 5px; color: #718096; font-size: 13px;">Talent Bridge Contact Form</p>
        <p style="margin: 0; color: #a0aec0; font-size: 12px;">This message was sent via your contact form</p>
      </td>
    </tr>
    
  </table>
</body>
</html>
`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email received from ${email}`);
    
    // Generic confirmation email back to the student/user
    const confirmationOptions = {
      from: `"Talent Bridge" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "Thank you for contacting us",
      text: `
Dear ${name},

Thank you for reaching out to us through our contact form. 

We have successfully received your message and our team will review it shortly. You can expect to hear back from us within 24-48 hours.

If you have any urgent concerns or additional questions, please feel free to reply to this email.

Best regards,
Talent Bridge Team
`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank You - Message Received</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f7fa; margin: 0; padding: 20px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); padding: 30px; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); width: 60px; height: 60px; border-radius: 50%; text-align: center; line-height: 60px; margin-bottom: 15px;">
                <span style="font-size: 24px;">✅</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Talent Bridge</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Thank you for reaching out</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td style="padding: 30px;">
        
        <!-- Thank you message -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
          <tr>
            <td style="text-align: center;">
              <h2 style="color: #2d3748; margin: 0 0 10px; font-size: 22px;">Thank You, ${name}!</h2>
              <p style="color: #4a5568; font-size: 16px; margin: 0;">We've successfully received your message</p>
            </td>
          </tr>
        </table>

        <!-- Status confirmation -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f0fff4; border: 1px solid #48bb78; border-radius: 8px; margin-bottom: 20px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <div style="margin-bottom: 10px;">
                <span style="display: inline-block; background: #48bb78; width: 40px; height: 40px; border-radius: 50%; color: white; text-align: center; line-height: 40px; font-size: 18px;">📬</span>
              </div>
              <h3 style="margin: 0 0 8px; color: #2f855a; font-size: 16px;">Message Received Successfully</h3>
              <p style="margin: 0; color: #38a169; font-size: 14px;">Our team will review your inquiry and respond within 24-48 hours</p>
            </td>
          </tr>
        </table>
        
        <!-- Details -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
          <tr>
            <td width="50%" style="padding: 10px; text-align: center; background: #f7fafc; border-radius: 6px;">
              <div style="font-size: 20px; margin-bottom: 5px;">📅</div>
              <div style="font-size: 11px; color: #718096; text-transform: uppercase; margin-bottom: 3px;">Date</div>
              <div style="font-size: 14px; color: #2d3748; font-weight: 600;">${new Date().toLocaleDateString()}</div>
            </td>
            <td width="50%" style="padding: 10px; text-align: center; background: #f7fafc; border-radius: 6px;">
              <div style="font-size: 20px; margin-bottom: 5px;">🕐</div>
              <div style="font-size: 11px; color: #718096; text-transform: uppercase; margin-bottom: 3px;">Time</div>
              <div style="font-size: 14px; color: #2d3748; font-weight: 600;">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
            </td>
          </tr>
        </table>

        <!-- Reference number -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #edf2f7; border-radius: 6px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 15px; text-align: center;">
              <div style="font-size: 11px; color: #718096; text-transform: uppercase; margin-bottom: 5px;">Reference Number</div>
              <div style="font-size: 18px; color: #4a5568; font-weight: 700; font-family: monospace;">#${Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
            </td>
          </tr>
        </table>
        
        <!-- Generic message -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 25px;">
          <tr>
            <td>
              <p style="color: #4a5568; font-size: 15px; line-height: 1.6; text-align: center; margin: 0;">
                Thank you for reaching out to us through our contact form. We have successfully received your message and our team will review it shortly. If you have any urgent concerns or additional questions, please feel free to reply to this email.
              </p>
            </td>
          </tr>
        </table>
        
        <!-- CTA Button -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align: center;">
              <a href="https://youreducationplatform.com" style="display: inline-block; background: #667eea; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 600; font-size: 14px; margin-right: 10px;">
                Visit Our Platform
              </a>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 5px; color: #4a5568; font-size: 14px; font-weight: 600;">Talent Bridge</p>
        <p style="margin: 0 0 10px; color: #718096; font-size: 13px;">Empowering minds, transforming futures</p>
        <p style="margin: 0; color: #a0aec0; font-size: 12px;">© ${new Date().getFullYear()} Talent Bridge. All rights reserved.</p>
      </td>
    </tr>
    
  </table>
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