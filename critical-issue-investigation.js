#!/usr/bin/env node

/**
 * Critical Issue Investigation & Remaining Workflow Tests
 * Deep dive into specific problems identified in comprehensive testing
 */

const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3002';
const API_URL = 'http://localhost:5001/api';
const RESULTS_DIR = path.join(__dirname, 'test-results');
const INVESTIGATION_REPORT = path.join(RESULTS_DIR, 'critical-issue-investigation.json');

// Investigation Results
const investigation = {
    metadata: {
        testSuite: 'SideBuilds Critical Issue Investigation',
        startTime: new Date().toISOString(),
        focusAreas: [
            'Frontend Routing Issues',
            'Stripe Integration Problems', 
            'Profile Endpoint Investigation',
            'Real-time Communication Testing',
            'Transaction Flow Validation',
            'Security Vulnerability Assessment'
        ]
    },
    findings: {},
    recommendations: [],
    securityConcerns: [],
    performanceIssues: []
};

// Test Authentication tokens (reuse from previous tests)
let userToken = null;

// Utility Functions
function logInvestigation(area, title, findings, severity = 'INFO', recommendations = []) {
    investigation.findings[area] = investigation.findings[area] || [];
    investigation.findings[area].push({
        title,
        findings,
        severity,
        recommendations,
        timestamp: new Date().toISOString()
    });
    
    const severityIcon = {
        'CRITICAL': '🚨',
        'HIGH': '⚠️',
        'MEDIUM': '⚡',
        'INFO': 'ℹ️'
    };
    
    console.log(`\n${severityIcon[severity]} [${area}] ${title}`);
    console.log(`Findings: ${findings}`);
    if (recommendations.length > 0) {
        console.log('Recommendations:');
        recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
}

// INVESTIGATION 1: Frontend Routing Analysis
async function investigateFrontendRouting() {
    console.log('\n🔍 INVESTIGATING FRONTEND ROUTING ISSUES');
    console.log('='.repeat(50));
    
    // Check if React Router is properly configured
    try {
        const homeResponse = await axios.get(BASE_URL, { timeout: 10000 });
        
        if (homeResponse.status === 200) {
            // Check if the response contains React app indicators
            const htmlContent = homeResponse.data;
            const hasReactRoot = htmlContent.includes('root') || htmlContent.includes('react');
            const hasRouterIndicators = htmlContent.includes('react-router') || htmlContent.includes('Router');
            
            logInvestigation('Frontend Routing', 'React App Structure Analysis', 
                `React indicators: ${hasReactRoot}, Router indicators: ${hasRouterIndicators}`, 'INFO',
                hasReactRoot ? ['React app is loading'] : ['React app may not be properly initialized']
            );
            
            // Test specific routes that failed
            const routesToTest = ['/marketplace', '/login', '/register'];
            
            for (const route of routesToTest) {
                try {
                    const response = await axios.get(`${BASE_URL}${route}`, { 
                        timeout: 10000,
                        validateStatus: (status) => status < 500 
                    });
                    
                    if (response.status === 200) {
                        logInvestigation('Frontend Routing', `Route ${route} Analysis`, 
                            'Route accessible', 'INFO');
                    } else if (response.status === 404) {
                        logInvestigation('Frontend Routing', `Route ${route} Analysis`, 
                            'Route returns 404 - likely client-side routing issue', 'HIGH',
                            [
                                'Check React Router configuration',
                                'Verify route definitions in App.js',
                                'Check for missing components',
                                'Consider implementing fallback to index.html for SPA routing'
                            ]
                        );
                    }
                } catch (error) {
                    logInvestigation('Frontend Routing', `Route ${route} Analysis`, 
                        `Route failed: ${error.message}`, 'HIGH');
                }
            }
        }
    } catch (error) {
        logInvestigation('Frontend Routing', 'Frontend Server Analysis', 
            `Frontend server issue: ${error.message}`, 'CRITICAL',
            ['Check frontend server startup', 'Verify port 3002 is accessible']);
    }
}

// INVESTIGATION 2: Stripe Integration Deep Dive
async function investigateStripeIntegration() {
    console.log('\n🔍 INVESTIGATING STRIPE INTEGRATION');
    console.log('='.repeat(50));
    
    // Check server routes for Stripe endpoints
    try {
        // Test all potential Stripe endpoint paths
        const stripeEndpoints = [
            '/stripe/config',
            '/payments/stripe/config', 
            '/api/stripe/config',
            '/stripe/create-payment-intent',
            '/payments/create-payment-intent'
        ];
        
        for (const endpoint of stripeEndpoints) {
            try {
                const response = await axios.get(`${API_URL}${endpoint}`, { 
                    timeout: 5000,
                    validateStatus: (status) => status < 500
                });
                
                if (response.status === 200) {
                    logInvestigation('Stripe Integration', `Endpoint Discovery: ${endpoint}`, 
                        'Endpoint accessible and returns data', 'INFO');
                } else if (response.status === 404) {
                    logInvestigation('Stripe Integration', `Endpoint Discovery: ${endpoint}`, 
                        'Endpoint not found', 'MEDIUM');
                }
            } catch (error) {
                if (error.response && error.response.status === 404) {
                    logInvestigation('Stripe Integration', `Endpoint Discovery: ${endpoint}`, 
                        'Endpoint not found', 'MEDIUM');
                } else {
                    logInvestigation('Stripe Integration', `Endpoint Discovery: ${endpoint}`, 
                        `Error: ${error.message}`, 'HIGH');
                }
            }
        }
        
        // Check environment configuration
        logInvestigation('Stripe Integration', 'Configuration Analysis', 
            'Stripe endpoints appear to be missing from server routes', 'HIGH',
            [
                'Check if stripe routes are properly mounted in server/index.js',
                'Verify stripe route files exist in server/routes/',
                'Check environment variables for Stripe keys',
                'Review server logs for Stripe initialization errors'
            ]
        );
        
    } catch (error) {
        logInvestigation('Stripe Integration', 'Integration Analysis', 
            `Critical error in Stripe investigation: ${error.message}`, 'CRITICAL');
    }
}

// INVESTIGATION 3: Authentication & Profile Issues
async function investigateAuthenticationIssues() {
    console.log('\n🔍 INVESTIGATING AUTHENTICATION ISSUES');
    console.log('='.repeat(50));
    
    // First, register a new user for testing
    try {
        const testUser = {
            email: `investigation_${Date.now()}@test.com`,
            password: 'TestPassword123!',
            username: `testuser_${Date.now()}`
        };
        
        const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
        
        if (registerResponse.status === 201 && registerResponse.data.token) {
            userToken = registerResponse.data.token;
            
            logInvestigation('Authentication', 'User Registration Analysis', 
                'Registration working correctly with token generation', 'INFO');
            
            // Test profile endpoint specifically
            try {
                const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
                    headers: { Authorization: `Bearer ${userToken}` }
                });
                
                if (profileResponse.status === 200) {
                    logInvestigation('Authentication', 'Profile Endpoint Analysis', 
                        'Profile endpoint working correctly', 'INFO');
                } else {
                    logInvestigation('Authentication', 'Profile Endpoint Analysis', 
                        'Profile endpoint returns unexpected status', 'HIGH');
                }
            } catch (profileError) {
                if (profileError.response && profileError.response.status === 404) {
                    logInvestigation('Authentication', 'Profile Endpoint Analysis', 
                        'Profile endpoint returns 404 - route may not exist', 'HIGH',
                        [
                            'Check if profile route is defined in auth routes',
                            'Verify route path matches what frontend expects',
                            'Check if authMiddleware is properly applied'
                        ]
                    );
                } else {
                    logInvestigation('Authentication', 'Profile Endpoint Analysis', 
                        `Profile access error: ${profileError.message}`, 'HIGH');
                }
            }
            
            // Test token validation with various endpoints
            const protectedEndpoints = [
                '/auth/profile',
                '/users/profile',
                '/projects',
                '/notifications'
            ];
            
            for (const endpoint of protectedEndpoints) {
                try {
                    await axios.get(`${API_URL}${endpoint}`, {
                        headers: { Authorization: `Bearer ${userToken}` }
                    });
                    logInvestigation('Authentication', `Token Validation: ${endpoint}`, 
                        'Token accepted by endpoint', 'INFO');
                } catch (error) {
                    const status = error.response ? error.response.status : 'Connection Error';
                    logInvestigation('Authentication', `Token Validation: ${endpoint}`, 
                        `Status: ${status} - ${error.message}`, status === 401 ? 'HIGH' : 'MEDIUM');
                }
            }
            
        } else {
            logInvestigation('Authentication', 'Registration Token Generation', 
                'Registration succeeded but no token received', 'HIGH');
        }
        
    } catch (error) {
        logInvestigation('Authentication', 'User Registration Analysis', 
            `Registration failed: ${error.message}`, 'CRITICAL');
    }
}

// INVESTIGATION 4: Real-time Communication Testing
async function investigateRealTimeCommunication() {
    console.log('\n🔍 INVESTIGATING REAL-TIME COMMUNICATION');
    console.log('='.repeat(50));
    
    // Check Socket.IO server connectivity
    try {
        const socketResponse = await axios.get('http://localhost:5001/socket.io/', { 
            timeout: 5000,
            validateStatus: (status) => status < 500
        });
        
        if (socketResponse.status === 400) {
            logInvestigation('Real-time Communication', 'Socket.IO Server Status', 
                'Socket.IO server is running (expected 400 for HTTP GET)', 'INFO');
        } else {
            logInvestigation('Real-time Communication', 'Socket.IO Server Status', 
                `Unexpected response: ${socketResponse.status}`, 'MEDIUM');
        }
    } catch (error) {
        logInvestigation('Real-time Communication', 'Socket.IO Server Status', 
            `Socket.IO server issue: ${error.message}`, 'HIGH',
            [
                'Check Socket.IO server initialization',
                'Verify port configuration',
                'Check for firewall or network issues'
            ]
        );
    }
}

// INVESTIGATION 5: Transaction & Payment Workflow
async function investigateTransactionWorkflow() {
    console.log('\n🔍 INVESTIGATING TRANSACTION WORKFLOW');
    console.log('='.repeat(50));
    
    if (!userToken) {
        logInvestigation('Transaction Workflow', 'Authentication Requirement', 
            'Cannot test transaction workflow without valid user token', 'HIGH');
        return;
    }
    
    // Test purchase request endpoints
    const transactionEndpoints = [
        { path: '/purchase-requests', method: 'GET', description: 'Purchase Request Listing' },
        { path: '/purchase-requests', method: 'POST', description: 'Purchase Request Creation' },
        { path: '/payments/create-payment-intent', method: 'POST', description: 'Payment Intent Creation' },
        { path: '/payments/webhook', method: 'POST', description: 'Payment Webhook Handling' }
    ];
    
    for (const endpoint of transactionEndpoints) {
        try {
            let response;
            const config = {
                headers: { Authorization: `Bearer ${userToken}` },
                timeout: 5000,
                validateStatus: (status) => status < 500
            };
            
            if (endpoint.method === 'GET') {
                response = await axios.get(`${API_URL}${endpoint.path}`, config);
            } else {
                const testData = endpoint.path.includes('purchase-requests') ? 
                    { projectId: 1, offerAmount: 500, message: 'Test offer' } :
                    { amount: 1000 };
                response = await axios.post(`${API_URL}${endpoint.path}`, testData, config);
            }
            
            logInvestigation('Transaction Workflow', endpoint.description, 
                `Endpoint accessible (Status: ${response.status})`, 'INFO');
                
        } catch (error) {
            const status = error.response ? error.response.status : 'Connection Error';
            const severity = status === 404 ? 'HIGH' : 'MEDIUM';
            
            logInvestigation('Transaction Workflow', endpoint.description, 
                `Endpoint issue - Status: ${status}`, severity,
                status === 404 ? ['Endpoint may not be implemented', 'Check route mounting'] : []
            );
        }
    }
}

// INVESTIGATION 6: Security Vulnerability Assessment
async function investigateSecurityVulnerabilities() {
    console.log('\n🔍 INVESTIGATING SECURITY VULNERABILITIES');
    console.log('='.repeat(50));
    
    // Test 1: SQL Injection attempts
    const sqlInjectionTests = [
        { input: "'; DROP TABLE users; --", description: 'Basic SQL Injection' },
        { input: "1' OR '1'='1", description: 'Classic OR Injection' },
        { input: "admin'/**/OR/**/1=1--", description: 'Comment-based Injection' }
    ];
    
    for (const test of sqlInjectionTests) {
        try {
            await axios.post(`${API_URL}/auth/login`, {
                email: test.input,
                password: 'test'
            });
            
            logInvestigation('Security', `SQL Injection Test: ${test.description}`, 
                'Injection attempt was processed (potential vulnerability)', 'CRITICAL',
                ['Implement proper input sanitization', 'Use parameterized queries']);
        } catch (error) {
            if (error.response && (error.response.status === 400 || error.response.status === 401)) {
                logInvestigation('Security', `SQL Injection Test: ${test.description}`, 
                    'Injection attempt properly rejected', 'INFO');
            } else {
                logInvestigation('Security', `SQL Injection Test: ${test.description}`, 
                    `Unexpected response: ${error.message}`, 'MEDIUM');
            }
        }
    }
    
    // Test 2: XSS vulnerability check
    const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>'
    ];
    
    for (const payload of xssPayloads) {
        try {
            const response = await axios.post(`${API_URL}/auth/register`, {
                email: `test_${Date.now()}@test.com`,
                password: 'Test123!',
                username: payload
            });
            
            if (response.status === 201) {
                logInvestigation('Security', 'XSS Vulnerability Test', 
                    'XSS payload accepted in username field', 'HIGH',
                    ['Implement input sanitization', 'Validate and escape user inputs']);
            }
        } catch (error) {
            logInvestigation('Security', 'XSS Vulnerability Test', 
                'XSS payload rejected or error occurred', 'INFO');
        }
    }
    
    // Test 3: Authentication bypass attempts
    const bypassTests = [
        { headers: {}, description: 'No Authentication Header' },
        { headers: { Authorization: 'Bearer invalid_token' }, description: 'Invalid Token' },
        { headers: { Authorization: 'Basic invalid' }, description: 'Wrong Auth Method' }
    ];
    
    for (const test of bypassTests) {
        try {
            const response = await axios.get(`${API_URL}/projects`, { headers: test.headers });
            
            if (response.status === 200) {
                logInvestigation('Security', `Auth Bypass Test: ${test.description}`, 
                    'Protected endpoint accessible without proper authentication', 'CRITICAL',
                    ['Review authentication middleware', 'Ensure all protected routes require valid tokens']);
            }
        } catch (error) {
            if (error.response && error.response.status === 401) {
                logInvestigation('Security', `Auth Bypass Test: ${test.description}`, 
                    'Unauthorized access properly blocked', 'INFO');
            }
        }
    }
    
    // Test 4: CORS configuration check
    try {
        const response = await axios.options(API_URL, {
            headers: {
                'Origin': 'https://malicious-site.com',
                'Access-Control-Request-Method': 'POST',
                'Access-Control-Request-Headers': 'Content-Type'
            }
        });
        
        const corsHeaders = response.headers['access-control-allow-origin'];
        if (corsHeaders === '*') {
            logInvestigation('Security', 'CORS Configuration Check', 
                'CORS allows all origins (*) - potential security risk', 'HIGH',
                ['Configure specific allowed origins', 'Remove wildcard CORS for production']);
        } else {
            logInvestigation('Security', 'CORS Configuration Check', 
                `CORS properly configured: ${corsHeaders}`, 'INFO');
        }
    } catch (error) {
        logInvestigation('Security', 'CORS Configuration Check', 
            'Could not test CORS configuration', 'MEDIUM');
    }
}

// GENERATE FINAL INVESTIGATION REPORT
async function generateInvestigationReport() {
    console.log('\n📊 GENERATING INVESTIGATION REPORT');
    console.log('='.repeat(50));
    
    investigation.metadata.endTime = new Date().toISOString();
    
    // Count findings by severity
    let criticalCount = 0, highCount = 0, mediumCount = 0, infoCount = 0;
    
    Object.values(investigation.findings).forEach(areaFindings => {
        areaFindings.forEach(finding => {
            switch (finding.severity) {
                case 'CRITICAL': criticalCount++; break;
                case 'HIGH': highCount++; break;
                case 'MEDIUM': mediumCount++; break;
                case 'INFO': infoCount++; break;
            }
        });
    });
    
    investigation.summary = {
        totalFindings: criticalCount + highCount + mediumCount + infoCount,
        criticalFindings: criticalCount,
        highFindings: highCount,
        mediumFindings: mediumCount,
        infoFindings: infoCount
    };
    
    // Generate priority recommendations
    investigation.recommendations = [
        criticalCount > 0 ? 'IMMEDIATE: Address all critical security vulnerabilities' : null,
        highCount > 0 ? 'HIGH PRIORITY: Fix high-severity issues before deployment' : null,
        'Implement comprehensive error handling and logging',
        'Set up proper monitoring and alerting systems',
        'Create automated testing pipeline for continuous quality assurance'
    ].filter(rec => rec !== null);
    
    // Save report
    fs.writeFileSync(INVESTIGATION_REPORT, JSON.stringify(investigation, null, 2));
    
    // Print summary
    console.log('\n🎯 INVESTIGATION SUMMARY');
    console.log('-'.repeat(30));
    console.log(`Total Findings: ${investigation.summary.totalFindings}`);
    console.log(`Critical: ${criticalCount} | High: ${highCount} | Medium: ${mediumCount} | Info: ${infoCount}`);
    
    if (criticalCount > 0) {
        console.log('\n🚨 CRITICAL ISSUES REQUIRE IMMEDIATE ATTENTION');
    } else if (highCount > 0) {
        console.log('\n⚠️ HIGH PRIORITY ISSUES NEED ADDRESSING');
    } else {
        console.log('\n✅ No critical issues found');
    }
    
    console.log(`\n📄 Detailed investigation report saved to: ${INVESTIGATION_REPORT}`);
    
    return investigation;
}

// MAIN EXECUTION
async function runCriticalIssueInvestigation() {
    console.log('🔍 SIDEBUILDS CRITICAL ISSUE INVESTIGATION');
    console.log('='.repeat(60));
    console.log(`Started at: ${new Date().toISOString()}`);
    
    try {
        await investigateFrontendRouting();
        await investigateStripeIntegration();
        await investigateAuthenticationIssues();
        await investigateRealTimeCommunication();
        await investigateTransactionWorkflow();
        await investigateSecurityVulnerabilities();
        
        const report = await generateInvestigationReport();
        
        console.log('\n🎉 CRITICAL ISSUE INVESTIGATION COMPLETED!');
        
        return report;
        
    } catch (error) {
        console.error('\n💥 INVESTIGATION ERROR:', error.message);
        investigation.metadata.endTime = new Date().toISOString();
        fs.writeFileSync(INVESTIGATION_REPORT, JSON.stringify(investigation, null, 2));
        throw error;
    }
}

// Export and execute
module.exports = { runCriticalIssueInvestigation, investigation };

if (require.main === module) {
    runCriticalIssueInvestigation()
        .then(report => {
            process.exit(report.summary.criticalFindings > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('Investigation failed:', error.message);
            process.exit(1);
        });
}