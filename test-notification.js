/**
 * Simple test script to debug notification creation
 */

import { createCourseEnrollmentNotification } from './src/services/notification.service.js';
import { User } from './src/models/index.js';
import mongoose from 'mongoose';

async function testNotification() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/talentbridge');
    console.log("✅ Connected to MongoDB");

    // Find a real user to test with
    const user = await User.findOne().select('_id fullName email role');
    if (!user) {
      console.error("❌ No users found in database");
      return;
    }
    
    console.log("Found user for testing:", {
      id: user._id,
      name: user.fullName,
      email: user.email,
      role: user.role
    });

    // Test notification creation
    console.log("\n=== TESTING NOTIFICATION CREATION ===");
    const notification = await createCourseEnrollmentNotification(
      user._id.toString(),
      "Test Course Title",
      "64f456def789abc123456789" // dummy course ID
    );

    console.log("✅ Notification created successfully!");
    console.log("Notification details:", {
      id: notification._id,
      recipient: notification.recipient,
      title: notification.title,
      type: notification.type
    });

  } catch (error) {
    console.error("❌ Test failed:", error);
    console.error("Stack:", error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

// Run the test
testNotification();
