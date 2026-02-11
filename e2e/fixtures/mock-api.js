/**
 * Mock API Fixture for E2E Tests
 * Intercepts backend API calls to eliminate database dependency
 */

/**
 * Mock authentication API endpoints
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function mockAuthAPI(page) {
    // Use exact URL matching instead of wildcards for more reliable interception

    // Mock login endpoint
    await page.route('http://localhost:3000/api/auth/login', async route => {
        const request = route.request();
        const postData = request.postDataJSON();

        // Simulate successful login for valid credentials
        if (postData.email === 'admin@salespro.com' && postData.password === 'Admin123!') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    token: 'mock-jwt-token-admin-12345',
                    user: {
                        id: 1,
                        name: 'Test Admin',
                        email: 'admin@salespro.com',
                        role: 'Admin',
                        userType: 'Internal',
                        mustChangePassword: false
                    }
                })
            });
        } else {
            // Simulate login failure for invalid credentials
            await route.fulfill({
                status: 401,
                contentType: 'application/json',
                body: JSON.stringify({
                    error: 'Invalid credentials'
                })
            });
        }
    });

    // Mock register endpoint
    await page.route('http://localhost:3000/api/auth/register', async route => {
        const request = route.request();
        const postData = request.postDataJSON();

        // Simulate successful registration
        await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
                message: 'Registration successful',
                userId: 999
            })
        });
    });

    // Mock any other API calls with wildcard (for preferences, etc.)
    await page.route('http://localhost:3000/api/**', async route => {
        const url = route.request().url();
        console.log(`[Mock API] Catch-all handling: ${url}`);

        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ success: true })
        });
    });
}

/**
 * Setup all mock APIs for authentication tests
 * @param {import('@playwright/test').Page} page - Playwright page object
 */
export async function setupAuthMocks(page) {
    await mockAuthAPI(page);
}
