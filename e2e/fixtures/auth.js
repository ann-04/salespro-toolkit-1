/**
 * Authentication Helper Functions for E2E Tests
 * Provides reusable authentication utilities with API key modal handling
 */

/**
 * Handle API Key Modal
 * The app shows an API key modal after login if no key is stored
 * This function dismisses it or fills in a test key
 */
export async function handleApiKeyModal(page) {
    try {
        // Wait for modal to appear (it shows after login)
        const modal = page.locator('div.fixed.inset-0.bg-black\\/60');
        await modal.waitFor({ state: 'visible', timeout: 3000 });

        // Fill in a test API key and submit
        await page.locator('input[name="key"]').fill('AIzaSyDummy_Test_Key_For_E2E_Tests_12345');
        await page.locator('button:has-text("Save & Continue")').click();

        // Wait for modal to close
        await modal.waitFor({ state: 'hidden', timeout: 5000 });

        // CRITICAL FIX: Wait extra time for CSS animations to complete
        // The modal has z-index 100 which covers the logout button (z-index 50)
        // Even after the modal is "hidden", animations might still be running
        await page.waitForTimeout(1000);
    } catch (error) {
        // Modal not shown or already dismissed, continue
        // This is fine - user might have key already set
    }
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(page) {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'admin@salespro.com');
    await page.fill('input[type="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Handle API key modal if it appears
    await handleApiKeyModal(page);

    // Wait for dashboard to load
    await page.waitForSelector('h2:has-text("Welcome back")', { timeout: 10000 });
}

/**
 * Login as partner user
 */
export async function loginAsPartner(page, category = 'GOLD') {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });

    // Use different partner credentials based on category
    const credentials = {
        BRONZE: { email: 'bronze@partner.com', password: 'Bronze123!' },
        SILVER: { email: 'silver@partner.com', password: 'Silver123!' },
        GOLD: { email: 'gold@partner.com', password: 'Gold123!' },
        PLATINUM: { email: 'platinum@partner.com', password: 'Platinum123!' }
    };

    const creds = credentials[category] || credentials.GOLD;

    await page.fill('input[type="email"]', creds.email);
    await page.fill('input[type="password"]', creds.password);
    await page.click('button[type="submit"]');

    // Handle API key modal if it appears
    await handleApiKeyModal(page);

    // Wait for dashboard to load
    await page.waitForSelector('h2:has-text("Welcome back")', { timeout: 10000 });
}

/**
 * Login as internal user
 */
export async function loginAsInternal(page) {
    await page.goto('/');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.fill('input[type="email"]', 'user@salespro.com');
    await page.fill('input[type="password"]', 'User123!');
    await page.click('button[type="submit"]');

    // Handle API key modal if it appears
    await handleApiKeyModal(page);

    // Wait for dashboard to load
    await page.waitForSelector('h2:has-text("Welcome back")', { timeout: 10000 });
}

/**
 * Logout current user
 */
export async function logout(page) {
    // Click logout button (updated selector from App.tsx)
    await page.click('button:has-text("Logout")');

    // Wait for redirect to login page
    await page.waitForSelector('h2:has-text("Welcome Back")', { timeout: 5000 });
}

/**
 * Get authentication token from localStorage
 */
export async function getAuthToken(page) {
    return await page.evaluate(() => {
        return localStorage.getItem('token');
    });
}

/**
 * Set authentication token in localStorage
 */
export async function setAuthToken(page, token) {
    await page.evaluate((token) => {
        localStorage.setItem('token', token);
    }, token);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page) {
    const token = await getAuthToken(page);
    return !!token;
}

/**
 * Register a new user
 */
export async function registerUser(page, userData) {
    await page.goto('/');

    // Click register link (updated selector)
    await page.click('button:has-text("Request Access")');

    // Wait for registration page
    await page.waitForSelector('h2:has-text("Request Access")', { timeout: 5000 });

    // Fill registration form
    await page.fill('input[type="text"]', userData.name);
    await page.fill('input[type="email"]', userData.email);

    // Select user type (INTERNAL or PARTNER)
    if (userData.userType === 'PARTNER') {
        await page.click('input[value="PARTNER"]');
    } else {
        await page.click('input[value="INTERNAL"]');
    }

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for success message
    await page.waitForSelector('h2:has-text("Request Sent!")', { timeout: 5000 });
}
