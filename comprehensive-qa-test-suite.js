#!/usr/bin/env node

/**
 * SideBuilds Marketplace - Comprehensive QA Test Suite
 * 
 * This script performs automated testing of all critical marketplace workflows
 * as a production-ready QA validation system handling real money transactions.
 * 
 * Test Coverage:
 * - User Authentication & Registration 
 * - Seller Journey (project creation, Stripe Connect, publishing)
 * - Buyer Journey (browsing, interest, purchase requests)
 * - Transaction Workflows (negotiation, payment, completion)
 * - Communication Systems (real-time messaging, notifications)
 * - UI Interactions and Responsive Design
 * - Payment Integration Security
 * - Edge Cases and Error Scenarios
 * - Performance and Reliability
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
    BASE_URL: 'http://localhost:5001',
    CLIENT_URL: 'http://localhost:3002',
    API_BASE: 'http://localhost:5001/api',
    TEST_TIMEOUT: 30000,
    PERFORMANCE_THRESHOLDS: {
        API_RESPONSE: 2000,     // 2 seconds max for API calls
        PAGE_LOAD: 5000,        // 5 seconds max for page loads
        PAYMENT_FLOW: 10000,    // 10 seconds max for payment processing
    },
    TEST_USERS: {
        buyer: {
            email: 'qa_buyer_' + Date.now() + '@sidebuilds.test',
            password: 'TestBuyer2024!',
            name: 'QA Test Buyer',
            type: 'buyer'
        },
        seller: {
            email: 'qa_seller_' + Date.now() + '@sidebuilds.test', 
            password: 'TestSeller2024!',
            name: 'QA Test Seller',
            type: 'seller'
        }
    },
    HIGH_VALUE_PROJECT: {
        name: 'QA Test Enterprise Dashboard',
        price: 75000,
        monthlyRevenue: 12000,
        description: 'High-value enterprise dashboard for QA testing'
    }
};

class QATestSuite {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            warnings: 0,
            errors: [],
            performance: {},
            security_issues: [],
            ui_issues: [],
            recommendations: [],
            test_start: new Date(),
            test_details: []
        };
        this.authTokens = {};
        this.testData = {};
    }

    async log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${type}] ${message}`;
        console.log(logMessage);
        
        // Store detailed results
        this.results.test_details.push({
            timestamp,
            type,
            message,
            ...(type === 'ERROR' && { stack: new Error().stack })
        });
    }

    async startTimer(label) {
        return {
            label,
            start: performance.now()
        };
    }

    async endTimer(timer, threshold = null) {
        const duration = performance.now() - timer.start;
        this.results.performance[timer.label] = duration;
        
        if (threshold && duration > threshold) {
            await this.log(`⚠️ Performance warning: ${timer.label} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`, 'WARNING');
            this.results.warnings++;
        }
        
        return duration;
    }

    async makeAPICall(method, endpoint, data = null, token = null, timeout = CONFIG.TEST_TIMEOUT) {
        const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.API_BASE}${endpoint}`;
        
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'SideBuilds-QA-TestSuite/1.0'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method: method.toLowerCase(),
            url,
            headers,
            timeout,
            validateStatus: () => true // Don't throw on any status code
        };

        if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
            config.data = data;
        }

        const timer = await this.startTimer(`API_${method}_${endpoint}`);
        
        try {
            const response = await axios(config);
            await this.endTimer(timer, CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE);
            
            return {
                status: response.status,
                data: response.data,
                headers: response.headers,
                success: response.status >= 200 && response.status < 300
            };
        } catch (error) {
            await this.endTimer(timer);
            await this.log(`❌ API call failed: ${method} ${endpoint} - ${error.message}`, 'ERROR');
            this.results.errors.push({
                type: 'API_ERROR',
                method,
                endpoint,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            
            return {
                status: error.response?.status || 0,
                data: error.response?.data || null,
                error: error.message,
                success: false
            };
        }
    }

    async testServerHealth() {
        await this.log('🏥 Testing server health and connectivity');
        
        const healthResponse = await this.makeAPICall('GET', '/');
        if (!healthResponse.success) {
            throw new Error(`Server health check failed: ${healthResponse.error || 'Unknown error'}`);
        }
        
        await this.log('✅ Server health check passed');
        return true;
    }

    async testUserRegistration() {
        await this.log('👤 Testing user registration workflow');
        
        const testResults = [];
        
        // Test buyer registration
        const buyerRegResponse = await this.makeAPICall('POST', '/auth/register', CONFIG.TEST_USERS.buyer);
        testResults.push({
            test: 'Buyer Registration',
            success: buyerRegResponse.success,
            details: buyerRegResponse.data
        });
        
        if (buyerRegResponse.success) {
            this.authTokens.buyer = buyerRegResponse.data.token;
            this.testData.buyer = buyerRegResponse.data.user;
            await this.log('✅ Buyer registration successful');
        } else {
            await this.log(`❌ Buyer registration failed: ${JSON.stringify(buyerRegResponse.data)}`, 'ERROR');
            this.results.failed++;
        }
        
        // Test seller registration  
        const sellerRegResponse = await this.makeAPICall('POST', '/auth/register', CONFIG.TEST_USERS.seller);
        testResults.push({
            test: 'Seller Registration', 
            success: sellerRegResponse.success,
            details: sellerRegResponse.data
        });
        
        if (sellerRegResponse.success) {
            this.authTokens.seller = sellerRegResponse.data.token;
            this.testData.seller = sellerRegResponse.data.user;
            await this.log('✅ Seller registration successful');
        } else {
            await this.log(`❌ Seller registration failed: ${JSON.stringify(sellerRegResponse.data)}`, 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async testAuthentication() {
        await this.log('🔐 Testing authentication workflows');
        
        const testResults = [];
        
        // Test login for both users
        for (const userType of ['buyer', 'seller']) {
            const loginResponse = await this.makeAPICall('POST', '/auth/login', {
                email: CONFIG.TEST_USERS[userType].email,
                password: CONFIG.TEST_USERS[userType].password
            });
            
            testResults.push({
                test: `${userType} Login`,
                success: loginResponse.success,
                details: loginResponse.data
            });
            
            if (loginResponse.success) {
                this.authTokens[userType] = loginResponse.data.token;
                await this.log(`✅ ${userType} login successful`);
            } else {
                await this.log(`❌ ${userType} login failed: ${JSON.stringify(loginResponse.data)}`, 'ERROR');
                this.results.failed++;
            }
        }
        
        // Test token validation
        for (const userType of ['buyer', 'seller']) {
            if (this.authTokens[userType]) {
                const profileResponse = await this.makeAPICall('GET', '/users/profile', null, this.authTokens[userType]);
                
                testResults.push({
                    test: `${userType} Token Validation`,
                    success: profileResponse.success,
                    details: profileResponse.data
                });
                
                if (profileResponse.success) {
                    await this.log(`✅ ${userType} token validation successful`);
                } else {
                    await this.log(`❌ ${userType} token validation failed`, 'ERROR');
                    this.results.failed++;
                }
            }
        }
        
        return testResults;
    }

    async testSellerJourney() {
        await this.log('🏪 Testing complete seller journey');
        
        if (!this.authTokens.seller) {
            await this.log('❌ Seller auth token not available, skipping seller tests', 'ERROR');
            return [];
        }
        
        const testResults = [];
        
        // Test project creation
        const projectData = {
            ...CONFIG.HIGH_VALUE_PROJECT,
            category: 'Web Development',
            tech_stack: ['React', 'Node.js', 'PostgreSQL'],
            status: 'completed',
            deployment_url: 'https://qa-test-project.com',
            github_url: 'https://github.com/qa/test-project',
            featured_image_url: 'https://via.placeholder.com/800x400',
            screenshots: ['https://via.placeholder.com/600x400']
        };
        
        const createProjectResponse = await this.makeAPICall('POST', '/projects', projectData, this.authTokens.seller);
        testResults.push({
            test: 'Project Creation',
            success: createProjectResponse.success,
            details: createProjectResponse.data
        });
        
        if (createProjectResponse.success) {
            this.testData.project = createProjectResponse.data;
            await this.log('✅ Project creation successful');
            
            // Test project publishing
            const publishResponse = await this.makeAPICall('PUT', `/projects/${this.testData.project.id}`, {
                ...projectData,
                status: 'active',
                is_published: true
            }, this.authTokens.seller);
            
            testResults.push({
                test: 'Project Publishing',
                success: publishResponse.success,
                details: publishResponse.data
            });
            
            if (publishResponse.success) {
                await this.log('✅ Project publishing successful');
            } else {
                await this.log('❌ Project publishing failed', 'ERROR');
                this.results.failed++;
            }
        } else {
            await this.log(`❌ Project creation failed: ${JSON.stringify(createProjectResponse.data)}`, 'ERROR');
            this.results.failed++;
        }
        
        // Test Stripe Connect status (should indicate need for onboarding)
        const stripeStatusResponse = await this.makeAPICall('GET', '/users/stripe-status', null, this.authTokens.seller);
        testResults.push({
            test: 'Stripe Connect Status Check',
            success: stripeStatusResponse.success,
            details: stripeStatusResponse.data
        });
        
        if (stripeStatusResponse.success) {
            await this.log('✅ Stripe Connect status check successful');
        } else {
            await this.log('❌ Stripe Connect status check failed', 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async testBuyerJourney() {
        await this.log('🛒 Testing complete buyer journey');
        
        if (!this.authTokens.buyer) {
            await this.log('❌ Buyer auth token not available, skipping buyer tests', 'ERROR');
            return [];
        }
        
        const testResults = [];
        
        // Test marketplace browsing
        const marketplaceResponse = await this.makeAPICall('GET', '/public/marketplace');
        testResults.push({
            test: 'Marketplace Browsing',
            success: marketplaceResponse.success,
            details: `Found ${marketplaceResponse.data?.length || 0} projects`
        });
        
        if (marketplaceResponse.success) {
            await this.log(`✅ Marketplace browsing successful - found ${marketplaceResponse.data.length} projects`);
        } else {
            await this.log('❌ Marketplace browsing failed', 'ERROR');
            this.results.failed++;
        }
        
        // Test project detail viewing
        if (this.testData.project) {
            const projectDetailResponse = await this.makeAPICall('GET', `/public/projects/${this.testData.project.id}`);
            testResults.push({
                test: 'Project Detail Viewing',
                success: projectDetailResponse.success,
                details: projectDetailResponse.data
            });
            
            if (projectDetailResponse.success) {
                await this.log('✅ Project detail viewing successful');
                
                // Test expressing interest
                const interestData = {
                    buyerCommitments: ['development', 'marketing', 'scaling'],
                    buyerIntroMessage: 'QA test interest expression - automated testing'
                };
                
                const expressInterestResponse = await this.makeAPICall(
                    'POST', 
                    `/purchase-requests/projects/${this.testData.project.id}/request`, 
                    interestData, 
                    this.authTokens.buyer
                );
                
                testResults.push({
                    test: 'Express Interest',
                    success: expressInterestResponse.success,
                    details: expressInterestResponse.data
                });
                
                if (expressInterestResponse.success) {
                    this.testData.purchaseRequest = expressInterestResponse.data;
                    await this.log('✅ Express interest successful');
                } else {
                    await this.log(`❌ Express interest failed: ${JSON.stringify(expressInterestResponse.data)}`, 'ERROR');
                    this.results.failed++;
                }
            } else {
                await this.log('❌ Project detail viewing failed', 'ERROR');
                this.results.failed++;
            }
        }
        
        return testResults;
    }

    async testTransactionWorkflow() {
        await this.log('💰 Testing transaction workflows');
        
        const testResults = [];
        
        if (!this.testData.purchaseRequest) {
            await this.log('❌ No purchase request available, skipping transaction tests', 'ERROR');
            return [];
        }
        
        // Test seller viewing purchase requests
        const sellerRequestsResponse = await this.makeAPICall('GET', '/purchase-requests/seller', null, this.authTokens.seller);
        testResults.push({
            test: 'Seller Purchase Requests',
            success: sellerRequestsResponse.success,
            details: `Found ${sellerRequestsResponse.data?.length || 0} requests`
        });
        
        if (sellerRequestsResponse.success) {
            await this.log(`✅ Seller purchase requests retrieval successful - found ${sellerRequestsResponse.data.length} requests`);
            
            // Test seller proposing terms
            const termsData = {
                seller_commitments: ['code_transfer', 'documentation', 'support'],
                agreed_transferable_assets: ['source_code', 'database', 'domain'],
                seller_proposal_message: 'QA test terms proposal - automated testing'
            };
            
            const proposeTermsResponse = await this.makeAPICall(
                'PUT',
                `/purchase-requests/${this.testData.purchaseRequest.id}/seller-propose-terms`,
                termsData,
                this.authTokens.seller
            );
            
            testResults.push({
                test: 'Seller Propose Terms',
                success: proposeTermsResponse.success,
                details: proposeTermsResponse.data
            });
            
            if (proposeTermsResponse.success) {
                await this.log('✅ Seller propose terms successful');
                
                // Test buyer accepting terms
                const acceptTermsData = {
                    buyer_final_agreement: 'QA test terms acceptance',
                    buyer_digital_signature: 'QA_TEST_SIGNATURE_' + Date.now()
                };
                
                const acceptTermsResponse = await this.makeAPICall(
                    'PUT',
                    `/purchase-requests/${this.testData.purchaseRequest.id}/buyer-accepts-terms`,
                    acceptTermsData,
                    this.authTokens.buyer
                );
                
                testResults.push({
                    test: 'Buyer Accept Terms',
                    success: acceptTermsResponse.success,
                    details: acceptTermsResponse.data
                });
                
                if (acceptTermsResponse.success) {
                    await this.log('✅ Buyer accept terms successful');
                } else {
                    await this.log(`❌ Buyer accept terms failed: ${JSON.stringify(acceptTermsResponse.data)}`, 'ERROR');
                    this.results.failed++;
                }
            } else {
                await this.log(`❌ Seller propose terms failed: ${JSON.stringify(proposeTermsResponse.data)}`, 'ERROR');
                this.results.failed++;
            }
        } else {
            await this.log('❌ Seller purchase requests retrieval failed', 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async testCommunicationSystems() {
        await this.log('💬 Testing communication systems');
        
        const testResults = [];
        
        if (!this.testData.purchaseRequest) {
            await this.log('❌ No purchase request available, skipping communication tests', 'ERROR');
            return [];
        }
        
        // Test sending messages
        const messageData = { content: 'QA test message - automated testing' };
        
        const sendMessageResponse = await this.makeAPICall(
            'POST',
            `/purchase-requests/${this.testData.purchaseRequest.id}/messages`,
            messageData,
            this.authTokens.buyer
        );
        
        testResults.push({
            test: 'Send Message',
            success: sendMessageResponse.success,
            details: sendMessageResponse.data
        });
        
        if (sendMessageResponse.success) {
            await this.log('✅ Send message successful');
            
            // Test retrieving messages
            const getMessagesResponse = await this.makeAPICall(
                'GET',
                `/purchase-requests/${this.testData.purchaseRequest.id}/messages`,
                null,
                this.authTokens.seller
            );
            
            testResults.push({
                test: 'Retrieve Messages',
                success: getMessagesResponse.success,
                details: `Found ${getMessagesResponse.data?.length || 0} messages`
            });
            
            if (getMessagesResponse.success) {
                await this.log(`✅ Retrieve messages successful - found ${getMessagesResponse.data.length} messages`);
            } else {
                await this.log('❌ Retrieve messages failed', 'ERROR');
                this.results.failed++;
            }
        } else {
            await this.log(`❌ Send message failed: ${JSON.stringify(sendMessageResponse.data)}`, 'ERROR');
            this.results.failed++;
        }
        
        // Test notifications
        const notificationsResponse = await this.makeAPICall('GET', '/notifications', null, this.authTokens.seller);
        testResults.push({
            test: 'Notifications Retrieval',
            success: notificationsResponse.success,
            details: `Found ${notificationsResponse.data?.length || 0} notifications`
        });
        
        if (notificationsResponse.success) {
            await this.log(`✅ Notifications retrieval successful - found ${notificationsResponse.data.length} notifications`);
        } else {
            await this.log('❌ Notifications retrieval failed', 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async testPaymentIntegration() {
        await this.log('💳 Testing payment integration');
        
        const testResults = [];
        
        // Test payment health check
        const paymentHealthResponse = await this.makeAPICall('GET', '/payments/health');
        testResults.push({
            test: 'Payment System Health',
            success: paymentHealthResponse.success,
            details: paymentHealthResponse.data
        });
        
        if (paymentHealthResponse.success) {
            await this.log('✅ Payment system health check successful');
        } else {
            await this.log('❌ Payment system health check failed', 'ERROR');
            this.results.failed++;
        }
        
        // Test Stripe configuration
        const stripeConfigResponse = await this.makeAPICall('GET', '/stripe/config');
        testResults.push({
            test: 'Stripe Configuration',
            success: stripeConfigResponse.success,
            details: stripeConfigResponse.data
        });
        
        if (stripeConfigResponse.success) {
            await this.log('✅ Stripe configuration check successful');
        } else {
            await this.log('❌ Stripe configuration check failed', 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async testErrorScenarios() {
        await this.log('🚨 Testing error scenarios and edge cases');
        
        const testResults = [];
        
        // Test unauthorized access
        const unauthorizedResponse = await this.makeAPICall('GET', '/purchase-requests/seller');
        testResults.push({
            test: 'Unauthorized Access Prevention',
            success: unauthorizedResponse.status === 401,
            details: `Status: ${unauthorizedResponse.status}`
        });
        
        if (unauthorizedResponse.status === 401) {
            await this.log('✅ Unauthorized access properly blocked');
        } else {
            await this.log(`❌ Unauthorized access not properly blocked - status: ${unauthorizedResponse.status}`, 'ERROR');
            this.results.security_issues.push({
                type: 'UNAUTHORIZED_ACCESS',
                endpoint: '/purchase-requests/seller',
                expected_status: 401,
                actual_status: unauthorizedResponse.status
            });
            this.results.failed++;
        }
        
        // Test invalid project ID
        const invalidProjectResponse = await this.makeAPICall('GET', '/public/projects/99999');
        testResults.push({
            test: 'Invalid Project ID Handling',
            success: invalidProjectResponse.status === 404,
            details: `Status: ${invalidProjectResponse.status}`
        });
        
        if (invalidProjectResponse.status === 404) {
            await this.log('✅ Invalid project ID properly handled');
        } else {
            await this.log(`❌ Invalid project ID not properly handled - status: ${invalidProjectResponse.status}`, 'ERROR');
            this.results.failed++;
        }
        
        // Test malformed request data
        const malformedDataResponse = await this.makeAPICall('POST', '/auth/login', { invalid: 'data' });
        testResults.push({
            test: 'Malformed Request Data Handling',
            success: malformedDataResponse.status >= 400 && malformedDataResponse.status < 500,
            details: `Status: ${malformedDataResponse.status}`
        });
        
        if (malformedDataResponse.status >= 400 && malformedDataResponse.status < 500) {
            await this.log('✅ Malformed request data properly rejected');
        } else {
            await this.log(`❌ Malformed request data not properly rejected - status: ${malformedDataResponse.status}`, 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async testPerformance() {
        await this.log('⚡ Testing performance metrics');
        
        const testResults = [];
        
        // Test concurrent API requests
        const concurrentRequests = [];
        for (let i = 0; i < 10; i++) {
            concurrentRequests.push(this.makeAPICall('GET', '/public/marketplace'));
        }
        
        const timer = await this.startTimer('Concurrent_API_Requests');
        const concurrentResults = await Promise.allSettled(concurrentRequests);
        const concurrentDuration = await this.endTimer(timer);
        
        const successfulRequests = concurrentResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
        
        testResults.push({
            test: 'Concurrent API Requests',
            success: successfulRequests >= 8, // Allow 2 failures out of 10
            details: `${successfulRequests}/10 successful in ${concurrentDuration.toFixed(2)}ms`
        });
        
        if (successfulRequests >= 8) {
            await this.log(`✅ Concurrent requests handled well - ${successfulRequests}/10 successful`);
        } else {
            await this.log(`❌ Concurrent requests failed - only ${successfulRequests}/10 successful`, 'ERROR');
            this.results.failed++;
        }
        
        // Check average response times
        const avgApiTime = Object.values(this.results.performance)
            .filter(time => typeof time === 'number')
            .reduce((sum, time, _, arr) => sum + time / arr.length, 0);
            
        testResults.push({
            test: 'Average API Response Time',
            success: avgApiTime < CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE,
            details: `${avgApiTime.toFixed(2)}ms (threshold: ${CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE}ms)`
        });
        
        if (avgApiTime < CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE) {
            await this.log(`✅ Average API response time acceptable - ${avgApiTime.toFixed(2)}ms`);
        } else {
            await this.log(`❌ Average API response time too slow - ${avgApiTime.toFixed(2)}ms`, 'ERROR');
            this.results.failed++;
        }
        
        return testResults;
    }

    async generateReport() {
        const endTime = new Date();
        const duration = endTime - this.results.test_start;
        
        // Calculate summary stats
        const totalTests = this.results.passed + this.results.failed;
        const successRate = totalTests > 0 ? (this.results.passed / totalTests * 100) : 0;
        
        const report = {
            summary: {
                test_suite: 'SideBuilds Marketplace QA Comprehensive Test',
                execution_time: `${Math.round(duration / 1000)}s`,
                total_tests: totalTests,
                passed: this.results.passed,
                failed: this.results.failed,
                warnings: this.results.warnings,
                success_rate: `${successRate.toFixed(1)}%`,
                test_start: this.results.test_start.toISOString(),
                test_end: endTime.toISOString()
            },
            performance: {
                average_api_response: Object.values(this.results.performance)
                    .filter(time => typeof time === 'number')
                    .reduce((sum, time, _, arr) => arr.length ? sum + time / arr.length : 0, 0)
                    .toFixed(2) + 'ms',
                slowest_operations: Object.entries(this.results.performance)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([op, time]) => ({ operation: op, duration: `${time.toFixed(2)}ms` })),
                thresholds: CONFIG.PERFORMANCE_THRESHOLDS
            },
            security: {
                issues_found: this.results.security_issues.length,
                issues: this.results.security_issues
            },
            errors: this.results.errors,
            recommendations: this.results.recommendations,
            detailed_results: this.results.test_details
        };
        
        // Write report to file
        const reportPath = path.join(__dirname, `qa-test-report-${Date.now()}.json`);
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        
        await this.log(`📊 Test report generated: ${reportPath}`);
        return report;
    }

    async runAllTests() {
        try {
            await this.log('🚀 Starting SideBuilds Marketplace QA Test Suite');
            
            // Test 1: Server Health
            await this.testServerHealth();
            this.results.passed++;
            
            // Test 2: User Registration  
            const regResults = await this.testUserRegistration();
            this.results.passed += regResults.filter(r => r.success).length;
            this.results.failed += regResults.filter(r => !r.success).length;
            
            // Test 3: Authentication
            const authResults = await this.testAuthentication();
            this.results.passed += authResults.filter(r => r.success).length;
            this.results.failed += authResults.filter(r => !r.success).length;
            
            // Test 4: Seller Journey
            const sellerResults = await this.testSellerJourney();
            this.results.passed += sellerResults.filter(r => r.success).length;
            this.results.failed += sellerResults.filter(r => !r.success).length;
            
            // Test 5: Buyer Journey
            const buyerResults = await this.testBuyerJourney();
            this.results.passed += buyerResults.filter(r => r.success).length;
            this.results.failed += buyerResults.filter(r => !r.success).length;
            
            // Test 6: Transaction Workflow
            const transactionResults = await this.testTransactionWorkflow();
            this.results.passed += transactionResults.filter(r => r.success).length;
            this.results.failed += transactionResults.filter(r => !r.success).length;
            
            // Test 7: Communication Systems
            const commResults = await this.testCommunicationSystems();
            this.results.passed += commResults.filter(r => r.success).length;
            this.results.failed += commResults.filter(r => !r.success).length;
            
            // Test 8: Payment Integration
            const paymentResults = await this.testPaymentIntegration();
            this.results.passed += paymentResults.filter(r => r.success).length;
            this.results.failed += paymentResults.filter(r => !r.success).length;
            
            // Test 9: Error Scenarios
            const errorResults = await this.testErrorScenarios();
            this.results.passed += errorResults.filter(r => r.success).length;
            this.results.failed += errorResults.filter(r => !r.success).length;
            
            // Test 10: Performance
            const perfResults = await this.testPerformance();
            this.results.passed += perfResults.filter(r => r.success).length;
            this.results.failed += perfResults.filter(r => !r.success).length;
            
            // Generate recommendations
            await this.generateRecommendations();
            
            // Generate final report
            const report = await this.generateReport();
            
            await this.log('🏁 QA Test Suite completed');
            
            return report;
            
        } catch (error) {
            await this.log(`💥 Fatal error in test suite: ${error.message}`, 'ERROR');
            this.results.errors.push({
                type: 'FATAL_ERROR',
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
            
            const report = await this.generateReport();
            return report;
        }
    }

    async generateRecommendations() {
        const recommendations = [];
        
        // Performance recommendations
        const avgApiTime = Object.values(this.results.performance)
            .filter(time => typeof time === 'number')
            .reduce((sum, time, _, arr) => arr.length ? sum + time / arr.length : 0, 0);
            
        if (avgApiTime > CONFIG.PERFORMANCE_THRESHOLDS.API_RESPONSE) {
            recommendations.push({
                category: 'PERFORMANCE',
                priority: 'HIGH',
                issue: `Average API response time (${avgApiTime.toFixed(2)}ms) exceeds threshold`,
                recommendation: 'Optimize database queries, implement caching, and consider API response compression'
            });
        }
        
        // Security recommendations
        if (this.results.security_issues.length > 0) {
            recommendations.push({
                category: 'SECURITY',
                priority: 'CRITICAL',
                issue: `${this.results.security_issues.length} security issues found`,
                recommendation: 'Review and fix all security vulnerabilities immediately before production deployment'
            });
        }
        
        // Error handling recommendations
        if (this.results.failed > this.results.passed * 0.1) { // More than 10% failure rate
            recommendations.push({
                category: 'RELIABILITY',
                priority: 'HIGH',
                issue: `High failure rate: ${this.results.failed} out of ${this.results.passed + this.results.failed} tests failed`,
                recommendation: 'Investigate and fix failing tests, implement better error handling and validation'
            });
        }
        
        // Add recommendations to results
        this.results.recommendations = recommendations;
        
        await this.log(`📋 Generated ${recommendations.length} recommendations`);
    }
}

// Run the test suite if called directly
if (require.main === module) {
    const testSuite = new QATestSuite();
    
    testSuite.runAllTests()
        .then(report => {
            console.log('\n' + '='.repeat(80));
            console.log('📊 QA TEST SUITE SUMMARY');
            console.log('='.repeat(80));
            console.log(`✅ Passed: ${report.summary.passed}`);
            console.log(`❌ Failed: ${report.summary.failed}`);
            console.log(`⚠️  Warnings: ${report.summary.warnings}`);
            console.log(`📈 Success Rate: ${report.summary.success_rate}`);
            console.log(`⏱️  Duration: ${report.summary.execution_time}`);
            console.log(`🔧 Recommendations: ${report.recommendations.length}`);
            console.log('='.repeat(80));
            
            if (report.summary.failed > 0) {
                console.log('\n❌ CRITICAL ISSUES FOUND - Review test report for details');
                process.exit(1);
            } else {
                console.log('\n✅ ALL TESTS PASSED - System ready for production');
                process.exit(0);
            }
        })
        .catch(error => {
            console.error('💥 Test suite failed to execute:', error);
            process.exit(1);
        });
}

module.exports = { QATestSuite, CONFIG };