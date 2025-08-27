#!/usr/bin/env node

/**
 * SideBuilds Comprehensive Marketplace QA Test Suite
 * Tests all critical workflows with proper field mappings and comprehensive coverage
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:5001/api';
const RESULTS_DIR = path.join(__dirname, 'test-results');
const FINAL_REPORT_FILE = path.join(RESULTS_DIR, 'comprehensive-marketplace-test-report.json');

// Ensure results directory exists
if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

// Test Data with correct field names
const TEST_USERS = {
    buyer: {
        email: `buyer_${Date.now()}@sidebuilds.com`,
        password: 'BuyerPassword123!',
        username: `buyer_${Date.now()}`,
        first_name: 'Test',
        last_name: 'Buyer'
    },
    seller: {
        email: `seller_${Date.now()}@sidebuilds.com`,
        password: 'SellerPassword123!',
        username: `seller_${Date.now()}`,
        first_name: 'Test',
        last_name: 'Seller'
    }
};

const TEST_PROJECT = {
    name: 'QA Test Project', // Using correct field name
    description: 'A comprehensive test project for marketplace validation',
    stage: 'MVP',
    domain: 'Web Development',
    demo_url: 'https://example.com/demo',
    github_url: 'https://github.com/test/project',
    tech_stack: ['React', 'Node.js', 'PostgreSQL'],
    stage_details: 'Fully functional MVP with user authentication',
    monthly_revenue: 500,
    is_public: true,
    is_for_sale: true,
    sale_price: 2000,
    contact_email: TEST_USERS.seller.email,
    payment_method: 'stripe'
};

// Comprehensive Test Results
const testReport = {
    metadata: {
        testSuite: 'SideBuilds Comprehensive Marketplace QA',
        version: '1.0.0',
        startTime: new Date().toISOString(),
        environment: {
            frontend: BASE_URL,
            api: API_URL,
            database: 'SQLite (Development)'
        }
    },
    summary: {
        totalCategories: 0,
        completedCategories: 0,
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        criticalIssues: 0,
        systemHealth: 'UNKNOWN'
    },
    categories: {},
    criticalFindings: [],
    securityFindings: [],
    performanceMetrics: {},
    recommendations: []
};

// Test execution tokens
let buyerToken = null;
let sellerToken = null;
let testProjectId = null;

// Utility Functions
function logCategory(categoryName) {
    testReport.summary.totalCategories++;
    testReport.categories[categoryName] = {
        status: 'IN_PROGRESS',
        tests: [],
        startTime: new Date().toISOString(),
        passed: 0,
        failed: 0
    };
    console.log(`\n🔍 TESTING CATEGORY: ${categoryName.toUpperCase()}`);
    console.log('='.repeat(50));
}

function logTest(category, testName, status, details, issues = [], performance = null) {
    testReport.summary.totalTests++;
    testReport.summary[status === 'PASS' ? 'passedTests' : 'failedTests']++;
    
    const test = {
        name: testName,
        status: status,
        details: details,
        issues: issues,
        timestamp: new Date().toISOString(),
        performance: performance
    };
    
    testReport.categories[category].tests.push(test);
    testReport.categories[category][status === 'PASS' ? 'passed' : 'failed']++;
    
    const statusIcon = status === 'PASS' ? '✅' : status === 'SKIP' ? '⏭️' : '❌';
    console.log(`${statusIcon} ${testName}: ${status}`);
    
    if (details) console.log(`   📋 ${details}`);
    if (performance) console.log(`   ⚡ Performance: ${performance.duration}ms`);
    if (issues.length > 0) {
        console.log('   🚨 Issues:');
        issues.forEach(issue => console.log(`      • ${issue}`));
    }
}

function completeCategory(categoryName, status = 'COMPLETED') {
    if (testReport.categories[categoryName]) {
        testReport.categories[categoryName].status = status;
        testReport.categories[categoryName].endTime = new Date().toISOString();
        testReport.summary.completedCategories++;
        
        const { passed, failed } = testReport.categories[categoryName];
        const total = passed + failed;
        const successRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';
        
        console.log(`📊 Category Summary: ${passed}/${total} tests passed (${successRate}%)`);
    }
}

function addCriticalFinding(title, severity, description, impact, recommendation, codeReference = null) {
    testReport.summary.criticalIssues++;
    testReport.criticalFindings.push({
        title,
        severity,
        description,
        impact,
        recommendation,
        codeReference,
        timestamp: new Date().toISOString()
    });
}

async function measureApiPerformance(apiCall) {
    const start = Date.now();
    try {
        const result = await apiCall();
        const duration = Date.now() - start;
        return { ...result, performance: { duration } };
    } catch (error) {
        const duration = Date.now() - start;
        throw { ...error, performance: { duration } };
    }
}

// CATEGORY 1: CORE AUTHENTICATION & USER MANAGEMENT
async function testCoreAuthentication() {
    logCategory('Core Authentication & User Management');
    
    // Test 1.1: User Registration (Buyer)
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.post(`${API_URL}/auth/register`, TEST_USERS.buyer);
        });
        
        if (result.status === 201 && result.data.token) {
            buyerToken = result.data.token;
            logTest('Core Authentication & User Management', 'Buyer Registration', 'PASS', 
                'User registered successfully with valid JWT token', [], result.performance);
        } else {
            logTest('Core Authentication & User Management', 'Buyer Registration', 'FAIL', 
                'Registration succeeded but no token received', ['JWT generation may be failing']);
        }
    } catch (error) {
        logTest('Core Authentication & User Management', 'Buyer Registration', 'FAIL', 
            `Registration failed: ${error.message}`, [
                'Check database connectivity',
                'Verify user table schema',
                'Check password hashing configuration'
            ]);
    }
    
    // Test 1.2: User Registration (Seller)
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.post(`${API_URL}/auth/register`, TEST_USERS.seller);
        });
        
        if (result.status === 201 && result.data.token) {
            sellerToken = result.data.token;
            logTest('Core Authentication & User Management', 'Seller Registration', 'PASS', 
                'Seller registered successfully', [], result.performance);
        } else {
            logTest('Core Authentication & User Management', 'Seller Registration', 'FAIL', 
                'Seller registration failed');
        }
    } catch (error) {
        logTest('Core Authentication & User Management', 'Seller Registration', 'FAIL', 
            `Seller registration error: ${error.message}`);
    }
    
    // Test 1.3: Login Workflow (Buyer)
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.post(`${API_URL}/auth/login`, {
                email: TEST_USERS.buyer.email,
                password: TEST_USERS.buyer.password
            });
        });
        
        if (result.status === 200 && result.data.token) {
            buyerToken = result.data.token; // Update token
            logTest('Core Authentication & User Management', 'Buyer Login', 'PASS', 
                'Login successful with valid credentials', [], result.performance);
        } else {
            logTest('Core Authentication & User Management', 'Buyer Login', 'FAIL', 
                'Login failed or no token received');
        }
    } catch (error) {
        logTest('Core Authentication & User Management', 'Buyer Login', 'FAIL', 
            `Login error: ${error.message}`);
    }
    
    // Test 1.4: Invalid Credentials Protection
    try {
        await axios.post(`${API_URL}/auth/login`, {
            email: TEST_USERS.buyer.email,
            password: 'WrongPassword123!'
        });
        logTest('Core Authentication & User Management', 'Invalid Credentials Protection', 'FAIL', 
            'Invalid credentials were accepted', [
                'CRITICAL: Authentication bypass vulnerability',
                'Password validation not working'
            ]);
    } catch (error) {
        if (error.response && error.response.status === 401) {
            logTest('Core Authentication & User Management', 'Invalid Credentials Protection', 'PASS', 
                'Invalid credentials properly rejected');
        } else {
            logTest('Core Authentication & User Management', 'Invalid Credentials Protection', 'FAIL', 
                `Unexpected error: ${error.message}`);
        }
    }
    
    // Test 1.5: Profile Access with Token
    if (buyerToken) {
        try {
            const result = await measureApiPerformance(async () => {
                return await axios.get(`${API_URL}/auth/profile`, {
                    headers: { Authorization: `Bearer ${buyerToken}` }
                });
            });
            
            if (result.status === 200 && result.data.email === TEST_USERS.buyer.email) {
                logTest('Core Authentication & User Management', 'Authenticated Profile Access', 'PASS', 
                    'Profile accessible with valid token', [], result.performance);
            } else {
                logTest('Core Authentication & User Management', 'Authenticated Profile Access', 'FAIL', 
                    'Profile data mismatch or access failed');
            }
        } catch (error) {
            logTest('Core Authentication & User Management', 'Authenticated Profile Access', 'FAIL', 
                `Profile access error: ${error.message}`, [
                    'Token validation may be failing',
                    'Profile endpoint implementation issues'
                ]);
        }
    } else {
        logTest('Core Authentication & User Management', 'Authenticated Profile Access', 'SKIP', 
            'No valid token available for testing');
    }
    
    // Test 1.6: Duplicate Registration Prevention
    try {
        await axios.post(`${API_URL}/auth/register`, TEST_USERS.buyer);
        logTest('Core Authentication & User Management', 'Duplicate Registration Prevention', 'FAIL', 
            'Duplicate registration was allowed', [
                'SECURITY VULNERABILITY: Account takeover risk',
                'Email/username uniqueness not enforced'
            ]);
    } catch (error) {
        if (error.response && error.response.status === 409) {
            logTest('Core Authentication & User Management', 'Duplicate Registration Prevention', 'PASS', 
                'Duplicate registration properly prevented');
        } else {
            logTest('Core Authentication & User Management', 'Duplicate Registration Prevention', 'FAIL', 
                `Unexpected error response: ${error.message}`);
        }
    }
    
    completeCategory('Core Authentication & User Management');
}

// CATEGORY 2: PROJECT MANAGEMENT & LISTINGS
async function testProjectManagement() {
    logCategory('Project Management & Listings');
    
    if (!sellerToken) {
        logTest('Project Management & Listings', 'Project Creation', 'SKIP', 
            'No seller token available - cannot test project management');
        completeCategory('Project Management & Listings', 'SKIPPED');
        return;
    }
    
    // Test 2.1: Project Creation
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.post(`${API_URL}/projects`, TEST_PROJECT, {
                headers: { 
                    Authorization: `Bearer ${sellerToken}`,
                    'Content-Type': 'application/json'
                }
            });
        });
        
        if (result.status === 201 && result.data.id) {
            testProjectId = result.data.id;
            logTest('Project Management & Listings', 'Project Creation', 'PASS', 
                `Project created successfully with ID: ${testProjectId}`, [], result.performance);
        } else {
            logTest('Project Management & Listings', 'Project Creation', 'FAIL', 
                'Project creation response invalid or missing ID');
        }
    } catch (error) {
        const status = error.response ? error.response.status : 'Connection Error';
        const message = error.response ? error.response.data?.message || error.message : error.message;
        
        logTest('Project Management & Listings', 'Project Creation', 'FAIL', 
            `Status: ${status}, Error: ${message}`, [
                'Check project schema requirements',
                'Verify authentication middleware',
                'Check database table structure'
            ]);
    }
    
    // Test 2.2: Project Listing (Authenticated)
    if (sellerToken) {
        try {
            const result = await measureApiPerformance(async () => {
                return await axios.get(`${API_URL}/projects`, {
                    headers: { Authorization: `Bearer ${sellerToken}` }
                });
            });
            
            if (result.status === 200 && Array.isArray(result.data)) {
                logTest('Project Management & Listings', 'Authenticated Project Listing', 'PASS', 
                    `Retrieved ${result.data.length} projects`, [], result.performance);
            } else {
                logTest('Project Management & Listings', 'Authenticated Project Listing', 'FAIL', 
                    'Invalid response format for project listing');
            }
        } catch (error) {
            logTest('Project Management & Listings', 'Authenticated Project Listing', 'FAIL', 
                `Error: ${error.message}`, [
                    'Projects endpoint may require authentication',
                    'Check database query implementation'
                ]);
        }
    }
    
    // Test 2.3: Individual Project Retrieval
    if (testProjectId && sellerToken) {
        try {
            const result = await measureApiPerformance(async () => {
                return await axios.get(`${API_URL}/projects/${testProjectId}`, {
                    headers: { Authorization: `Bearer ${sellerToken}` }
                });
            });
            
            if (result.status === 200 && result.data.id == testProjectId) {
                logTest('Project Management & Listings', 'Individual Project Retrieval', 'PASS', 
                    'Project retrieved by ID successfully', [], result.performance);
            } else {
                logTest('Project Management & Listings', 'Individual Project Retrieval', 'FAIL', 
                    'Project retrieval failed or data mismatch');
            }
        } catch (error) {
            logTest('Project Management & Listings', 'Individual Project Retrieval', 'FAIL', 
                `Error: ${error.message}`);
        }
    }
    
    // Test 2.4: Project Update
    if (testProjectId && sellerToken) {
        try {
            const updatedData = { ...TEST_PROJECT, description: 'Updated description for QA testing' };
            const result = await measureApiPerformance(async () => {
                return await axios.put(`${API_URL}/projects/${testProjectId}`, updatedData, {
                    headers: { Authorization: `Bearer ${sellerToken}` }
                });
            });
            
            if (result.status === 200) {
                logTest('Project Management & Listings', 'Project Update', 'PASS', 
                    'Project updated successfully', [], result.performance);
            } else {
                logTest('Project Management & Listings', 'Project Update', 'FAIL', 
                    'Project update failed');
            }
        } catch (error) {
            logTest('Project Management & Listings', 'Project Update', 'FAIL', 
                `Update error: ${error.message}`);
        }
    }
    
    completeCategory('Project Management & Listings');
}

// CATEGORY 3: PURCHASE REQUEST WORKFLOW
async function testPurchaseRequestWorkflow() {
    logCategory('Purchase Request Workflow');
    
    if (!buyerToken || !testProjectId) {
        logTest('Purchase Request Workflow', 'Purchase Request Creation', 'SKIP', 
            'Missing buyer token or test project ID');
        completeCategory('Purchase Request Workflow', 'SKIPPED');
        return;
    }
    
    // Test 3.1: Purchase Request Creation
    try {
        const purchaseRequest = {
            projectId: testProjectId,
            offerAmount: 1500,
            message: 'I am interested in purchasing this project. Can we discuss terms?',
            buyerEmail: TEST_USERS.buyer.email
        };
        
        const result = await measureApiPerformance(async () => {
            return await axios.post(`${API_URL}/purchase-requests`, purchaseRequest, {
                headers: { 
                    Authorization: `Bearer ${buyerToken}`,
                    'Content-Type': 'application/json'
                }
            });
        });
        
        if (result.status === 201 && result.data.id) {
            logTest('Purchase Request Workflow', 'Purchase Request Creation', 'PASS', 
                `Purchase request created with ID: ${result.data.id}`, [], result.performance);
        } else {
            logTest('Purchase Request Workflow', 'Purchase Request Creation', 'FAIL', 
                'Purchase request creation failed or invalid response');
        }
    } catch (error) {
        const status = error.response ? error.response.status : 'Connection Error';
        const message = error.response ? error.response.data?.message || error.message : error.message;
        
        logTest('Purchase Request Workflow', 'Purchase Request Creation', 'FAIL', 
            `Status: ${status}, Error: ${message}`, [
                'Check purchase request endpoint exists',
                'Verify request data format',
                'Check database schema for purchase_requests table'
            ]);
    }
    
    // Test 3.2: Purchase Request Retrieval
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.get(`${API_URL}/purchase-requests`, {
                headers: { Authorization: `Bearer ${buyerToken}` }
            });
        });
        
        if (result.status === 200 && Array.isArray(result.data)) {
            logTest('Purchase Request Workflow', 'Purchase Request Retrieval', 'PASS', 
                `Retrieved ${result.data.length} purchase requests`, [], result.performance);
        } else {
            logTest('Purchase Request Workflow', 'Purchase Request Retrieval', 'FAIL', 
                'Purchase request retrieval failed');
        }
    } catch (error) {
        logTest('Purchase Request Workflow', 'Purchase Request Retrieval', 'FAIL', 
            `Error: ${error.message}`);
    }
    
    completeCategory('Purchase Request Workflow');
}

// CATEGORY 4: STRIPE PAYMENT INTEGRATION
async function testStripePaymentIntegration() {
    logCategory('Stripe Payment Integration');
    
    // Test 4.1: Stripe Configuration
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.get(`${API_URL}/stripe/config`);
        });
        
        if (result.status === 200 && result.data.publishableKey) {
            logTest('Stripe Payment Integration', 'Stripe Configuration Access', 'PASS', 
                'Stripe configuration accessible with publishable key', [], result.performance);
        } else {
            logTest('Stripe Payment Integration', 'Stripe Configuration Access', 'FAIL', 
                'Stripe configuration missing or invalid');
        }
    } catch (error) {
        logTest('Stripe Payment Integration', 'Stripe Configuration Access', 'FAIL', 
            `Error: ${error.message}`, [
                'Check if Stripe endpoints are properly mounted',
                'Verify Stripe configuration in environment'
            ]);
    }
    
    // Test 4.2: Payment Intent Creation
    if (buyerToken) {
        try {
            const paymentData = {
                amount: 1500,
                projectId: testProjectId || 1,
                currency: 'usd'
            };
            
            const result = await measureApiPerformance(async () => {
                return await axios.post(`${API_URL}/stripe/create-payment-intent`, paymentData, {
                    headers: { 
                        Authorization: `Bearer ${buyerToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            });
            
            if (result.status === 200 && result.data.clientSecret) {
                logTest('Stripe Payment Integration', 'Payment Intent Creation', 'PASS', 
                    'Payment intent created with client secret', [], result.performance);
            } else {
                logTest('Stripe Payment Integration', 'Payment Intent Creation', 'FAIL', 
                    'Payment intent creation failed or missing client secret');
            }
        } catch (error) {
            const status = error.response ? error.response.status : 'Connection Error';
            const message = error.response ? error.response.data?.message || error.message : error.message;
            
            logTest('Stripe Payment Integration', 'Payment Intent Creation', 'FAIL', 
                `Status: ${status}, Error: ${message}`, [
                    'Check Stripe secret key configuration',
                    'Verify payment intent endpoint implementation',
                    'Check authentication requirements'
                ]);
        }
    }
    
    // Test 4.3: Stripe Connect Account Setup
    if (sellerToken) {
        try {
            const result = await measureApiPerformance(async () => {
                return await axios.post(`${API_URL}/stripe/connect/create-account`, {}, {
                    headers: { Authorization: `Bearer ${sellerToken}` }
                });
            });
            
            if (result.status === 200 && result.data.accountId) {
                logTest('Stripe Payment Integration', 'Stripe Connect Account Creation', 'PASS', 
                    'Stripe Connect account creation initiated', [], result.performance);
            } else {
                logTest('Stripe Payment Integration', 'Stripe Connect Account Creation', 'FAIL', 
                    'Stripe Connect account creation failed');
            }
        } catch (error) {
            const status = error.response ? error.response.status : 'Connection Error';
            
            if (status === 404) {
                logTest('Stripe Payment Integration', 'Stripe Connect Account Creation', 'FAIL', 
                    'Stripe Connect endpoint not found', [
                        'Stripe Connect routes may not be implemented',
                        'Check route mounting in server configuration'
                    ]);
            } else {
                logTest('Stripe Payment Integration', 'Stripe Connect Account Creation', 'FAIL', 
                    `Error: ${error.message}`);
            }
        }
    }
    
    completeCategory('Stripe Payment Integration');
}

// CATEGORY 5: NOTIFICATION SYSTEM
async function testNotificationSystem() {
    logCategory('Notification System');
    
    if (!buyerToken) {
        logTest('Notification System', 'Notification Retrieval', 'SKIP', 
            'No valid user token available');
        completeCategory('Notification System', 'SKIPPED');
        return;
    }
    
    // Test 5.1: Notification Retrieval
    try {
        const result = await measureApiPerformance(async () => {
            return await axios.get(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${buyerToken}` }
            });
        });
        
        if (result.status === 200 && Array.isArray(result.data)) {
            logTest('Notification System', 'Notification Retrieval', 'PASS', 
                `Retrieved ${result.data.length} notifications`, [], result.performance);
        } else {
            logTest('Notification System', 'Notification Retrieval', 'FAIL', 
                'Notification retrieval failed or invalid format');
        }
    } catch (error) {
        logTest('Notification System', 'Notification Retrieval', 'FAIL', 
            `Error: ${error.message}`);
    }
    
    completeCategory('Notification System');
}

// CATEGORY 6: FRONTEND ROUTING & ACCESSIBILITY
async function testFrontendAccessibility() {
    logCategory('Frontend Routing & Accessibility');
    
    const criticalPages = [
        { path: '/', name: 'Home Page', critical: true },
        { path: '/marketplace', name: 'Marketplace', critical: true },
        { path: '/login', name: 'Login Page', critical: true },
        { path: '/register', name: 'Registration Page', critical: true },
        { path: '/dashboard', name: 'Dashboard', critical: false },
        { path: '/profile', name: 'Profile Page', critical: false }
    ];
    
    for (const page of criticalPages) {
        try {
            const result = await measureApiPerformance(async () => {
                return await axios.get(`${BASE_URL}${page.path}`, { 
                    timeout: 15000,
                    validateStatus: (status) => status < 500 // Accept 404s as valid responses
                });
            });
            
            if (result.status === 200) {
                logTest('Frontend Routing & Accessibility', `${page.name} Access`, 'PASS', 
                    'Page loads successfully', [], result.performance);
            } else if (result.status === 404 && !page.critical) {
                logTest('Frontend Routing & Accessibility', `${page.name} Access`, 'PASS', 
                    'Non-critical page not found (acceptable)', [], result.performance);
            } else {
                logTest('Frontend Routing & Accessibility', `${page.name} Access`, 'FAIL', 
                    `Unexpected status: ${result.status}`, 
                    page.critical ? ['Critical page not accessible'] : []);
            }
        } catch (error) {
            const severity = page.critical ? 'CRITICAL' : 'Minor';
            logTest('Frontend Routing & Accessibility', `${page.name} Access`, 'FAIL', 
                `Error: ${error.message}`, [
                    `${severity}: Page access failure`,
                    'Check frontend server status',
                    'Verify routing configuration'
                ]);
                
            if (page.critical) {
                addCriticalFinding(
                    `Critical Page Inaccessible: ${page.name}`,
                    'HIGH',
                    `Users cannot access the ${page.name} which is essential for platform operation`,
                    'User workflow disruption, potential business impact',
                    `Fix routing and server configuration for ${page.path}`
                );
            }
        }
    }
    
    completeCategory('Frontend Routing & Accessibility');
}

// FINAL REPORT GENERATION
async function generateComprehensiveReport() {
    console.log('\n📊 GENERATING COMPREHENSIVE TEST REPORT');
    console.log('='.repeat(50));
    
    // Calculate final metrics
    testReport.metadata.endTime = new Date().toISOString();
    const duration = new Date(testReport.metadata.endTime) - new Date(testReport.metadata.startTime);
    testReport.metadata.duration = `${(duration / 1000).toFixed(2)} seconds`;
    
    const { totalTests, passedTests, failedTests, criticalIssues } = testReport.summary;
    testReport.summary.successRate = totalTests > 0 ? `${((passedTests / totalTests) * 100).toFixed(1)}%` : '0%';
    
    // Determine system health
    if (criticalIssues > 0) {
        testReport.summary.systemHealth = 'CRITICAL';
    } else if (failedTests > passedTests) {
        testReport.summary.systemHealth = 'POOR';
    } else if (passedTests >= failedTests * 2) {
        testReport.summary.systemHealth = 'GOOD';
    } else {
        testReport.summary.systemHealth = 'FAIR';
    }
    
    // Generate recommendations
    if (testReport.summary.systemHealth === 'CRITICAL') {
        testReport.recommendations.push('IMMEDIATE ACTION REQUIRED: Address all critical findings before deployment');
    }
    if (failedTests > 0) {
        testReport.recommendations.push('Review and fix all failed test scenarios');
    }
    testReport.recommendations.push('Implement comprehensive monitoring for production deployment');
    testReport.recommendations.push('Set up automated testing pipeline for continuous quality assurance');
    
    // Save detailed report
    fs.writeFileSync(FINAL_REPORT_FILE, JSON.stringify(testReport, null, 2));
    
    // Print executive summary
    console.log('\n🎯 EXECUTIVE SUMMARY');
    console.log('-'.repeat(30));
    console.log(`System Health: ${testReport.summary.systemHealth}`);
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Success Rate: ${testReport.summary.successRate}`);
    console.log(`Critical Issues: ${criticalIssues}`);
    console.log(`Test Duration: ${testReport.metadata.duration}`);
    
    // Print category breakdown
    console.log('\n📋 CATEGORY BREAKDOWN');
    console.log('-'.repeat(30));
    Object.entries(testReport.categories).forEach(([category, data]) => {
        const total = data.passed + data.failed;
        const rate = total > 0 ? ((data.passed / total) * 100).toFixed(1) : '0';
        console.log(`${category}: ${data.passed}/${total} (${rate}%)`);
    });
    
    // Print critical findings
    if (testReport.criticalFindings.length > 0) {
        console.log('\n🚨 CRITICAL FINDINGS');
        console.log('-'.repeat(30));
        testReport.criticalFindings.forEach((finding, index) => {
            console.log(`${index + 1}. [${finding.severity}] ${finding.title}`);
            console.log(`   Impact: ${finding.impact}`);
            console.log(`   Action: ${finding.recommendation}\n`);
        });
    }
    
    console.log(`\n📄 Detailed report saved to: ${FINAL_REPORT_FILE}`);
    
    return testReport;
}

// MAIN EXECUTION
async function runComprehensiveMarketplaceTests() {
    console.log('🚀 SIDEBUILDS COMPREHENSIVE MARKETPLACE QA TESTING');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log(`Frontend: ${BASE_URL}`);
    console.log(`API: ${API_URL}`);
    
    try {
        // Wait for servers to be fully ready
        console.log('\n⏳ Waiting for servers to be ready...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Execute all test categories
        await testFrontendAccessibility();
        await testCoreAuthentication();
        await testProjectManagement();
        await testPurchaseRequestWorkflow();
        await testStripePaymentIntegration();
        await testNotificationSystem();
        
        // Generate final comprehensive report
        const finalReport = await generateComprehensiveReport();
        
        console.log('\n🎉 COMPREHENSIVE TESTING COMPLETED!');
        
        return finalReport;
        
    } catch (error) {
        console.error('\n💥 CRITICAL ERROR DURING TESTING:', error.message);
        testReport.metadata.endTime = new Date().toISOString();
        fs.writeFileSync(FINAL_REPORT_FILE, JSON.stringify(testReport, null, 2));
        throw error;
    }
}

// Export for external use
module.exports = {
    runComprehensiveMarketplaceTests,
    testReport
};

// Execute if run directly
if (require.main === module) {
    runComprehensiveMarketplaceTests()
        .then(report => {
            process.exit(report.summary.criticalIssues > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Test execution failed:', error.message);
            process.exit(1);
        });
}