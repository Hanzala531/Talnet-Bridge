import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendWelcomeEmail = async ({ email, name }) => {
  // Welcome email sent to new user
  const mailOptions = {
    from: `"Talent Bridge Team" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Welcome to Talent Bridge, ${name}! 🎉`,
    text: `
Hi ${name},

Welcome to Talent Bridge! We're thrilled to have you join our community.

Your account has been successfully created, and you're now ready to explore all the opportunities we have to offer.

Here's what you can do next:
• Complete your profile to get better matches
• Choose and pay for a subscription plan to unlock full access
• Access your dashboard and start exploring features
• Connect with other professionals and build your network

If you have any questions, don't hesitate to reach out to our support team.

Best regards,
The Talent Bridge Team
`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Talent Bridge</title>
  <style>
    /* Mobile responsiveness */
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 20px !important; }
      .header { padding: 20px !important; }
      .content { padding: 20px !important; }
      .step { display: block !important; text-align: left !important; margin-bottom: 15px !important; }
      .step-number { width: 20px !important; height: 20px !important; font-size: 10px !important; line-height: 20px !important; margin-right: 10px !important; }
      .step-text { font-size: 14px !important; }
      .step-desc { font-size: 12px !important; }
      .support { padding: 15px !important; }
      .footer { padding: 15px !important; font-size: 12px !important; }
      .emoji { font-size: 24px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333333; background-color: #f5f7fa; margin: 0; padding: 20px;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 5px 15px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <tr>
      <td class="header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td style="text-align: center;">
              <div class="emoji" style="display: inline-block; background: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; text-align: center; line-height: 80px; margin-bottom: 20px;">
                <span style="font-size: 36px;">🎉</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Talent Bridge!</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">
                Your journey to amazing opportunities starts now
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    
    <!-- Content -->
    <tr>
      <td class="content" style="padding: 40px 30px;">
        
        <!-- Registration Status -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f0fff4; border: 1px solid #48bb78; border-radius: 8px; margin-bottom: 25px;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <div style="margin-bottom: 10px;">
                <span style="display: inline-block; background: #48bb78; width: 50px; height: 50px; border-radius: 50%; color: white; text-align: center; line-height: 50px; font-size: 20px;">✓</span>
              </div>
              <h3 style="margin: 0 0 8px; color: #2f855a; font-size: 18px;">Registration Complete!</h3>
              <p style="margin: 0; color: #38a169; font-size: 14px;">Your account has been created successfully</p>
            </td>
          </tr>
        </table>

        <!-- Getting Started Process -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #f8faff; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e2e8f0;">
          <tr>
            <td style="padding: 25px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; margin-bottom: 20px;">
                      <div class="emoji" style="width: 40px; height: 40px; background: #667eea; border-radius: 50%; color: white; text-align: center; line-height: 40px; font-weight: 600; margin-right: 10px; display: inline-block;">
                        🚀
                      </div>
                      <h3 style="margin: 0; color: #2d3748; font-size: 18px;">Your Next Steps</h3>
                    </div>
                  </td>
                </tr>
              </table>
              
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td class="step" style="padding: 12px 0;">
                    <div style="display: flex; align-items: center;">
                      <span class="step-number" style="display: inline-block; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; margin-right: 15px; font-weight: 600;">1</span>
                      <div>
                        <div class="step-text" style="font-size: 15px; color: #2d3748; font-weight: 600;">Activate Your Subscription</div>
                        <div class="step-desc" style="font-size: 13px; color: #718096;">Start your journey by activating your subscription plan</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="step" style="padding: 12px 0;">
                    <div style="display: flex; align-items: center;">
                      <span class="step-number" style="display: inline-block; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; margin-right: 15px; font-weight: 600;">2</span>
                      <div>
                        <div class="step-text" style="font-size: 15px; color: #2d3748; font-weight: 600;">Create Your Profile</div>
                        <div class="step-desc" style="font-size: 13px; color: #718096;">Create profile for getting started with your subscription</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="step" style="padding: 12px 0;">
                    <div style="display: flex; align-items: center;">
                      <span class="step-number" style="display: inline-block; background: #667eea; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; margin-right: 15px; font-weight: 600;">3</span>
                      <div>
                        <div class="step-text" style="font-size: 15px; color: #2d3748; font-weight: 600;">Access Your Dashboard</div>
                        <div class="step-desc" style="font-size: 13px; color: #718096;">Log in to explore features, opportunities, and manage your account</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td class="step" style="padding: 12px 0;">
                    <div style="display: flex; align-items: center;">
                      <span class="step-number" style="display: inline-block; background: #48bb78; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; margin-right: 15px; font-weight: 600;">4</span>
                      <div>
                        <div class="step-text" style="font-size: 15px; color: #2d3748; font-weight: 600;">Explore Features</div>
                        <div class="step-desc" style="font-size: 13px; color: #718096;">Explore the various features available to you and make the most of your subscription</div>
                      </div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Support Section -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%" class="support" style="background: #fff8e1; border-radius: 8px; border-left: 4px solid #ffd54f;">
          <tr>
            <td style="padding: 20px;">
              <h4 style="color: #f57c00; margin: 0 0 10px; font-size: 16px; font-weight: 600;">Need Help Getting Started?</h4>
              <p style="color: #5d4037; font-size: 14px; line-height: 1.5; margin: 0 0 15px;">
                Our support team is here to help! Feel free to reach out if you have any questions or need assistance with your profile or subscription.
              </p>
              <a href="mailto:${process.env.GMAIL_USER}?subject=Welcome - Need Help" style="color: #f57c00; text-decoration: none; font-weight: 600; font-size: 14px;">
                Contact Support →
              </a>
            </td>
          </tr>
        </table>
        
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td class="footer" style="background: #f8f9fa; padding: 25px; text-align: center; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0 0 10px; color: #2d3748; font-size: 16px; font-weight: 600;">Welcome to Talent Bridge! 🌉</p>
        <p style="margin: 0 0 15px; color: #718096; font-size: 13px;">
          Connecting talent with opportunity, one bridge at a time
        </p>
        <div style="margin-top: 15px;">
          <a href="${process.env.PLATFORM_URL || 'https://yourplatform.com'}" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Visit Platform</a>
          <span style="color: #cbd5e0;">•</span>
          <a href="${process.env.PLATFORM_URL || 'https://yourplatform.com'}/help" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Help Center</a>
          <span style="color: #cbd5e0;">•</span>
          <a href="${process.env.PLATFORM_URL || 'https://yourplatform.com'}/unsubscribe" style="color: #667eea; text-decoration: none; font-size: 12px; margin: 0 10px;">Unsubscribe</a>
        </div>
      </td>
    </tr>
    
  </table>
</body>
</html>
`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Welcome email sent to ${email}`);
    
    return { success: true };
  } catch (error) {
    console.error(`Failed to send welcome email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// 7-Day Email: Boost Your Profile – Don’t Miss Out!
export const sendSevenDayEmail = async ({ email, name }) => {
  const mailOptions = {
    from: `"Apprenticeship Hub Team" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Boost Your Profile – Don’t Miss Out!`,
    text: `
Hi ${name},

We noticed you haven’t fully completed your profile yet. A complete profile means more visibility and faster connections with training opportunities and employers.

Finish now and increase your chances of being matched!

[Finish My Profile]

Apprenticeship Hub – Connecting skills with opportunity.
`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>7-Day Reminder - Apprenticeship Hub</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
    <h2>Boost Your Profile – Don’t Miss Out!</h2>
    <p>Hi ${name},</p>
    <p>We noticed you haven’t fully completed your profile yet. A complete profile means more visibility and faster connections with training opportunities and employers.</p>
    <p>Finish now and increase your chances of being matched!</p>
    <p><a href="${process.env.PLATFORM_URL || 'https://yourplatform.com'}/profile" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Finish My Profile</a></p>
    <p>Apprenticeship Hub – Connecting skills with opportunity.</p>
  </div>
</body>
</html>
`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`7-Day email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send 7-day email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

// 30-Day Email: See How Others Are Succeeding on Apprenticeship Hub!
export const sendThirtyDayEmail = async ({ email, name }) => {
  const mailOptions = {
    from: `"Apprenticeship Hub Team" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `See How Others Are Succeeding on Apprenticeship Hub!`,
    text: `
Hi ${name},

Did you know? Sarah, a recent Apprenticeship Hub user, secured her apprenticeship within 3 weeks of signing up.

Your next big opportunity could be waiting – let’s make it happen.

[Explore New Opportunities]

Keep moving forward,
The Apprenticeship Hub Team
`,
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>30-Day Engagement - Apprenticeship Hub</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 8px;">
    <h2>See How Others Are Succeeding on Apprenticeship Hub!</h2>
    <p>Hi ${name},</p>
    <p>Did you know? Sarah, a recent Apprenticeship Hub user, secured her apprenticeship within 3 weeks of signing up.</p>
    <p>Your next big opportunity could be waiting – let’s make it happen.</p>
    <p><a href="${process.env.PLATFORM_URL || 'https://yourplatform.com'}/opportunities" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Explore New Opportunities</a></p>
    <p>Keep moving forward,<br>The Apprenticeship Hub Team</p>
  </div>
</body>
</html>
`
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`30-Day email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send 30-day email to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};