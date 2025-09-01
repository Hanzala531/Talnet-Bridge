// filepath: /home/hanzala/workspace/Talnet-Bridge/src/testEmailCron.js
import { sendAutomatedEmails } from './cronJobs/emailCron.js';
import mongoose from 'mongoose';
import { config } from 'dotenv';

config(); // Load env vars

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');
    await sendAutomatedEmails();
    console.log('Test completed');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await mongoose.disconnect();
  }
})();