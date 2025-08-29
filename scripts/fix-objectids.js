import mongoose from 'mongoose';
import { Employer } from './src/models/index.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Database Cleanup Script
 * 
 * This script fixes malformed ObjectIds in the Employer collection
 * that are causing casting errors in the application.
 * 
 * Run this script to clean up your database:
 * node scripts/fix-objectids.js
 */

async function fixMalformedObjectIds() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully');

    console.log('🔍 Searching for employers with malformed ObjectIds...');
    
    // Find all employers
    const employers = await Employer.find({}).lean();
    console.log(`📊 Found ${employers.length} total employers`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const employer of employers) {
      try {
        let needsUpdate = false;
        const updateData = {};

        // Check if userId is malformed
        if (employer.userId && typeof employer.userId === 'object' && employer.userId.$oid) {
          console.log(`🔧 Fixing malformed userId for employer ${employer._id}: ${JSON.stringify(employer.userId)}`);
          
          // Validate the ObjectId string
          const oidString = employer.userId.$oid;
          if (/^[0-9a-fA-F]{24}$/.test(oidString)) {
            updateData.userId = new mongoose.Types.ObjectId(oidString);
            needsUpdate = true;
          } else {
            console.log(`❌ Invalid ObjectId format: ${oidString}, setting to null`);
            updateData.userId = null;
            needsUpdate = true;
          }
        }

        // Update the document if needed
        if (needsUpdate) {
          await Employer.updateOne(
            { _id: employer._id },
            { $set: updateData }
          );
          fixedCount++;
          console.log(`✅ Fixed employer ${employer._id}`);
        }

      } catch (error) {
        console.error(`❌ Error fixing employer ${employer._id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n📈 Cleanup Summary:');
    console.log(`✅ Fixed: ${fixedCount} employers`);
    console.log(`❌ Errors: ${errorCount} employers`);
    console.log(`📊 Total processed: ${employers.length} employers`);

    // Verify the fix
    console.log('\n🔍 Verifying fixes...');
    const remainingMalformed = await Employer.find({
      'userId.$oid': { $exists: true }
    }).lean();

    if (remainingMalformed.length === 0) {
      console.log('✅ All malformed ObjectIds have been fixed!');
    } else {
      console.log(`⚠️  ${remainingMalformed.length} malformed ObjectIds still remain`);
    }

  } catch (error) {
    console.error('💥 Fatal error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
console.log('🚀 Starting ObjectId cleanup script...');
fixMalformedObjectIds();
