import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function fixDatabaseIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get the subscription plans collection
        const db = mongoose.connection.db;
        const collection = db.collection('subscriptionplans');

        console.log('\n📋 Current indexes:');
        const indexes = await collection.indexes();
        indexes.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Check if planId index exists
        const planIdIndex = indexes.find(index => index.name === 'planId_1');
        
        if (planIdIndex) {
            console.log('\n🔧 Dropping problematic planId_1 index...');
            await collection.dropIndex('planId_1');
            console.log('✅ planId_1 index dropped successfully');
        } else {
            console.log('\n✅ No planId_1 index found');
        }

        console.log('\n📋 Indexes after cleanup:');
        const newIndexes = await collection.indexes();
        newIndexes.forEach((index, i) => {
            console.log(`${i + 1}. ${index.name}: ${JSON.stringify(index.key)}`);
        });

        // Also clear any existing plans to start fresh
        console.log('\n🧹 Clearing existing plans...');
        const deleteResult = await collection.deleteMany({});
        console.log(`✅ Deleted ${deleteResult.deletedCount} existing plans`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

console.log('🔧 Fixing database indexes...');
fixDatabaseIndexes();
