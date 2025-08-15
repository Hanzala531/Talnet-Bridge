// Quick test script for subscription APIs
// Run with: node test-subscription.js

const API_BASE = 'http://localhost:4000/api/v1';

// Test data
const testUser = {
  fullName: "Test Training Provider",
  email: "test@provider.com",
  phone: "03001234567", 
  password: "TestPass123!",
  role: "school"
};

const basicPlan = {
  name: "basic",
  displayName: "Basic Plan",
  description: "Test basic plan",
  price: 29.99,
  billingCycle: "monthly",
  features: {
    maxCourses: 5,
    maxStudents: 100,
    supportLevel: "email",
    analytics: false,
    customBranding: false,
    certificateTemplates: 1,
    storageGB: 5
  },
  stripePriceId: "price_test_basic",
  stripeProductId: "prod_test_basic"
};

async function testAPI() {
  try {
    console.log('🚀 Starting Subscription API Tests...\n');

    // 1. Test server health
    console.log('1. Testing server health...');
    const healthCheck = await fetch(`${API_BASE.replace('/api/v1', '')}/`);
    const health = await healthCheck.json();
    console.log('✅ Server is running:', health.message);

    // 2. Register user
    console.log('\n2. Registering test user...');
    const registerResponse = await fetch(`${API_BASE}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    
    if (registerResponse.status === 201) {
      console.log('✅ User registered successfully');
    } else if (registerResponse.status === 409) {
      console.log('ℹ️ User already exists, continuing...');
    } else {
      const error = await registerResponse.json();
      console.log('❌ Registration failed:', error.message);
      return;
    }

    // 3. Login user
    console.log('\n3. Logging in user...');
    const loginResponse = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.log('❌ Login failed:', error.message);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.data.accessToken;
    console.log('✅ Login successful, token received');

    // 4. Test subscription plans (requires admin role)
    console.log('\n4. Testing subscription plan endpoints...');
    const plansResponse = await fetch(`${API_BASE}/subscriptions/plans`);
    
    if (plansResponse.ok) {
      const plansData = await plansResponse.json();
      console.log('✅ Plans endpoint working, found', plansData.data?.length || 0, 'plans');
    } else {
      console.log('ℹ️ Plans endpoint returned:', plansResponse.status);
    }

    // 5. Test user subscription
    console.log('\n5. Testing user subscription endpoint...');
    const mySubResponse = await fetch(`${API_BASE}/subscriptions/my`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (mySubResponse.status === 404) {
      console.log('✅ No subscription found (expected for new user)');
    } else if (mySubResponse.ok) {
      const subData = await mySubResponse.json();
      console.log('✅ User has subscription:', subData.data.status);
    } else {
      console.log('ℹ️ Subscription check returned:', mySubResponse.status);
    }

    // 6. Test course creation (should fail without subscription)
    console.log('\n6. Testing course creation without subscription...');
    const courseResponse = await fetch(`${API_BASE}/courses`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: "Test Course",
        instructor: "Test Instructor",
        duration: "4 weeks",
        price: 199.99,
        language: "English",
        type: "online",
        description: "Test course description",
        objectives: ["Test objective"],
        skills: ["Test skill"],
        category: "Technology"
      })
    });

    if (courseResponse.status === 403) {
      console.log('✅ Course creation properly blocked without subscription');
    } else {
      console.log('ℹ️ Course creation returned:', courseResponse.status);
    }

    // 7. Test notifications
    console.log('\n7. Testing notifications endpoint...');
    const notificationsResponse = await fetch(`${API_BASE}/notifications`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (notificationsResponse.ok) {
      const notifData = await notificationsResponse.json();
      console.log('✅ Notifications endpoint working, found', notifData.data?.notifications?.length || 0, 'notifications');
    } else {
      console.log('ℹ️ Notifications returned:', notificationsResponse.status);
    }

    console.log('\n🎉 All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Create subscription plans via admin user');
    console.log('2. Test subscription creation and payment flow');
    console.log('3. Test course creation with active subscription');
    console.log('4. Test webhook endpoints');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Check if running in Node.js environment
if (typeof fetch === 'undefined') {
  console.log('❌ This script requires Node.js 18+ with fetch support');
  console.log('💡 Alternative: Use the test data in SUBSCRIPTION_TEST_DATA.md with Postman/Thunder Client');
} else {
  testAPI();
}

module.exports = { testAPI, testUser, basicPlan };
