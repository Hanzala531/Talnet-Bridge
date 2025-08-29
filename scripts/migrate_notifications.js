/**
 * Migration Script: Update Notifications to Web App Only Format
 * This script migrates existing notifications to the new simplified format
 */

import mongoose from 'mongoose';
import { Notification } from '../src/models/contents/notification.models.js';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Migration function to update existing notifications
 */
async function migrateNotifications() {
  try {
    console.log('🚀 Starting notification migration to web app only format...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Get all notifications that need migration
    const notificationsToMigrate = await Notification.find({
      $or: [
        { 'delivery.inApp.delivered': { $exists: false } },
        { 'delivery.inApp.delivered': false },
        { 'delivery.email': { $exists: true } },
        { 'delivery.sms': { $exists: true } },
        { 'delivery.push': { $exists: true } },
        { 'channels': { $exists: true } }
      ]
    });

    console.log(`📊 Found ${notificationsToMigrate.length} notifications to migrate`);

    if (notificationsToMigrate.length === 0) {
      console.log('✅ No notifications need migration');
      return;
    }

    let migrated = 0;
    let errors = 0;

    // Process notifications in batches
    const batchSize = 100;
    for (let i = 0; i < notificationsToMigrate.length; i += batchSize) {
      const batch = notificationsToMigrate.slice(i, i + batchSize);
      
      console.log(`🔄 Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} notifications)`);

      // Prepare bulk operations
      const bulkOps = batch.map(notification => {
        const updateDoc = {
          $set: {
            'delivery.inApp.delivered': true,
            'delivery.inApp.deliveredAt': notification.createdAt || new Date()
          },
          $unset: {
            'delivery.email': '',
            'delivery.sms': '',
            'delivery.push': '',
            'channels': ''
          }
        };

        return {
          updateOne: {
            filter: { _id: notification._id },
            update: updateDoc
          }
        };
      });

      try {
        // Execute bulk update
        const result = await Notification.bulkWrite(bulkOps);
        migrated += result.modifiedCount;
        
        console.log(`✅ Batch completed: ${result.modifiedCount} notifications updated`);
      } catch (error) {
        console.error(`❌ Error processing batch: ${error.message}`);
        errors += batch.length;
      }
    }

    // Migration summary
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migrated} notifications`);
    console.log(`❌ Errors: ${errors} notifications`);
    console.log(`📊 Total processed: ${notificationsToMigrate.length} notifications`);

    // Verify migration
    const remainingNotifications = await Notification.countDocuments({
      $or: [
        { 'delivery.inApp.delivered': { $exists: false } },
        { 'delivery.inApp.delivered': false },
        { 'delivery.email': { $exists: true } },
        { 'delivery.sms': { $exists: true } },
        { 'delivery.push': { $exists: true } },
        { 'channels': { $exists: true } }
      ]
    });

    if (remainingNotifications === 0) {
      console.log('🎉 Migration completed successfully! All notifications updated to web app format.');
    } else {
      console.log(`⚠️  Migration incomplete: ${remainingNotifications} notifications still need updating.`);
    }

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

/**
 * Rollback function (if needed)
 */
async function rollbackMigration() {
  try {
    console.log('🔄 Starting rollback of notification migration...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // This is a simple rollback - in a real scenario, you'd want to backup first
    const result = await Notification.updateMany(
      {},
      {
        $set: {
          'channels.inApp': true,
          'channels.email': false,
          'channels.sms': false,
          'channels.push': false,
          'delivery.inApp.delivered': false
        },
        $unset: {
          'delivery.inApp.deliveredAt': ''
        }
      }
    );

    console.log(`✅ Rollback completed: ${result.modifiedCount} notifications reverted`);

  } catch (error) {
    console.error('💥 Rollback failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

/**
 * Clean up old notification data
 */
async function cleanupOldData() {
  try {
    console.log('🧹 Starting cleanup of old notification data...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Remove old fields that are no longer needed
    const result = await Notification.updateMany(
      {},
      {
        $unset: {
          'channels': '',
          'delivery.email': '',
          'delivery.sms': '',
          'delivery.push': ''
        }
      }
    );

    console.log(`✅ Cleanup completed: ${result.modifiedCount} notifications cleaned`);

  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

/**
 * Validate migration results
 */
async function validateMigration() {
  try {
    console.log('🔍 Validating migration results...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Check total notifications
    const totalNotifications = await Notification.countDocuments();
    console.log(`📊 Total notifications: ${totalNotifications}`);

    // Check web app delivered notifications
    const webAppDelivered = await Notification.countDocuments({
      'delivery.inApp.delivered': true
    });
    console.log(`✅ Web app delivered: ${webAppDelivered}`);

    // Check for old format notifications
    const oldFormat = await Notification.countDocuments({
      $or: [
        { 'channels': { $exists: true } },
        { 'delivery.email': { $exists: true } },
        { 'delivery.sms': { $exists: true } },
        { 'delivery.push': { $exists: true } }
      ]
    });
    console.log(`⚠️  Old format remaining: ${oldFormat}`);

    // Check undelivered notifications
    const undelivered = await Notification.countDocuments({
      'delivery.inApp.delivered': { $ne: true }
    });
    console.log(`❌ Undelivered notifications: ${undelivered}`);

    if (webAppDelivered === totalNotifications && oldFormat === 0 && undelivered === 0) {
      console.log('🎉 Migration validation successful!');
    } else {
      console.log('⚠️  Migration validation shows issues that need attention.');
    }

  } catch (error) {
    console.error('💥 Validation failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from database');
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'migrate':
    migrateNotifications();
    break;
  case 'rollback':
    rollbackMigration();
    break;
  case 'cleanup':
    cleanupOldData();
    break;
  case 'validate':
    validateMigration();
    break;
  default:
    console.log(`
📖 Notification Migration Script Usage:

Commands:
  migrate   - Migrate notifications to web app only format
  rollback  - Rollback migration (restore old format)
  cleanup   - Remove old unused fields
  validate  - Validate migration results

Examples:
  node migrate_notifications.js migrate
  node migrate_notifications.js validate
  node migrate_notifications.js cleanup

Environment Variables Required:
  MONGODB_URI - MongoDB connection string
    `);
    process.exit(1);
}

export { migrateNotifications, rollbackMigration, cleanupOldData, validateMigration };
