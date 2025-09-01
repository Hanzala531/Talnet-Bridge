import cron from 'node-cron';
import { User } from '../models/contents/User.models.js';
import { sendSevenDayEmail, sendThirtyDayEmail } from '../services/welcomeEmail.service.js';

/**
 * Cron job to send automated emails to students at 7 and 30 days post-registration.
 * Scheduled: Daily at 9:00 AM.
 * Checks for students who have reached exact 7 or 30 days since registration.
 */
const sendAutomatedEmails = async () => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 7-Day Email: Students registered exactly 7 days ago
    const sevenDayUsers = await User.find({
      role: 'student',
      createdAt: {
        $gte: new Date(sevenDaysAgo.setHours(0, 0, 0, 0)), // Start of 7 days ago
        $lt: new Date(sevenDaysAgo.setHours(23, 59, 59, 999)) // End of 7 days ago
      }
    }).select('email fullName').lean();

    // 30-Day Email: Students registered exactly 30 days ago
    const thirtyDayUsers = await User.find({
      role: 'student',
      createdAt: {
        $gte: new Date(thirtyDaysAgo.setHours(0, 0, 0, 0)), // Start of 30 days ago
        $lt: new Date(thirtyDaysAgo.setHours(23, 59, 59, 999)) // End of 30 days ago
      }
    }).select('email fullName').lean();

    // Send 7-Day Emails
    if (sevenDayUsers.length > 0) {
      const sevenDayPromises = sevenDayUsers.map(async (user) => {
        try {
          await sendSevenDayEmail({
            email: user.email,
            name: user.fullName,
          });
          console.log(`7-Day email sent to ${user.email}`);
        } catch (error) {
          console.error(`Failed to send 7-day email to ${user.email}:`, error.message);
        }
      });
      await Promise.all(sevenDayPromises);
    }

    // Send 30-Day Emails
    if (thirtyDayUsers.length > 0) {
      const thirtyDayPromises = thirtyDayUsers.map(async (user) => {
        try {
          await sendThirtyDayEmail({
            email: user.email,
            name: user.fullName,
          });
          console.log(`30-Day email sent to ${user.email}`);
        } catch (error) {
          console.error(`Failed to send 30-day email to ${user.email}:`, error.message);
        }
      });
      await Promise.all(thirtyDayPromises);
    }

    console.log(`Automated emails processed: ${sevenDayUsers.length} 7-day, ${thirtyDayUsers.length} 30-day.`);
  } catch (error) {
    console.error('Error in sendAutomatedEmails cron job:', error.message);
  }
};

// Schedule the cron job: Daily at 9:00 AM
cron.schedule('0 9 * * *', sendAutomatedEmails, {
  timezone: 'UTC', // Adjust timezone if needed
});

// Export for testing or manual triggering
export { sendAutomatedEmails };