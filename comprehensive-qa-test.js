#!/usr/bin/env node

/**
 * SideBuilds Comprehensive QA Test Suite
 * Tests all critical marketplace workflows with detailed reporting
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:5001/api';
const TEST_RESULTS_FILE = path.join(__dirname, 'comprehensive-test-results.json');

// Test Results Storage
let testResults = {
    summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        startTime: new Date().toISOString(),
        endTime: null
    },
    categories: {},
    detailedFindings: []
};

// Utility Functions
function logTest(category, testName, status, details = '', recommendations = []) {
    testResults.summary.totalTests++;
    
    if (!testResults.categories[category]) {
        testResults.categories[category] = { passed: 0, failed: 0, warnings: 0, tests: [] };
    }
    
    const testResult = {
        name: testName,
        status: status,
        details: details,
        recommendations: recommendations,
        timestamp: new Date().toISOString()
    };
    
    testResults.categories[category].tests.push(testResult);
    testResults.categories[category][status]++;
    testResults.summary[status]++;
    
    console.log(`[${category}] ${testName}: ${status.toUpperCase()}`);
    if (details) console.log(`   Details: ${details}`);
    if (recommendations.length > 0) {
        console.log(`   Recommendations:`);
        recommendations.forEach(rec => console.log(`     - ${rec}`));
    }
}

function addDetailedFinding(category, severity, title, description, codeReference, solution) {
    testResults.detailedFindings.push({
        category,
        severity,
        title,
        description,
        codeReference,
        solution,
        timestamp: new Date().toISOString()
    });
}

async function testUrlAccess(url, expectedStatus = 200, testName = '', category = 'Technical') {
    try {
        const response = await axios.get(url, { timeout: 10000 });
        if (response.status === expectedStatus) {
            logTest(category, testName || `Access ${url}`, 'passed', `Status: ${response.status}`);
            return { success: true, status: response.status, data: response.data };
        } else {
            logTest(category, testName || `Access ${url}`, 'failed', `Expected ${expectedStatus}, got ${response.status}`);
            return { success: false, status: response.status };
        }
    } catch (error) {
        logTest(category, testName || `Access ${url}`, 'failed', `Error: ${error.message}`, [
            'Check server connectivity',
            'Verify URL correctness',
            'Check CORS configuration'
        ]);
        return { success: false, error: error.message };
    }
}

async function testApiEndpoint(endpoint, method = 'GET', data = null, headers = {}, expectedStatus = 200, testName = '', category = 'API') {
    try {
        const config = {
            method,
            url: `${API_URL}${endpoint}`,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        
        if (response.status === expectedStatus) {
            logTest(category, testName || `${method} ${endpoint}`, 'passed', `Status: ${response.status}`);
            return { success: true, status: response.status, data: response.data };
        } else {
            logTest(category, testName || `${method} ${endpoint}`, 'failed', `Expected ${expectedStatus}, got ${response.status}`);
            return { success: false, status: response.status, data: response.data };
        }
    } catch (error) {
        const status = error.response ? error.response.status : 'Connection Error';
        const message = error.response ? error.response.data?.message || error.message : error.message;
        
        logTest(category, testName || `${method} ${endpoint}`, 'failed', `Status: ${status}, Error: ${message}`, [
            'Check API endpoint implementation',
            'Verify request format and authentication',
            'Check server logs for detailed error information'
        ]);
        
        return { success: false, status, error: message };
    }
}

// Test Categories

async function testCoreAuthentication() {
    console.log('\n=== TESTING CORE AUTHENTICATION ===');
    
    // Test registration endpoint
    await testApiEndpoint('/auth/register', 'POST', {
        username: 'testuser' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        password: 'TestPassword123!'
    }, {}, 201, 'User Registration', 'Authentication');
    
    // Test login endpoint
    const loginResult = await testApiEndpoint('/auth/login', 'POST', {
        email: 'test@example.com',
        password: 'password123'
    }, {}, 200, 'User Login', 'Authentication');
    
    // Test protected route access
    if (loginResult.success && loginResult.data.token) {
        await testApiEndpoint('/auth/profile', 'GET', null, {
            'Authorization': `Bearer ${loginResult.data.token}`
        }, 200, 'Protected Route Access', 'Authentication');
    }
    
    // Test invalid credentials
    await testApiEndpoint('/auth/login', 'POST', {
        email: 'invalid@example.com',
        password: 'wrongpassword'
    }, {}, 401, 'Invalid Login Credentials', 'Authentication');
    
    // Test password reset endpoint
    await testApiEndpoint('/auth/forgot-password', 'POST', {
        email: 'test@example.com'
    }, {}, 200, 'Password Reset Request', 'Authentication');
}

async function testProjectManagement() {
    console.log('\n=== TESTING PROJECT MANAGEMENT ===');
    
    // Test get all projects
    await testApiEndpoint('/projects', 'GET', null, {}, 200, 'Get All Projects', 'Projects');
    
    // Test create project (would need authentication)
    await testApiEndpoint('/projects', 'POST', {
        title: 'Test Project',
        description: 'A test project for QA',
        price: 1000,
        category: 'Web Development'
    }, {}, 401, 'Create Project (No Auth)', 'Projects');
    
    // Test get project by ID
    await testApiEndpoint('/projects/1', 'GET', null, {}, 200, 'Get Project by ID', 'Projects');
    
    // Test invalid project ID
    await testApiEndpoint('/projects/999999', 'GET', null, {}, 404, 'Get Invalid Project ID', 'Projects');
}

async function testPaymentSystem() {
    console.log('\n=== TESTING PAYMENT SYSTEM ===');
    
    // Test Stripe configuration endpoint
    await testApiEndpoint('/stripe/config', 'GET', null, {}, 200, 'Stripe Configuration', 'Payments');
    
    // Test create payment intent (would need authentication)
    await testApiEndpoint('/stripe/create-payment-intent', 'POST', {
        amount: 1000,
        projectId: 1
    }, {}, 401, 'Create Payment Intent (No Auth)', 'Payments');
    
    // Test webhook endpoint
    await testApiEndpoint('/stripe/webhook', 'POST', {}, {}, 400, 'Stripe Webhook (Invalid)', 'Payments');
}

async function testPurchaseRequests() {
    console.log('\n=== TESTING PURCHASE REQUESTS ===');
    
    // Test get purchase requests (would need authentication)
    await testApiEndpoint('/purchase-requests', 'GET', null, {}, 401, 'Get Purchase Requests (No Auth)', 'Purchase Requests');
    
    // Test create purchase request (would need authentication)
    await testApiEndpoint('/purchase-requests', 'POST', {
        projectId: 1,
        offerAmount: 500,
        message: 'Interested in purchasing this project'
    }, {}, 401, 'Create Purchase Request (No Auth)', 'Purchase Requests');
}

async function testNotificationSystem() {
    console.log('\n=== TESTING NOTIFICATION SYSTEM ===');
    
    // Test get notifications (would need authentication)
    await testApiEndpoint('/notifications', 'GET', null, {}, 401, 'Get Notifications (No Auth)', 'Notifications');
    
    // Test mark notification as read (would need authentication)
    await testApiEndpoint('/notifications/1/read', 'PUT', {}, {}, 401, 'Mark Notification Read (No Auth)', 'Notifications');
}

async function testUserManagement() {
    console.log('\n=== TESTING USER MANAGEMENT ===');
    
    // Test get user profile (would need authentication)
    await testApiEndpoint('/users/profile', 'GET', null, {}, 401, 'Get User Profile (No Auth)', 'Users');
    
    // Test update user profile (would need authentication)
    await testApiEndpoint('/users/profile', 'PUT', {
        username: 'updateduser',
        bio: 'Updated bio'
    }, {}, 401, 'Update User Profile (No Auth)', 'Users');
}

async function testFrontendPages() {
    console.log('\n=== TESTING FRONTEND PAGES ===');
    
    // Test main pages accessibility
    await testUrlAccess(`${BASE_URL}`, 200, 'Home Page', 'Frontend');
    await testUrlAccess(`${BASE_URL}/login`, 200, 'Login Page', 'Frontend');
    await testUrlAccess(`${BASE_URL}/register`, 200, 'Registration Page', 'Frontend');
    await testUrlAccess(`${BASE_URL}/marketplace`, 200, 'Marketplace Page', 'Frontend');
    await testUrlAccess(`${BASE_URL}/dashboard`, 200, 'Dashboard Page', 'Frontend');
    await testUrlAccess(`${BASE_URL}/profile`, 200, 'Profile Page', 'Frontend');
    
    // Test non-existent page
    await testUrlAccess(`${BASE_URL}/nonexistent`, 200, '404 Page Handling', 'Frontend');
}

async function testSecurityHeaders() {
    console.log('\n=== TESTING SECURITY HEADERS ===');
    
    try {
        const response = await axios.get(API_URL, { timeout: 10000 });
        const headers = response.headers;
        
        // Check for security headers
        const securityHeaders = [
            'x-content-type-options',
            'x-frame-options',
            'x-xss-protection'
        ];
        
        securityHeaders.forEach(header => {
            if (headers[header]) {
                logTest('Security', `Security Header: ${header}`, 'passed', `Value: ${headers[header]}`);
            } else {
                logTest('Security', `Security Header: ${header}`, 'failed', 'Header missing', [
                    `Add ${header} header to server configuration`,
                    'Review security middleware implementation'
                ]);
            }
        });
        
        // Check CORS headers
        if (headers['access-control-allow-origin']) {
            logTest('Security', 'CORS Configuration', 'passed', `Origin: ${headers['access-control-allow-origin']}`);
        } else {
            logTest('Security', 'CORS Configuration', 'failed', 'CORS headers missing');
        }
        
    } catch (error) {
        logTest('Security', 'Security Headers Test', 'failed', `Error: ${error.message}`);
    }
}

async function testDatabaseConnectivity() {
    console.log('\n=== TESTING DATABASE CONNECTIVITY ===');
    
    // Test basic endpoint that would require DB
    const result = await testApiEndpoint('/projects', 'GET', null, {}, 200, 'Database Query Test', 'Database');
    
    if (result.success) {
        if (Array.isArray(result.data)) {
            logTest('Database', 'Database Data Structure', 'passed', `Returned ${result.data.length} projects`);
        } else {
            logTest('Database', 'Database Data Structure', 'failed', 'Expected array response', [
                'Check database query implementation',
                'Verify API response formatting'
            ]);
        }
    }
}

async function testRealTimeFeatures() {
    console.log('\n=== TESTING REAL-TIME FEATURES ===');
    
    // Test Socket.IO endpoint accessibility
    try {
        const response = await axios.get('http://localhost:5001/socket.io/', { timeout: 5000 });
        if (response.status === 200) {
            logTest('Real-time', 'Socket.IO Server', 'passed', 'Socket.IO server accessible');
        }
    } catch (error) {
        if (error.response && error.response.status === 400) {
            // This is expected for Socket.IO without proper handshake
            logTest('Real-time', 'Socket.IO Server', 'passed', 'Socket.IO server running (expected 400 response)');
        } else {
            logTest('Real-time', 'Socket.IO Server', 'failed', `Error: ${error.message}`, [
                'Check Socket.IO server configuration',
                'Verify port and CORS settings'
            ]);
        }
    }
}

async function generateDetailedReport() {
    console.log('\n=== GENERATING DETAILED REPORT ===');
    
    testResults.summary.endTime = new Date().toISOString();
    const duration = new Date(testResults.summary.endTime) - new Date(testResults.summary.startTime);
    testResults.summary.duration = `${(duration / 1000).toFixed(2)} seconds`;
    
    // Calculate success rate
    const total = testResults.summary.totalTests;
    const passed = testResults.summary.passed;
    testResults.summary.successRate = total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '0%';
    
    // Add critical findings
    if (testResults.summary.failed > 0) {
        addDetailedFinding(
            'Overall System',
            'High',
            'Failed Tests Detected',
            `${testResults.summary.failed} out of ${total} tests failed. This indicates potential system stability issues.`,
            'Multiple components',
            'Review failed test details and implement fixes for critical workflows'
        );
    }
    
    // Write results to file
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`\nTest results saved to: ${TEST_RESULTS_FILE}`);
    
    // Print summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Total Tests: ${testResults.summary.totalTests}`);
    console.log(`Passed: ${testResults.summary.passed}`);
    console.log(`Failed: ${testResults.summary.failed}`);
    console.log(`Warnings: ${testResults.summary.warnings}`);
    console.log(`Success Rate: ${testResults.summary.successRate}`);
    console.log(`Duration: ${testResults.summary.duration}`);
    
    // Print category breakdown
    console.log('\n=== CATEGORY BREAKDOWN ===');
    Object.entries(testResults.categories).forEach(([category, results]) => {
        console.log(`${category}: ${results.passed} passed, ${results.failed} failed, ${results.warnings} warnings`);
    });
    
    // Print critical findings
    if (testResults.detailedFindings.length > 0) {
        console.log('\n=== CRITICAL FINDINGS ===');
        testResults.detailedFindings.forEach((finding, index) => {
            console.log(`${index + 1}. [${finding.severity}] ${finding.title}`);
            console.log(`   ${finding.description}`);
            console.log(`   Solution: ${finding.solution}`);
        });
    }
}

// Main Test Execution
async function runComprehensiveTests() {
    console.log('🚀 Starting Comprehensive SideBuilds QA Testing...\n');
    
    try {
        // Wait for servers to be ready
        console.log('⏳ Waiting for servers to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Run all test categories
        await testFrontendPages();
        await testCoreAuthentication();
        await testProjectManagement();
        await testPaymentSystem();
        await testPurchaseRequests();
        await testNotificationSystem();
        await testUserManagement();
        await testDatabaseConnectivity();
        await testSecurityHeaders();
        await testRealTimeFeatures();
        
        // Generate comprehensive report
        await generateDetailedReport();
        
        console.log('\n✅ Comprehensive testing completed!');
        
    } catch (error) {
        console.error('\n❌ Error during testing:', error.message);
        testResults.summary.endTime = new Date().toISOString();
        fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    }
}

// Export for use in other scripts
module.exports = {
    runComprehensiveTests,
    testResults,
    logTest,
    addDetailedFinding
};

// Run tests if called directly
if (require.main === module) {
    runComprehensiveTests();
}