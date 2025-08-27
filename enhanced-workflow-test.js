#!/usr/bin/env node

/**
 * Enhanced SideBuilds Workflow Testing Suite
 * Comprehensive testing of all critical marketplace workflows
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:5001/api';
const TEST_RESULTS_FILE = path.join(__dirname, 'enhanced-workflow-test-results.json');

// Test Data
const TEST_USER = {
    email: `test_${Date.now()}@sidebuilds.com`,
    password: 'TestPassword123!',
    username: `testuser_${Date.now()}`,
    first_name: 'Test',
    last_name: 'User'
};

const TEST_SELLER = {
    email: `seller_${Date.now()}@sidebuilds.com`,
    password: 'SellerPassword123!',
    username: `seller_${Date.now()}`,
    first_name: 'Test',
    last_name: 'Seller'
};

const TEST_PROJECT = {
    title: 'Test Project for QA',
    description: 'A comprehensive test project for the marketplace',
    price: 1000,
    category: 'Web Development',
    tags: ['react', 'nodejs', 'testing'],
    status: 'available'
};

// Test Results Storage
let testResults = {
    summary: {
        totalWorkflows: 0,
        passedWorkflows: 0,
        failedWorkflows: 0,
        criticalIssues: 0,
        startTime: new Date().toISOString()
    },
    workflows: {},
    detailedFindings: [],
    performanceMetrics: {},
    securityFindings: []
};

// Utility Functions
function logWorkflow(workflowName, status, details, issues = []) {
    testResults.summary.totalWorkflows++;
    testResults.summary[status === 'PASS' ? 'passedWorkflows' : 'failedWorkflows']++;
    
    testResults.workflows[workflowName] = {
        status: status,
        details: details,
        issues: issues,
        timestamp: new Date().toISOString()
    };
    
    console.log(`\n[${status}] ${workflowName}`);
    console.log(`Details: ${details}`);
    if (issues.length > 0) {
        console.log('Issues:');
        issues.forEach(issue => console.log(`  - ${issue}`));
    }
}

function addCriticalFinding(title, severity, description, impact, recommendation) {
    testResults.summary.criticalIssues++;
    testResults.detailedFindings.push({
        title,
        severity,
        description,
        impact,
        recommendation,
        timestamp: new Date().toISOString()
    });
}

// Authentication Token Management
let userToken = null;
let sellerToken = null;

// Workflow Test Functions

async function testUserRegistrationWorkflow() {
    console.log('\n=== TESTING USER REGISTRATION WORKFLOW ===');
    
    try {
        // Step 1: Register new user
        const registerResponse = await axios.post(`${API_URL}/auth/register`, TEST_USER);
        
        if (registerResponse.status === 201 && registerResponse.data.token) {
            userToken = registerResponse.data.token;
            logWorkflow('User Registration', 'PASS', 'User successfully registered with token');
        } else {
            logWorkflow('User Registration', 'FAIL', 'Registration succeeded but no token received', [
                'Token generation may be failing',
                'Check JWT configuration'
            ]);
        }
        
        // Step 2: Verify user profile access
        if (userToken) {
            const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            
            if (profileResponse.status === 200 && profileResponse.data.email === TEST_USER.email) {
                logWorkflow('Profile Access After Registration', 'PASS', 'User profile accessible with token');
            } else {
                logWorkflow('Profile Access After Registration', 'FAIL', 'Profile access failed after registration', [
                    'Token may not be properly authenticated',
                    'Profile endpoint may be broken'
                ]);
            }
        }
        
        // Step 3: Test duplicate registration prevention
        try {
            await axios.post(`${API_URL}/auth/register`, TEST_USER);
            logWorkflow('Duplicate Registration Prevention', 'FAIL', 'Duplicate registration was allowed', [
                'Email/username uniqueness validation failing',
                'Security vulnerability for account takeover'
            ]);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                logWorkflow('Duplicate Registration Prevention', 'PASS', 'Duplicate registration properly rejected');
            } else {
                logWorkflow('Duplicate Registration Prevention', 'FAIL', `Unexpected error: ${error.message}`);
            }
        }
        
    } catch (error) {
        logWorkflow('User Registration', 'FAIL', `Registration failed: ${error.message}`, [
            'Check database connectivity',
            'Verify API endpoint implementation',
            'Check request validation'
        ]);
        
        addCriticalFinding(
            'User Registration Broken',
            'CRITICAL',
            'Users cannot register for accounts',
            'Complete business breakdown - no new users can join',
            'Fix registration endpoint immediately'
        );
    }
}

async function testUserLoginWorkflow() {
    console.log('\n=== TESTING USER LOGIN WORKFLOW ===');
    
    try {
        // Step 1: Login with valid credentials
        const loginResponse = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        
        if (loginResponse.status === 200 && loginResponse.data.token) {
            userToken = loginResponse.data.token;
            logWorkflow('User Login', 'PASS', 'User successfully logged in');
        } else {
            logWorkflow('User Login', 'FAIL', 'Login succeeded but no token received');
        }
        
        // Step 2: Test invalid credentials
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: TEST_USER.email,
                password: 'wrongpassword'
            });
            logWorkflow('Invalid Login Prevention', 'FAIL', 'Invalid login was accepted', [
                'Password validation not working',
                'Critical security vulnerability'
            ]);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                logWorkflow('Invalid Login Prevention', 'PASS', 'Invalid login properly rejected');
            } else {
                logWorkflow('Invalid Login Prevention', 'FAIL', `Unexpected error: ${error.message}`);
            }
        }
        
        // Step 3: Test protected route access
        if (userToken) {
            const protectedResponse = await axios.get(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${userToken}` }
            });
            
            if (protectedResponse.status === 200) {
                logWorkflow('Protected Route Access', 'PASS', 'Protected route accessible with valid token');
            } else {
                logWorkflow('Protected Route Access', 'FAIL', 'Protected route access failed with valid token');
            }
        }
        
    } catch (error) {
        logWorkflow('User Login', 'FAIL', `Login failed: ${error.message}`, [
            'Check password hashing/comparison',
            'Verify login endpoint implementation'
        ]);
    }
}

async function testProjectCreationWorkflow() {
    console.log('\n=== TESTING PROJECT CREATION WORKFLOW ===');
    
    if (!userToken) {
        logWorkflow('Project Creation', 'SKIP', 'No valid user token available');
        return;
    }
    
    try {
        // Create a project
        const projectResponse = await axios.post(`${API_URL}/projects`, TEST_PROJECT, {
            headers: { 
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (projectResponse.status === 201 && projectResponse.data.id) {
            logWorkflow('Project Creation', 'PASS', `Project created with ID: ${projectResponse.data.id}`);
            return projectResponse.data.id;
        } else {
            logWorkflow('Project Creation', 'FAIL', 'Project creation response invalid');
        }
        
    } catch (error) {
        const status = error.response ? error.response.status : 'Connection Error';
        const message = error.response ? error.response.data?.message || error.message : error.message;
        
        logWorkflow('Project Creation', 'FAIL', `Status: ${status}, Error: ${message}`, [
            'Check authentication middleware',
            'Verify project creation endpoint',
            'Check database schema for projects table'
        ]);
    }
    
    return null;
}

async function testProjectListingWorkflow() {
    console.log('\n=== TESTING PROJECT LISTING WORKFLOW ===');
    
    try {
        // Test public project listing
        const publicListResponse = await axios.get(`${API_URL}/projects`);
        
        if (publicListResponse.status === 200 && Array.isArray(publicListResponse.data)) {
            logWorkflow('Public Project Listing', 'PASS', `Retrieved ${publicListResponse.data.length} projects`);
        } else {
            logWorkflow('Public Project Listing', 'FAIL', 'Invalid response format for project listing');
        }
        
        // Test project search/filtering
        const searchResponse = await axios.get(`${API_URL}/projects?category=Web Development`);
        
        if (searchResponse.status === 200) {
            logWorkflow('Project Search/Filter', 'PASS', 'Project search endpoint accessible');
        } else {
            logWorkflow('Project Search/Filter', 'FAIL', 'Project search functionality broken');
        }
        
    } catch (error) {
        logWorkflow('Project Listing', 'FAIL', `Error: ${error.message}`, [
            'Check projects endpoint implementation',
            'Verify database query for projects'
        ]);
    }
}

async function testPurchaseRequestWorkflow() {
    console.log('\n=== TESTING PURCHASE REQUEST WORKFLOW ===');
    
    if (!userToken) {
        logWorkflow('Purchase Request Creation', 'SKIP', 'No valid user token available');
        return;
    }
    
    try {
        // Create a purchase request
        const purchaseRequest = {
            projectId: 1, // Assuming project ID 1 exists
            offerAmount: 800,
            message: 'Interested in purchasing this project',
            buyerEmail: TEST_USER.email
        };
        
        const purchaseResponse = await axios.post(`${API_URL}/purchase-requests`, purchaseRequest, {
            headers: { 
                Authorization: `Bearer ${userToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (purchaseResponse.status === 201) {
            logWorkflow('Purchase Request Creation', 'PASS', 'Purchase request created successfully');
        } else {
            logWorkflow('Purchase Request Creation', 'FAIL', 'Purchase request creation failed');
        }
        
        // Test getting purchase requests
        const getRequestsResponse = await axios.get(`${API_URL}/purchase-requests`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        
        if (getRequestsResponse.status === 200) {
            logWorkflow('Purchase Request Retrieval', 'PASS', 'Purchase requests retrieved successfully');
        } else {
            logWorkflow('Purchase Request Retrieval', 'FAIL', 'Failed to retrieve purchase requests');
        }
        
    } catch (error) {
        const status = error.response ? error.response.status : 'Connection Error';
        const message = error.response ? error.response.data?.message || error.message : error.message;
        
        logWorkflow('Purchase Request Workflow', 'FAIL', `Status: ${status}, Error: ${message}`, [
            'Check purchase request endpoints',
            'Verify authentication middleware',
            'Check database schema for purchase_requests table'
        ]);
    }
}

async function testStripeIntegrationWorkflow() {
    console.log('\n=== TESTING STRIPE INTEGRATION WORKFLOW ===');
    
    try {
        // Test Stripe config endpoint
        const configResponse = await axios.get(`${API_URL}/stripe/config`);
        
        if (configResponse.status === 200 && configResponse.data.publishableKey) {
            logWorkflow('Stripe Configuration', 'PASS', 'Stripe configuration accessible');
        } else {
            logWorkflow('Stripe Configuration', 'FAIL', 'Stripe configuration invalid or missing');
        }
        
        // Test payment intent creation (requires authentication)
        if (userToken) {
            try {
                const paymentIntentResponse = await axios.post(`${API_URL}/stripe/create-payment-intent`, {
                    amount: 1000,
                    projectId: 1
                }, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                if (paymentIntentResponse.status === 200 && paymentIntentResponse.data.clientSecret) {
                    logWorkflow('Payment Intent Creation', 'PASS', 'Payment intent created successfully');
                } else {
                    logWorkflow('Payment Intent Creation', 'FAIL', 'Invalid payment intent response');
                }
            } catch (error) {
                logWorkflow('Payment Intent Creation', 'FAIL', `Error: ${error.message}`);
            }
        }
        
    } catch (error) {
        logWorkflow('Stripe Integration', 'FAIL', `Error: ${error.message}`, [
            'Check Stripe configuration',
            'Verify API keys are properly set',
            'Check Stripe endpoints implementation'
        ]);
    }
}

async function testNotificationWorkflow() {
    console.log('\n=== TESTING NOTIFICATION WORKFLOW ===');
    
    if (!userToken) {
        logWorkflow('Notification System', 'SKIP', 'No valid user token available');
        return;
    }
    
    try {
        const notificationResponse = await axios.get(`${API_URL}/notifications`, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        
        if (notificationResponse.status === 200) {
            logWorkflow('Notification Retrieval', 'PASS', 'Notifications endpoint accessible');
        } else {
            logWorkflow('Notification Retrieval', 'FAIL', 'Notifications endpoint failed');
        }
        
    } catch (error) {
        logWorkflow('Notification System', 'FAIL', `Error: ${error.message}`, [
            'Check notifications endpoint',
            'Verify user authentication for notifications'
        ]);
    }
}

async function testFrontendAccessibility() {
    console.log('\n=== TESTING FRONTEND ACCESSIBILITY ===');
    
    const pages = [
        { path: '/', name: 'Home Page' },
        { path: '/login', name: 'Login Page' },
        { path: '/register', name: 'Registration Page' },
        { path: '/marketplace', name: 'Marketplace Page' },
        { path: '/dashboard', name: 'Dashboard Page' }
    ];
    
    for (const page of pages) {
        try {
            const response = await axios.get(`${BASE_URL}${page.path}`, { timeout: 10000 });
            
            if (response.status === 200) {
                logWorkflow(`Frontend - ${page.name}`, 'PASS', 'Page loads successfully');
            } else {
                logWorkflow(`Frontend - ${page.name}`, 'FAIL', `Unexpected status: ${response.status}`);
            }
        } catch (error) {
            logWorkflow(`Frontend - ${page.name}`, 'FAIL', `Error: ${error.message}`, [
                'Check frontend server status',
                'Verify routing configuration',
                'Check for JavaScript errors'
            ]);
        }
    }
}

async function testDatabaseConnectivity() {
    console.log('\n=== TESTING DATABASE CONNECTIVITY ===');
    
    try {
        // Test a simple endpoint that requires database access
        const response = await axios.get(`${API_URL}/projects`, { timeout: 5000 });
        
        if (response.status === 200) {
            logWorkflow('Database Connectivity', 'PASS', 'Database queries working');
        } else {
            logWorkflow('Database Connectivity', 'FAIL', 'Database connection issues');
        }
    } catch (error) {
        logWorkflow('Database Connectivity', 'FAIL', `Error: ${error.message}`, [
            'Check database server status',
            'Verify connection string',
            'Check database permissions'
        ]);
        
        addCriticalFinding(
            'Database Connectivity Failure',
            'CRITICAL',
            'Cannot connect to database for basic operations',
            'All data-dependent features will fail',
            'Verify database server and connection configuration'
        );
    }
}

async function generateComprehensiveReport() {
    console.log('\n=== GENERATING COMPREHENSIVE REPORT ===');
    
    testResults.summary.endTime = new Date().toISOString();
    const duration = new Date(testResults.summary.endTime) - new Date(testResults.summary.startTime);
    testResults.summary.duration = `${(duration / 1000).toFixed(2)} seconds`;
    
    // Calculate success rate
    const total = testResults.summary.totalWorkflows;
    const passed = testResults.summary.passedWorkflows;
    testResults.summary.successRate = total > 0 ? `${((passed / total) * 100).toFixed(1)}%` : '0%';
    
    // Determine overall system health
    testResults.summary.systemHealth = 'UNKNOWN';
    if (testResults.summary.criticalIssues > 0) {
        testResults.summary.systemHealth = 'CRITICAL';
    } else if (testResults.summary.failedWorkflows > testResults.summary.passedWorkflows) {
        testResults.summary.systemHealth = 'POOR';
    } else if (testResults.summary.passedWorkflows > testResults.summary.failedWorkflows * 2) {
        testResults.summary.systemHealth = 'GOOD';
    } else {
        testResults.summary.systemHealth = 'FAIR';
    }
    
    // Write results to file
    fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
    console.log(`\n✅ Test results saved to: ${TEST_RESULTS_FILE}`);
    
    // Print summary
    console.log('\n=== COMPREHENSIVE TEST SUMMARY ===');
    console.log(`System Health: ${testResults.summary.systemHealth}`);
    console.log(`Total Workflows Tested: ${testResults.summary.totalWorkflows}`);
    console.log(`Passed: ${testResults.summary.passedWorkflows}`);
    console.log(`Failed: ${testResults.summary.failedWorkflows}`);
    console.log(`Critical Issues: ${testResults.summary.criticalIssues}`);
    console.log(`Success Rate: ${testResults.summary.successRate}`);
    console.log(`Duration: ${testResults.summary.duration}`);
    
    // Print critical findings
    if (testResults.detailedFindings.length > 0) {
        console.log('\n=== CRITICAL FINDINGS ===');
        testResults.detailedFindings.forEach((finding, index) => {
            console.log(`${index + 1}. [${finding.severity}] ${finding.title}`);
            console.log(`   Description: ${finding.description}`);
            console.log(`   Impact: ${finding.impact}`);
            console.log(`   Recommendation: ${finding.recommendation}\n`);
        });
    }
    
    // Print workflow breakdown
    console.log('\n=== WORKFLOW RESULTS ===');
    Object.entries(testResults.workflows).forEach(([workflow, result]) => {
        console.log(`[${result.status}] ${workflow}: ${result.details}`);
    });
}

// Main Test Execution
async function runEnhancedWorkflowTests() {
    console.log('🚀 Starting Enhanced SideBuilds Workflow Testing...\n');
    
    try {
        // Wait for servers to be ready
        console.log('⏳ Waiting for servers to be ready...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Run all workflow tests
        await testDatabaseConnectivity();
        await testFrontendAccessibility();
        await testUserRegistrationWorkflow();
        await testUserLoginWorkflow();
        await testProjectCreationWorkflow();
        await testProjectListingWorkflow();
        await testPurchaseRequestWorkflow();
        await testStripeIntegrationWorkflow();
        await testNotificationWorkflow();
        
        // Generate comprehensive report
        await generateComprehensiveReport();
        
        console.log('\n✅ Enhanced workflow testing completed!');
        
        // Return summary for external use
        return testResults.summary;
        
    } catch (error) {
        console.error('\n❌ Error during workflow testing:', error.message);
        testResults.summary.endTime = new Date().toISOString();
        fs.writeFileSync(TEST_RESULTS_FILE, JSON.stringify(testResults, null, 2));
        throw error;
    }
}

// Export for use in other scripts
module.exports = {
    runEnhancedWorkflowTests,
    testResults
};

// Run tests if called directly
if (require.main === module) {
    runEnhancedWorkflowTests();
}