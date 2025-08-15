import { ApiClient, TestLogger, assert } from '../utils.js';
import { ENDPOINTS, TEST_TOKENS } from '../config.js';
import { SUBSCRIPTION_PLANS, PAYMENT_DATA } from '../data/testData.js';

const api = new ApiClient();
const logger = new TestLogger();

let createdPlanIds = [];
let createdSubscriptionId = null;

export async function runSubscriptionTests() {
    console.log('\n💳 RUNNING SUBSCRIPTION TESTS');
    console.log('='.repeat(50));

    try {
        await testCreateSubscriptionPlans();
        await testGetAllPlans();
        await testGetPlanById();
        await testUpdatePlan();
        await testCreateUserSubscription();
        await testGetUserSubscription();
        await testGetAllSubscriptions();
        await testUpdateSubscriptionStatus();
        await testCreatePaymentIntent();
        await testCancelSubscription();
        await testDeletePlan();
    } catch (error) {
        logger.log('Subscription Tests', false, `Unexpected error: ${error.message}`);
    }

    logger.summary();
    return logger.results;
}

async function testCreateSubscriptionPlans() {
    try {
        // Test creating Basic plan
        const basicResult = await api.post(ENDPOINTS.SUBSCRIPTIONS.PLANS, SUBSCRIPTION_PLANS.BASIC, TEST_TOKENS.admin);
        
        if (basicResult.success) {
            assert.statusCode(basicResult.response, 201, 'Basic plan creation should return 201');
            assert.exists(basicResult.data.data._id, 'Response should contain plan ID');
            createdPlanIds.push(basicResult.data.data._id);
            logger.log('Create Basic Plan', true, 'Basic subscription plan created successfully');
        } else {
            logger.log('Create Basic Plan', false, `Failed: ${basicResult.data.message}`);
        }

        // Test creating Premium plan
        const premiumResult = await api.post(ENDPOINTS.SUBSCRIPTIONS.PLANS, SUBSCRIPTION_PLANS.PREMIUM, TEST_TOKENS.admin);
        
        if (premiumResult.success) {
            createdPlanIds.push(premiumResult.data.data._id);
            logger.log('Create Premium Plan', true, 'Premium subscription plan created successfully');
        } else {
            logger.log('Create Premium Plan', false, `Failed: ${premiumResult.data.message}`);
        }

        // Test creating Enterprise plan
        const enterpriseResult = await api.post(ENDPOINTS.SUBSCRIPTIONS.PLANS, SUBSCRIPTION_PLANS.ENTERPRISE, TEST_TOKENS.admin);
        
        if (enterpriseResult.success) {
            createdPlanIds.push(enterpriseResult.data.data._id);
            logger.log('Create Enterprise Plan', true, 'Enterprise subscription plan created successfully');
        } else {
            logger.log('Create Enterprise Plan', false, `Failed: ${enterpriseResult.data.message}`);
        }

        // Test duplicate plan creation (should fail)
        const duplicateResult = await api.post(ENDPOINTS.SUBSCRIPTIONS.PLANS, SUBSCRIPTION_PLANS.BASIC, TEST_TOKENS.admin);
        
        if (!duplicateResult.success && duplicateResult.response.status === 409) {
            logger.log('Duplicate Plan Prevention', true, 'Duplicate plan creation properly prevented');
        } else {
            logger.log('Duplicate Plan Prevention', false, 'Duplicate plan was not prevented');
        }

    } catch (error) {
        logger.log('Create Subscription Plans', false, error.message);
    }
}

async function testGetAllPlans() {
    try {
        const { response, data, success } = await api.get(ENDPOINTS.SUBSCRIPTIONS.PLANS, TEST_TOKENS.admin);
        
        assert.statusCode(response, 200, 'Get all plans should return 200');
        assert.isArray(data.data, 'Response should contain array of plans');
        assert.isTrue(data.data.length >= 3, 'Should have at least 3 plans');
        
        logger.log('Get All Plans', success, `Retrieved ${data.data.length} subscription plans`);

        // Test public access (no token required)
        const publicResult = await api.get(ENDPOINTS.SUBSCRIPTIONS.PLANS);
        logger.log('Get Plans (Public)', publicResult.success, 'Public access to plans tested');

    } catch (error) {
        logger.log('Get All Plans', false, error.message);
    }
}

async function testGetPlanById() {
    try {
        if (createdPlanIds.length === 0) {
            logger.log('Get Plan By ID', false, 'No plans available for testing');
            return;
        }

        const planId = createdPlanIds[0];
        const { response, data, success } = await api.get(`${ENDPOINTS.SUBSCRIPTIONS.PLANS}/${planId}`, TEST_TOKENS.admin);
        
        assert.statusCode(response, 200, 'Get plan by ID should return 200');
        assert.exists(data.data, 'Response should contain plan data');
        assert.equals(data.data._id, planId, 'Returned plan should have correct ID');
        
        logger.log('Get Plan By ID', success, 'Plan retrieved by ID successfully');

        // Test invalid plan ID
        const invalidResult = await api.get(`${ENDPOINTS.SUBSCRIPTIONS.PLANS}/invalid_id`, TEST_TOKENS.admin);
        if (invalidResult.response.status === 400 || invalidResult.response.status === 404) {
            logger.log('Get Invalid Plan ID', true, 'Invalid plan ID properly handled');
        } else {
            logger.log('Get Invalid Plan ID', false, 'Invalid plan ID not properly handled');
        }

    } catch (error) {
        logger.log('Get Plan By ID', false, error.message);
    }
}

async function testUpdatePlan() {
    try {
        if (createdPlanIds.length === 0) {
            logger.log('Update Plan', false, 'No plans available for testing');
            return;
        }

        const planId = createdPlanIds[0];
        const updateData = {
            description: "Updated description for testing",
            price: 24.99
        };

        const { response, data, success } = await api.put(`${ENDPOINTS.SUBSCRIPTIONS.PLANS}/${planId}`, updateData, TEST_TOKENS.admin);
        
        if (success) {
            assert.statusCode(response, 200, 'Update plan should return 200');
            assert.equals(data.data.price, 24.99, 'Plan price should be updated');
            logger.log('Update Plan', true, 'Plan updated successfully');
        } else {
            logger.log('Update Plan', false, `Update failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Update Plan', false, error.message);
    }
}

async function testCreateUserSubscription() {
    try {
        if (createdPlanIds.length === 0) {
            logger.log('Create User Subscription', false, 'No plans available for testing');
            return;
        }

        const subscriptionData = {
            planId: createdPlanIds[0]
        };

        const { response, data, success } = await api.post(ENDPOINTS.SUBSCRIPTIONS.CREATE_SUBSCRIPTION, subscriptionData, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 201, 'Create subscription should return 201');
            assert.exists(data.data._id, 'Response should contain subscription ID');
            createdSubscriptionId = data.data._id;
            logger.log('Create User Subscription', true, 'User subscription created successfully');
        } else {
            logger.log('Create User Subscription', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Create User Subscription', false, error.message);
    }
}

async function testGetUserSubscription() {
    try {
        const { response, data, success } = await api.get(ENDPOINTS.SUBSCRIPTIONS.USER_SUBSCRIPTION, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Get user subscription should return 200');
            assert.exists(data.data, 'Response should contain subscription data');
            logger.log('Get User Subscription', true, 'User subscription retrieved successfully');
        } else if (response.status === 404) {
            logger.log('Get User Subscription', true, 'No subscription found (expected for new user)');
        } else {
            logger.log('Get User Subscription', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Get User Subscription', false, error.message);
    }
}

async function testGetAllSubscriptions() {
    try {
        const { response, data, success } = await api.get(ENDPOINTS.SUBSCRIPTIONS.ALL_SUBSCRIPTIONS, TEST_TOKENS.admin);
        
        assert.statusCode(response, 200, 'Get all subscriptions should return 200');
        assert.isObject(data.data, 'Response should contain subscription data object');
        assert.isArray(data.data.subscriptions, 'Response should contain subscriptions array');
        
        logger.log('Get All Subscriptions', success, `Retrieved ${data.data.subscriptions.length} subscriptions`);

    } catch (error) {
        logger.log('Get All Subscriptions', false, error.message);
    }
}

async function testUpdateSubscriptionStatus() {
    try {
        if (!createdSubscriptionId) {
            logger.log('Update Subscription Status', false, 'No subscription available for testing');
            return;
        }

        const statusData = {
            status: 'active'
        };

        const endpoint = ENDPOINTS.SUBSCRIPTIONS.UPDATE_STATUS.replace(':id', createdSubscriptionId);
        const { response, data, success } = await api.patch(endpoint, statusData, TEST_TOKENS.admin);
        
        if (success) {
            assert.statusCode(response, 200, 'Update subscription status should return 200');
            assert.equals(data.data.status, 'active', 'Subscription status should be updated');
            logger.log('Update Subscription Status', true, 'Subscription status updated successfully');
        } else {
            logger.log('Update Subscription Status', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Update Subscription Status', false, error.message);
    }
}

async function testCreatePaymentIntent() {
    try {
        if (!createdSubscriptionId) {
            logger.log('Create Payment Intent', false, 'No subscription available for testing');
            return;
        }

        const paymentData = {
            subscriptionId: createdSubscriptionId
        };

        const { response, data, success } = await api.post(ENDPOINTS.SUBSCRIPTIONS.PAYMENT_INTENT, paymentData, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Create payment intent should return 200');
            assert.exists(data.data.clientSecret, 'Response should contain client secret');
            logger.log('Create Payment Intent', true, 'Payment intent created successfully');
        } else {
            logger.log('Create Payment Intent', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Create Payment Intent', false, error.message);
    }
}

async function testCancelSubscription() {
    try {
        const cancelData = {
            reason: 'Testing cancellation'
        };

        const { response, data, success } = await api.post(ENDPOINTS.SUBSCRIPTIONS.CANCEL_SUBSCRIPTION, cancelData, TEST_TOKENS.school);
        
        if (success) {
            assert.statusCode(response, 200, 'Cancel subscription should return 200');
            assert.equals(data.data.status, 'cancelled', 'Subscription should be cancelled');
            logger.log('Cancel Subscription', true, 'Subscription cancelled successfully');
        } else if (response.status === 404) {
            logger.log('Cancel Subscription', true, 'No active subscription to cancel (expected)');
        } else {
            logger.log('Cancel Subscription', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Cancel Subscription', false, error.message);
    }
}

async function testDeletePlan() {
    try {
        if (createdPlanIds.length === 0) {
            logger.log('Delete Plan', false, 'No plans available for testing');
            return;
        }

        // Try to delete the last created plan
        const planId = createdPlanIds[createdPlanIds.length - 1];
        const { response, data, success } = await api.delete(`${ENDPOINTS.SUBSCRIPTIONS.PLANS}/${planId}`, TEST_TOKENS.admin);
        
        if (success) {
            assert.statusCode(response, 200, 'Delete plan should return 200');
            logger.log('Delete Plan', true, 'Plan deleted successfully');
            createdPlanIds.pop(); // Remove from our tracking array
        } else {
            logger.log('Delete Plan', false, `Failed: ${data.message}`);
        }

    } catch (error) {
        logger.log('Delete Plan', false, error.message);
    }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runSubscriptionTests();
}
