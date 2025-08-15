import { runAuthTests } from './auth/authTests.js';
import { runSubscriptionTests } from './subscription/subscriptionTests.js';
import { runCourseTests } from './courses/courseTests.js';
import { runSchoolTests } from './school/schoolTests.js';
import { TEST_CONFIG, TEST_TOKENS } from './config.js';

class TestRunner {
    constructor() {
        this.results = {
            auth: [],
            subscription: [],
            course: [],
            school: [],
            summary: {
                totalTests: 0,
                passed: 0,
                failed: 0,
                startTime: null,
                endTime: null,
                duration: 0
            }
        };
    }

    async runAllTests() {
        console.log('🚀 STARTING COMPREHENSIVE API TESTS');
        console.log('='.repeat(70));
        console.log(`📡 API Base URL: ${TEST_CONFIG.API_BASE}`);
        console.log(`⏰ Started at: ${new Date().toISOString()}`);
        console.log('='.repeat(70));

        this.results.summary.startTime = Date.now();

        try {
            // Run all test suites
            this.results.auth = await runAuthTests();
            this.results.subscription = await runSubscriptionTests();
            this.results.course = await runCourseTests();
            this.results.school = await runSchoolTests();

            // Calculate summary
            this.calculateSummary();
            this.printFinalSummary();

        } catch (error) {
            console.log(`💥 Test runner failed: ${error.message}`);
        }

        return this.results;
    }

    async runSpecificTest(testSuite) {
        console.log(`🎯 RUNNING ${testSuite.toUpperCase()} TESTS ONLY`);
        console.log('='.repeat(50));

        this.results.summary.startTime = Date.now();

        try {
            switch (testSuite.toLowerCase()) {
                case 'auth':
                    this.results.auth = await runAuthTests();
                    break;
                case 'subscription':
                    this.results.subscription = await runSubscriptionTests();
                    break;
                case 'course':
                    this.results.course = await runCourseTests();
                    break;
                case 'school':
                    this.results.school = await runSchoolTests();
                    break;
                default:
                    console.log(`❌ Unknown test suite: ${testSuite}`);
                    console.log('Available test suites: auth, subscription, course, school');
                    return;
            }

            this.calculateSummary();
            this.printFinalSummary();

        } catch (error) {
            console.log(`💥 ${testSuite} tests failed: ${error.message}`);
        }

        return this.results;
    }

    calculateSummary() {
        this.results.summary.endTime = Date.now();
        this.results.summary.duration = this.results.summary.endTime - this.results.summary.startTime;

        const allResults = [
            ...this.results.auth,
            ...this.results.subscription,
            ...this.results.course,
            ...this.results.school
        ];

        this.results.summary.totalTests = allResults.length;
        this.results.summary.passed = allResults.filter(r => r.success).length;
        this.results.summary.failed = allResults.filter(r => !r.success).length;
    }

    printFinalSummary() {
        const { summary } = this.results;
        const successRate = summary.totalTests > 0 ? Math.round((summary.passed / summary.totalTests) * 100) : 0;

        console.log('\n' + '='.repeat(70));
        console.log('🏁 FINAL TEST SUMMARY');
        console.log('='.repeat(70));
        console.log(`⏱️  Total Duration: ${summary.duration}ms`);
        console.log(`📊 Total Tests: ${summary.totalTests}`);
        console.log(`✅ Passed: ${summary.passed}`);
        console.log(`❌ Failed: ${summary.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);

        // Breakdown by test suite
        console.log('\n📋 Test Suite Breakdown:');
        this.printSuiteResults('Auth', this.results.auth);
        this.printSuiteResults('Subscription', this.results.subscription);
        this.printSuiteResults('Course', this.results.course);
        this.printSuiteResults('School', this.results.school);

        // Show failed tests
        const failedTests = [
            ...this.results.auth.filter(r => !r.success),
            ...this.results.subscription.filter(r => !r.success),
            ...this.results.course.filter(r => !r.success),
            ...this.results.school.filter(r => !r.success)
        ];

        if (failedTests.length > 0) {
            console.log('\n❌ Failed Tests:');
            failedTests.forEach(test => {
                console.log(`   - ${test.testName}: ${test.message}`);
            });
        }

        // Show authentication tokens status
        console.log('\n🔑 Authentication Tokens:');
        console.log(`   Admin: ${TEST_TOKENS.admin ? '✅ Available' : '❌ Missing'}`);
        console.log(`   School: ${TEST_TOKENS.school ? '✅ Available' : '❌ Missing'}`);
        console.log(`   Student: ${TEST_TOKENS.student ? '✅ Available' : '❌ Missing'}`);

        console.log('='.repeat(70));

        // Overall status
        if (successRate >= 90) {
            console.log('🎉 EXCELLENT! Most tests are passing.');
        } else if (successRate >= 70) {
            console.log('👍 GOOD! Most tests are passing, but some issues need attention.');
        } else if (successRate >= 50) {
            console.log('⚠️  WARNING! Many tests are failing. Check your API implementation.');
        } else {
            console.log('🚨 CRITICAL! Most tests are failing. Review your API setup.');
        }
    }

    printSuiteResults(suiteName, results) {
        const passed = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const total = results.length;
        const rate = total > 0 ? Math.round((passed / total) * 100) : 0;

        console.log(`   ${suiteName}: ${passed}/${total} passed (${rate}%)`);
    }

    async checkServerHealth() {
        console.log('🏥 Checking server health...');
        
        try {
            const response = await fetch(TEST_CONFIG.API_BASE.replace('/api/v1', '/health'));
            if (response.ok) {
                console.log('✅ Server is healthy and responding');
                return true;
            } else {
                console.log(`⚠️  Server responded with status: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log('❌ Server is not responding');
            console.log(`   Error: ${error.message}`);
            console.log(`   Make sure your server is running on ${TEST_CONFIG.API_BASE}`);
            return false;
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const testRunner = new TestRunner();

    // Check if server is running
    const isHealthy = await testRunner.checkServerHealth();
    if (!isHealthy) {
        console.log('\n💡 To start the server, run: npm run dev');
        process.exit(1);
    }

    // Run specific test suite or all tests
    if (args.length > 0) {
        const testSuite = args[0];
        await testRunner.runSpecificTest(testSuite);
    } else {
        await testRunner.runAllTests();
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { TestRunner };
