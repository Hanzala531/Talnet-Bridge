/**
 * Quick database check for notifications
 */

import { Notification, User } from './src/models/index.js';
import mongoose from 'mongoose';

async function checkNotifications() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talentbridge');
    console.log("✅ Connected to MongoDB");

    // Check total notifications
    const totalNotifications = await Notification.countDocuments();
    console.log("📊 Total notifications in database:", totalNotifications);

    // Get sample notifications
    const notifications = await Notification.find({})
      .limit(5)
      .select('recipient title type status createdAt')
      .populate('recipient', 'fullName email');

    console.log("\n📋 Sample notifications:");
    notifications.forEach((notif, index) => {
      console.log(`${index + 1}. ${notif.title} (${notif.type})`);
      console.log(`   Recipient: ${notif.recipient?.fullName} (${notif.recipient?._id})`);
      console.log(`   Status: ${notif.status}`);
      console.log(`   Created: ${notif.createdAt}`);
      console.log("---");
    });

    // Check users
    const totalUsers = await User.countDocuments();
    console.log(`\n👥 Total users in database: ${totalUsers}`);

    const sampleUser = await User.findOne().select('_id fullName email role');
    if (sampleUser) {
      console.log("Sample user:", {
        id: sampleUser._id,
        name: sampleUser.fullName,
        email: sampleUser.email,
        role: sampleUser.role
      });

      // Check notifications for this user
      const userNotifications = await Notification.find({ recipient: sampleUser._id });
      console.log(`\n🔔 Notifications for ${sampleUser.fullName}: ${userNotifications.length}`);
    }

  } catch (error) {
    console.error("❌ Check failed:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔚 Disconnected from MongoDB");
  }
}

// Run the check
checkNotifications();
