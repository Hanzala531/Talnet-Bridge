import fs from 'fs';

async function testSubscriptionAPI() {
    const API_BASE = 'http://localhost:4000/api/v1/subscriptions';
    
    // Admin token - you'll need to replace this with a valid admin token
    const ADMIN_TOKEN = 'your_admin_jwt_token_here';
    
    console.log('🧪 Testing Subscription Plan API with New Credentials\n');

    try {
        // Test 1: Create Basic Plan
        console.log('1️⃣ Creating Basic Plan...');
        const basicPlanData = JSON.parse(fs.readFileSync('./test-plan-basic.json', 'utf8'));
        
        const basicResponse = await fetch(`${API_BASE}/plans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            },
            body: JSON.stringify(basicPlanData)
        });
        
        const basicResult = await basicResponse.json();
        
        if (basicResponse.ok) {
            console.log('✅ Basic plan created successfully!');
            console.log(`   Plan ID: ${basicResult.data._id}`);
        } else {
            console.log('❌ Basic plan creation failed:');
            console.log(`   Status: ${basicResponse.status}`);
            console.log(`   Error: ${basicResult.message}`);
            console.log(`   Error Code: ${basicResult.errorCode}`);
        }
        
        console.log('');

        // Test 2: Create Premium Plan
        console.log('2️⃣ Creating Premium Plan...');
        const premiumPlanData = JSON.parse(fs.readFileSync('./test-plan-premium.json', 'utf8'));
        
        const premiumResponse = await fetch(`${API_BASE}/plans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            },
            body: JSON.stringify(premiumPlanData)
        });
        
        const premiumResult = await premiumResponse.json();
        
        if (premiumResponse.ok) {
            console.log('✅ Premium plan created successfully!');
            console.log(`   Plan ID: ${premiumResult.data._id}`);
        } else {
            console.log('❌ Premium plan creation failed:');
            console.log(`   Status: ${premiumResponse.status}`);
            console.log(`   Error: ${premiumResult.message}`);
            console.log(`   Error Code: ${premiumResult.errorCode}`);
        }
        
        console.log('');

        // Test 3: Try to create duplicate (should fail with specific error)
        console.log('3️⃣ Testing Duplicate Creation (should fail)...');
        const duplicateResponse = await fetch(`${API_BASE}/plans`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            },
            body: JSON.stringify(basicPlanData) // Same data as before
        });
        
        const duplicateResult = await duplicateResponse.json();
        
        if (!duplicateResponse.ok) {
            console.log('✅ Duplicate detection working correctly!');
            console.log(`   Status: ${duplicateResponse.status}`);
            console.log(`   Error: ${duplicateResult.message}`);
            console.log(`   Error Code: ${duplicateResult.errorCode}`);
        } else {
            console.log('❌ Duplicate detection failed - this should not succeed');
        }
        
        console.log('');

        // Test 4: Get All Plans
        console.log('4️⃣ Getting All Plans...');
        const plansResponse = await fetch(`${API_BASE}/plans`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${ADMIN_TOKEN}`
            }
        });
        
        const plansResult = await plansResponse.json();
        
        if (plansResponse.ok) {
            console.log('✅ Plans retrieved successfully!');
            console.log(`   Total plans: ${plansResult.data.length}`);
            plansResult.data.forEach(plan => {
                console.log(`   - ${plan.name}: ${plan.displayName} ($${plan.price})`);
            });
        } else {
            console.log('❌ Failed to get plans:');
            console.log(`   Error: ${plansResult.message}`);
        }

    } catch (error) {
        console.log('❌ Test failed with error:', error.message);
        
        if (error.message.includes('fetch')) {
            console.log('\n💡 Make sure your server is running on port 4000');
            console.log('   Run: npm run dev');
        }
        
        if (ADMIN_TOKEN === 'your_admin_jwt_token_here') {
            console.log('\n💡 Don\'t forget to replace ADMIN_TOKEN with a valid JWT token');
            console.log('   You can get one by logging in as an admin user');
        }
    }
}

console.log('📋 Note: Update ADMIN_TOKEN in this script before running');
console.log('🚀 Starting API tests...\n');

testSubscriptionAPI();
