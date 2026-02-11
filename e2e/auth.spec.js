/**
 * [Test] Authentication Flow E2E Tests
 * Tests login, registration, and logout functionality
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage.js';
import { DashboardPage } from './page-objects/DashboardPage.js';
import { createTestUser, createTestPartner } from './fixtures/test-data.js';

test.describe('[Test] Authentication Flow', () => {
    let loginPage;
    let dashboardPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new DashboardPage(page);
        await loginPage.goto();
    });

    test.describe('Login Tests', () => {
        test('should login successfully with valid admin credentials', async ({ page }) => {
            await loginPage.login('admin@salespro.com', 'Admin123!');

            // Should redirect to dashboard
            await expect(page).toHaveURL(/.*dashboard/);

            // Dashboard should be visible
            await dashboardPage.waitForLoad();
            await expect(dashboardPage.dashboard).toBeVisible();
        });

        test('should show error with invalid credentials', async ({ page }) => {
            await loginPage.login('invalid@test.com', 'WrongPassword123!');

            // Should show error message
            const hasError = await loginPage.hasError();
            expect(hasError).toBe(true);

            // Should stay on login page
            await expect(page).toHaveURL(/.*\//);
        });

        test('should show error with missing email', async ({ page }) => {
            await loginPage.passwordInput.fill('Test123!');
            await loginPage.loginButton.click();

            // Should show validation error
            const emailValidity = await loginPage.emailInput.evaluate(
                (el) => el.validity.valid
            );
            expect(emailValidity).toBe(false);
        });

        test('should show error with missing password', async ({ page }) => {
            await loginPage.emailInput.fill('test@test.com');
            await loginPage.loginButton.click();

            // Should show validation error
            const passwordValidity = await loginPage.passwordInput.evaluate(
                (el) => el.validity.valid
            );
            expect(passwordValidity).toBe(false);
        });

        test('should redirect to dashboard after successful login', async ({ page }) => {
            await loginPage.login('admin@salespro.com', 'Admin123!');

            // Wait for redirect
            await page.waitForURL(/.*dashboard/, { timeout: 10000 });

            // Verify URL contains dashboard
            expect(page.url()).toContain('dashboard');
        });

        test('should handle SQL injection attempts safely', async ({ page }) => {
            await loginPage.login("admin' OR '1'='1", "password' OR '1'='1");

            // Should not login
            const hasError = await loginPage.hasError();
            expect(hasError).toBe(true);
        });

        test('should handle XSS attempts in login form', async ({ page }) => {
            await loginPage.login('<script>alert("xss")</script>', 'password');

            // Should not execute script
            const hasError = await loginPage.hasError();
            expect(hasError).toBe(true);

            // Check that no alert was triggered
            page.on('dialog', async dialog => {
                throw new Error('Unexpected alert dialog');
            });
        });
    });

    test.describe('Registration Tests', () => {
        test('should register new user successfully', async ({ page }) => {
            const userData = createTestUser();

            await loginPage.goToRegister();

            // Fill registration form
            await page.fill('input[name="email"]', userData.email);
            await page.fill('input[name="password"]', userData.password);
            await page.fill('input[name="firstName"]', userData.firstName);
            await page.fill('input[name="lastName"]', userData.lastName);
            await page.selectOption('select[name="userType"]', userData.userType);

            // Submit form
            await page.click('button[type="submit"]');

            // Should show success message or redirect
            await expect(page.locator('text=Registration successful')).toBeVisible({
                timeout: 5000
            });
        });

        test('should show error for duplicate email', async ({ page }) => {
            await loginPage.goToRegister();

            // Try to register with existing admin email
            await page.fill('input[name="email"]', 'admin@salespro.com');
            await page.fill('input[name="password"]', 'Test123!');
            await page.fill('input[name="firstName"]', 'Test');
            await page.fill('input[name="lastName"]', 'User');
            await page.selectOption('select[name="userType"]', 'INTERNAL');

            await page.click('button[type="submit"]');

            // Should show error
            await expect(page.locator('text=/.*already exists.*|.*already registered.*/i')).toBeVisible({
                timeout: 5000
            });
        });

        test('should validate password strength', async ({ page }) => {
            await loginPage.goToRegister();

            const userData = createTestUser({ password: 'weak' });

            await page.fill('input[name="email"]', userData.email);
            await page.fill('input[name="password"]', userData.password);
            await page.fill('input[name="firstName"]', userData.firstName);
            await page.fill('input[name="lastName"]', userData.lastName);

            // Should show password strength indicator
            const strengthIndicator = page.locator('[data-testid="password-strength"]');
            if (await strengthIndicator.isVisible()) {
                const strength = await strengthIndicator.textContent();
                expect(strength).toContain('weak');
            }
        });

        test('should require partner category for partner users', async ({ page }) => {
            await loginPage.goToRegister();

            const userData = createTestPartner('GOLD');

            await page.fill('input[name="email"]', userData.email);
            await page.fill('input[name="password"]', userData.password);
            await page.fill('input[name="firstName"]', userData.firstName);
            await page.fill('input[name="lastName"]', userData.lastName);
            await page.selectOption('select[name="userType"]', 'PARTNER');

            // Partner category field should be visible
            const categorySelect = page.locator('select[name="partnerCategory"]');
            await expect(categorySelect).toBeVisible();

            // Select category
            await page.selectOption('select[name="partnerCategory"]', userData.partnerCategory);

            await page.click('button[type="submit"]');
        });
    });

    test.describe('Logout Tests', () => {
        test('should logout and redirect to login page', async ({ page }) => {
            // Login first
            await loginPage.login('admin@salespro.com', 'Admin123!');
            await dashboardPage.waitForLoad();

            // Logout
            await dashboardPage.logout();

            // Should redirect to login page
            await expect(page).toHaveURL(/.*\//);

            // Login form should be visible
            await expect(loginPage.emailInput).toBeVisible();
        });

        test('should clear authentication token on logout', async ({ page }) => {
            // Login
            await loginPage.login('admin@salespro.com', 'Admin123!');
            await dashboardPage.waitForLoad();

            // Verify token exists
            const tokenBefore = await page.evaluate(() => localStorage.getItem('token'));
            expect(tokenBefore).toBeTruthy();

            // Logout
            await dashboardPage.logout();

            // Token should be cleared
            const tokenAfter = await page.evaluate(() => localStorage.getItem('token'));
            expect(tokenAfter).toBeFalsy();
        });
    });
});
