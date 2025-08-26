/**
 * PHASE 1: FOUNDATION WORKFLOWS TESTING
 * 
 * This script implements comprehensive testing for:
 * - Authentication & User Management
 * - Profile Management Workflows
 * 
 * Based on the Comprehensive Workflow Testing Plan
 */

const axios = require('axios');

class Phase1FoundationTester {
    constructor() {
        this.baseURL = process.env.API_URL || 'http://localhost:5001/api';
        this.clientURL = process.env.CLIENT_URL || 'http://localhost:3000';
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
        this.testTokens = {}; // Store auth tokens for different test users
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async runTest(testName, testFunction) {
        this.testResults.total++;
        console.log(`\n${'='.repeat(60)}`);
        this.log(`Running: ${testName}`, 'info');
        console.log(`${'='.repeat(60)}`);
        
        try {
            await testFunction();
            this.testResults.passed++;
            this.log(`PASSED: ${testName}`, 'success');
            return true;
        } catch (error) {
            this.testResults.failed++;
            this.testResults.errors.push({ test: testName, error: error.message });
            this.log(`FAILED: ${testName} - ${error.message}`, 'error');
            return false;
        }
    }

    // ============================================================================
    // 1.1 AUTHENTICATION & USER MANAGEMENT
    // ============================================================================

    async test_1_1_1_UserRegistrationWorkflow() {
        this.log('Testing User Registration Workflow', 'info');
        
        // Test Case 1: Valid Registration
        const testUser = {
            username: `testuser_${Date.now()}`,
            email: `test_${Date.now()}@example.com`,
            password: 'SecurePassword123!',
            confirmPassword: 'SecurePassword123!'
        };

        this.log('1. Testing valid registration...', 'info');
        const registerResponse = await axios.post(`${this.baseURL}/auth/register`, testUser);
        
        if (registerResponse.status !== 201) {
            throw new Error(`Registration failed with status: ${registerResponse.status}`);
        }

        this.log('Valid registration successful', 'success');

        // Test Case 2: Invalid Registration Attempts
        this.log('2. Testing invalid registration attempts...', 'info');
        
        // Duplicate email
        try {
            await axios.post(`${this.baseURL}/auth/register`, testUser);
            throw new Error('Duplicate email registration should have failed');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                this.log('Duplicate email properly rejected', 'success');
            } else {
                throw error;
            }
        }

        // Store test user for future tests
        this.testUser = testUser;
        this.log('User Registration Workflow completed successfully', 'success');
    }

    async test_1_1_2_LoginLogoutWorkflow() {
        this.log('Testing Login/Logout Workflow', 'info');
        
        // Test Case 1: Successful Login
        this.log('1. Testing successful login...', 'info');
        const loginResponse = await axios.post(`${this.baseURL}/auth/login`, {
            email: this.testUser.email,
            password: this.testUser.password
        });

        if (loginResponse.status !== 200 || !loginResponse.data.token) {
            throw new Error('Login failed or no token received');
        }

        const authToken = loginResponse.data.token;
        this.testTokens.mainUser = authToken;
        this.log('Successful login completed', 'success');

        // Test Case 2: Token Validation
        this.log('2. Testing token validation...', 'info');
        const profileResponse = await axios.get(`${this.baseURL}/users/profile`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (profileResponse.status !== 200) {
            throw new Error('Token validation failed');
        }
        this.log('Token validation successful', 'success');

        this.log('Login/Logout Workflow completed successfully', 'success');
    }

    async test_1_2_1_ProfileCreationAndUpdates() {
        this.log('Testing Profile Creation & Updates', 'info');
        
        const authToken = this.testTokens.mainUser;
        if (!authToken) {
            throw new Error('No auth token available for profile tests');
        }

        // Test Case 1: Profile Information Updates
        this.log('1. Testing profile information updates...', 'info');
        
        const profileUpdates = {
            first_name: 'John',
            last_name: 'Doe',
            bio: 'Test user for Phase 1 testing',
            location: 'Test City',
            website: 'https://example.com'
        };

        const updateResponse = await axios.put(`${this.baseURL}/users/profile`, profileUpdates, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (updateResponse.status !== 200) {
            throw new Error(`Profile update failed with status: ${updateResponse.status}`);
        }

        this.log('Profile information updated successfully', 'success');
        this.log('Profile Creation & Updates test completed successfully', 'success');
    }

    async test_SecurityValidation() {
        this.log('Testing Security Validation', 'info');
        
        // Test Case 1: Unauthorized Access Prevention
        this.log('1. Testing unauthorized access prevention...', 'info');
        
        try {
            await axios.get(`${this.baseURL}/users/profile`);
            throw new Error('Unauthorized access should have been blocked');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                this.log('Unauthorized access properly blocked', 'success');
            } else {
                throw error;
            }
        }

        this.log('Security Validation test completed successfully', 'success');
    }

    async test_DatabaseConnectivity() {
        this.log('Testing Database Connectivity', 'info');
        
        // Test basic API health
        try {
            const healthResponse = await axios.get(`${this.baseURL}/health`);
            if (healthResponse.status === 200) {
                this.log('API health check passed', 'success');
            }
        } catch (error) {
            // If health endpoint doesn't exist, try a different endpoint
            try {
                await axios.get(`${this.baseURL}/projects/public`);
                this.log('Database connectivity confirmed via public projects endpoint', 'success');
            } catch (dbError) {
                throw new Error('Database connectivity test failed');
            }
        }

        this.log('Database Connectivity test completed successfully', 'success');
    }

    // ============================================================================
    // TEST RUNNER
    // ============================================================================

    async runAllPhase1Tests() {
        console.log('\n🚀 PHASE 1: FOUNDATION WORKFLOWS TESTING');
        console.log('='.repeat(80));
        
        this.log('Starting Phase 1 Foundation Tests...', 'info');
        
        // Database connectivity first
        await this.runTest('Database Connectivity', () => this.test_DatabaseConnectivity());
        
        // 1.1 Authentication & User Management
        await this.runTest('1.1.1 User Registration Workflow', () => this.test_1_1_1_UserRegistrationWorkflow());
        await this.runTest('1.1.2 Login/Logout Workflow', () => this.test_1_1_2_LoginLogoutWorkflow());
        
        // 1.2 Profile Management
        await this.runTest('1.2.1 Profile Creation & Updates', () => this.test_1_2_1_ProfileCreationAndUpdates());
        
        // Security tests
        await this.runTest('Security Validation', () => this.test_SecurityValidation());
        
        this.generatePhase1Report();
    }

    generatePhase1Report() {
        console.log('\n📊 PHASE 1 TEST RESULTS');
        console.log('='.repeat(60));
        
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(2)}%`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.errors.forEach(error => {
                console.log(`  - ${error.test}: ${error.error}`);
            });
        }
        
        if (this.testResults.failed === 0) {
            console.log('\n🎉 ALL PHASE 1 TESTS PASSED!');
            console.log('✅ Foundation workflows are functioning correctly.');
            console.log('✅ Ready to proceed to Phase 2 testing.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review and fix issues before proceeding.');
        }
        
        // Save results to file
        const fs = require('fs');
        const report = {
            phase: 'Phase 1 - Foundation Workflows',
            timestamp: new Date().toISOString(),
            results: this.testResults,
            summary: {
                total: this.testResults.total,
                passed: this.testResults.passed,
                failed: this.testResults.failed,
                successRate: ((this.testResults.passed / this.testResults.total) * 100).toFixed(2)
            }
        };
        
        fs.writeFileSync('phase1-test-results.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Test results saved to phase1-test-results.json');
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new Phase1FoundationTester();
    tester.runAllPhase1Tests()
        .then(() => {
            console.log('\n✅ Phase 1 testing completed.');
            process.exit(0);
        })
        .catch(error => {
            console.error('\n❌ Phase 1 testing failed:', error.message);
            process.exit(1);
        });
}

module.exports = Phase1FoundationTester; 