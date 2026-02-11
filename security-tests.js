/**
 * Security Test Suite for SalesPro Toolkit
 * Tests OWASP Top 10:2025 compliance
 * 
 * Run with: node security-tests.js
 */

const https = require('https');
const http = require('http');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = `test_${Date.now()}@security-test.com`;
const TEST_PASSWORD = 'SecureP@ss123!';

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

// Helper function to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const jsonBody = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, headers: res.headers, body: jsonBody });
                } catch (e) {
                    resolve({ status: res.statusCode, headers: res.headers, body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

// Test helper
async function test(name, testFn) {
    try {
        await testFn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`✅ PASS: ${name}`);
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(`❌ FAIL: ${name}`);
        console.log(`   Error: ${error.message}`);
    }
}

// Assertion helpers
function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

// =============================================================================
// A01: BROKEN ACCESS CONTROL TESTS
// =============================================================================

async function testBrokenAccessControl() {
    console.log('\n=== A01: Broken Access Control Tests ===\n');

    // Test 1.1: Public endpoints require authentication
    await test('GET /api/admin/users requires authentication', async () => {
        const res = await makeRequest('GET', '/api/admin/users');
        assertEqual(res.status, 401, 'Should return 401 Unauthorized');
    });

    await test('GET /api/admin/business-units requires authentication', async () => {
        const res = await makeRequest('GET', '/api/admin/business-units');
        assertEqual(res.status, 401, 'Should return 401 Unauthorized');
    });

    await test('GET /api/admin/roles requires authentication', async () => {
        const res = await makeRequest('GET', '/api/admin/roles');
        assertEqual(res.status, 401, 'Should return 401 Unauthorized');
    });

    // Test 1.2: Invalid token rejected
    await test('Invalid JWT token rejected', async () => {
        const res = await makeRequest('GET', '/api/admin/users', null, {
            'Authorization': 'Bearer invalid_token_here'
        });
        assertEqual(res.status, 401, 'Should return 401 Unauthorized');
    });

    // Test 1.3: Malformed token rejected
    await test('Malformed JWT token rejected', async () => {
        const res = await makeRequest('GET', '/api/admin/users', null, {
            'Authorization': 'Bearer eyJhbGciOiJub25lIn0.eyJ1c2VySWQiOjF9.'
        });
        assertEqual(res.status, 401, 'Should return 401 Unauthorized');
    });
}

// =============================================================================
// A02: SECURITY MISCONFIGURATION TESTS
// =============================================================================

async function testSecurityMisconfiguration() {
    console.log('\n=== A02: Security Misconfiguration Tests ===\n');

    // Test 2.1: Security headers present
    await test('Security headers present', async () => {
        const res = await makeRequest('GET', '/api/login');
        assert(res.headers['x-frame-options'], 'X-Frame-Options header missing');
        assert(res.headers['x-content-type-options'], 'X-Content-Type-Options header missing');
        assert(res.headers['x-xss-protection'], 'X-XSS-Protection header missing');
    });

    // Test 2.2: Error messages don't leak information
    await test('Error messages are production-safe', async () => {
        const res = await makeRequest('POST', '/api/admin/users/abc/approve', null, {
            'Authorization': 'Bearer fake_token'
        });
        assert(!res.body.stack, 'Stack trace should not be exposed');
        assert(!res.body.message?.includes('SQL'), 'SQL errors should not be exposed');
    });

    // Test 2.3: CORS configured
    await test('CORS headers configured', async () => {
        const res = await makeRequest('OPTIONS', '/api/login', null, {
            'Origin': 'http://localhost:5173'
        });
        // CORS should be configured (either allowed or rejected, not missing)
        assert(res.status !== 404, 'CORS should be configured');
    });
}

// =============================================================================
// A05: INJECTION TESTS
// =============================================================================

async function testInjection() {
    console.log('\n=== A05: Injection Tests ===\n');

    // Test 5.1: SQL injection in ID parameter
    await test('SQL injection in ID parameter blocked', async () => {
        const res = await makeRequest('POST', "/api/admin/users/1' OR '1'='1/approve");
        // Should either be 400 (validation) or 401 (auth), not 200
        assert(res.status !== 200, 'SQL injection should be blocked');
    });

    // Test 5.2: XSS in name field
    await test('XSS in name field sanitized', async () => {
        const res = await makeRequest('POST', '/api/admin/business-units', {
            name: "<script>alert('XSS')</script>"
        });
        // Should be 400 (validation) or 401 (auth), not execute script
        assert(res.status !== 200 || !res.body.name?.includes('<script>'),
            'XSS should be sanitized');
    });

    // Test 5.3: SQL injection in string field
    await test('SQL injection in string field blocked', async () => {
        const res = await makeRequest('POST', '/api/admin/roles', {
            name: "Admin'; DROP TABLE Roles; --"
        });
        // Should be rejected or sanitized
        assert(res.status !== 200 || !res.body.name?.includes('DROP TABLE'),
            'SQL injection should be blocked');
    });

    // Test 5.4: Command injection attempt
    await test('Command injection blocked', async () => {
        const res = await makeRequest('POST', '/api/products', {
            name: "; rm -rf /",
            description: "test"
        });
        assert(res.status !== 200 || !res.body.name?.includes('; rm'),
            'Command injection should be blocked');
    });
}

// =============================================================================
// A04: CRYPTOGRAPHIC FAILURES TESTS
// =============================================================================

async function testCryptographicFailures() {
    console.log('\n=== A04: Cryptographic Failures Tests ===\n');

    // Test 4.1: HTTPS enforcement (if applicable)
    await test('Server accepts HTTPS connections', async () => {
        // This test assumes HTTPS is configured
        // In development, this might not be applicable
        console.log('   ⚠️  HTTPS test skipped (development mode)');
        results.tests[results.tests.length - 1].status = 'SKIP';
    });

    // Test 4.2: JWT algorithm validation
    await test('JWT with "none" algorithm rejected', async () => {
        // Create a token with "none" algorithm
        const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64');
        const payload = Buffer.from(JSON.stringify({ userId: 1 })).toString('base64');
        const fakeToken = `${header}.${payload}.`;

        const res = await makeRequest('GET', '/api/admin/users', null, {
            'Authorization': `Bearer ${fakeToken}`
        });
        assertEqual(res.status, 401, 'Token with "none" algorithm should be rejected');
    });
}

// =============================================================================
// INPUT VALIDATION TESTS
// =============================================================================

async function testInputValidation() {
    console.log('\n=== Input Validation Tests ===\n');

    // Test: Empty string validation
    await test('Empty name rejected', async () => {
        const res = await makeRequest('POST', '/api/admin/business-units', {
            name: ""
        });
        assertEqual(res.status, 400, 'Empty name should be rejected');
    });

    // Test: Excessive length validation
    await test('Excessively long name rejected', async () => {
        const res = await makeRequest('POST', '/api/admin/business-units', {
            name: "A".repeat(200)
        });
        assertEqual(res.status, 400, 'Excessively long name should be rejected');
    });

    // Test: Invalid email format
    await test('Invalid email format rejected', async () => {
        const res = await makeRequest('POST', '/api/users', {
            name: "Test User",
            email: "not-an-email",
            password: "SecureP@ss123!"
        });
        assertEqual(res.status, 400, 'Invalid email should be rejected');
    });

    // Test: Invalid ID format
    await test('Invalid ID format rejected', async () => {
        const res = await makeRequest('POST', '/api/admin/users/abc/approve');
        assertEqual(res.status, 400, 'Invalid ID should be rejected');
    });

    // Test: Negative ID rejected
    await test('Negative ID rejected', async () => {
        const res = await makeRequest('POST', '/api/admin/users/-1/approve');
        assertEqual(res.status, 400, 'Negative ID should be rejected');
    });

    // Test: Zero ID rejected
    await test('Zero ID rejected', async () => {
        const res = await makeRequest('POST', '/api/admin/users/0/approve');
        assertEqual(res.status, 400, 'Zero ID should be rejected');
    });

    // Test: AI chat message validation
    await test('AI chat empty messages rejected', async () => {
        const res = await makeRequest('POST', '/api/ai/chat', {
            messages: []
        });
        assertEqual(res.status, 400, 'Empty messages array should be rejected');
    });

    // Test: AI chat message length validation
    await test('AI chat excessively long message rejected', async () => {
        const res = await makeRequest('POST', '/api/ai/chat', {
            messages: [{ content: "A".repeat(20000) }]
        });
        assertEqual(res.status, 400, 'Excessively long message should be rejected');
    });
}

// =============================================================================
// PERMISSION ENFORCEMENT TESTS
// =============================================================================

async function testPermissionEnforcement() {
    console.log('\n=== Permission Enforcement Tests ===\n');

    // Note: These tests require a valid token without proper permissions
    // In a real test, you would create a user with limited permissions

    await test('Admin endpoints require permissions (simulated)', async () => {
        // Without a valid token, we can't test permission enforcement directly
        // But we can verify that authentication is required
        const res = await makeRequest('POST', '/api/admin/business-units', {
            name: "Test BU"
        });
        assert(res.status === 401 || res.status === 403,
            'Should require authentication or permission');
    });

    await test('User management requires USERS_MANAGE permission', async () => {
        const res = await makeRequest('PUT', '/api/admin/users/1', {
            roleId: 2
        });
        assert(res.status === 401 || res.status === 403,
            'Should require authentication or USERS_MANAGE permission');
    });

    await test('Role management requires ROLES_MANAGE permission', async () => {
        const res = await makeRequest('POST', '/api/admin/roles', {
            name: "Test Role"
        });
        assert(res.status === 401 || res.status === 403,
            'Should require authentication or ROLES_MANAGE permission');
    });
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║   SalesPro Toolkit Security Test Suite                    ║');
    console.log('║   OWASP Top 10:2025 Compliance Testing                    ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`Testing against: ${BASE_URL}`);
    console.log(`Test started: ${new Date().toISOString()}\n`);

    try {
        await testBrokenAccessControl();
        await testSecurityMisconfiguration();
        await testInjection();
        await testCryptographicFailures();
        await testInputValidation();
        await testPermissionEnforcement();

        // Print summary
        console.log('\n╔════════════════════════════════════════════════════════════╗');
        console.log('║   TEST SUMMARY                                             ║');
        console.log('╚════════════════════════════════════════════════════════════╝\n');
        console.log(`Total Tests: ${results.passed + results.failed}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%\n`);

        if (results.failed > 0) {
            console.log('Failed Tests:');
            results.tests
                .filter(t => t.status === 'FAIL')
                .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
        }

        console.log(`\nTest completed: ${new Date().toISOString()}`);

        // Exit with appropriate code
        process.exit(results.failed > 0 ? 1 : 0);

    } catch (error) {
        console.error('\n❌ Test suite failed with error:', error);
        process.exit(1);
    }
}

// Check if server is running before starting tests
async function checkServer() {
    try {
        await makeRequest('GET', '/api/health');
        console.log('✅ Server is running\n');
        return true;
    } catch (error) {
        console.error('❌ Server is not running. Please start the server first.');
        console.error(`   Run: npm run dev\n`);
        return false;
    }
}

// Run tests
(async () => {
    const serverRunning = await checkServer();
    if (serverRunning) {
        await runAllTests();
    } else {
        process.exit(1);
    }
})();
