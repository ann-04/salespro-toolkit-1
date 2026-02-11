/**
 * [Test] Authentication Flow - Simplified
 * Tests login functionality with actual UI selectors
 * Simplified Authentication E2E Tests
 * Tests core login, logout, and form validation flows
 * Uses mocked API endpoints to eliminate database dependency
 * Uses real backend API with SQL Server database
 */

import { test, expect } from '@playwright/test';
import { LoginPage } from './page-objects/LoginPage.js';
import { DashboardPage } from './page-objects/DashboardPage.js';
import { handleApiKeyModal } from './fixtures/auth.js';

test.describe('[Test] Authentication - Login', () => {
    let loginPage;
    let dashboardPage;

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page);
        dashboardPage = new DashboardPage(page);
        await loginPage.goto();
    });

    test('should display login form elements', async ({ page }) => {
        // Verify all login form elements are visible
        await expect(loginPage.emailInput).toBeVisible();
        await expect(loginPage.passwordInput).toBeVisible();
        await expect(loginPage.loginButton).toBeVisible();
        await expect(loginPage.registerLink).toBeVisible();
        await expect(loginPage.welcomeHeading).toBeVisible();
    });

    test('should login successfully with valid admin credentials', async ({ page }) => {
        // Login with admin credentials
        await loginPage.login('admin@salespro.com', 'Admin123!');

        // Handle API key modal if it appears
        await handleApiKeyModal(page);

        // Verify dashboard is loaded
        await expect(dashboardPage.welcomeHeading).toBeVisible({ timeout: 10000 });

        // Verify welcome message contains user name
        const welcomeText = await dashboardPage.getWelcomeMessage();
        expect(welcomeText).toContain('Welcome Back'); // Note: UI uses uppercase 'B'
    });

    test('should show error with invalid credentials', async ({ page }) => {
        // Try to login with invalid credentials
        await loginPage.login('invalid@test.com', 'WrongPassword123!');

        // Wait for error message
        await page.waitForTimeout(2000);

        // Should show error message
        const hasError = await loginPage.hasError();
        expect(hasError).toBe(true);

        // Should stay on login page
        expect(await loginPage.isOnLoginPage()).toBe(true);
    });

    test('should show error with empty email', async ({ page }) => {
        // Try to submit with empty email
        await loginPage.passwordInput.fill('Password123!');
        await loginPage.loginButton.click();

        // HTML5 validation should prevent submission
        // Check if still on login page
        expect(await loginPage.isOnLoginPage()).toBe(true);
    });

    test('should show error with empty password', async ({ page }) => {
        // Try to submit with empty password
        await loginPage.emailInput.fill('test@example.com');
        await loginPage.loginButton.click();

        // HTML5 validation should prevent submission
        // Check if still on login page
        expect(await loginPage.isOnLoginPage()).toBe(true);
    });

    test('should navigate to registration page', async ({ page }) => {
        // Click register link
        await loginPage.goToRegister();

        // Should navigate to registration page
        await expect(page.locator('h2:has-text("Request Access")')).toBeVisible({ timeout: 5000 });
    });
});

test.describe('[Test] Authentication - Logout', () => {
    test('should logout successfully', async ({ page }) => {
        const loginPage = new LoginPage(page);
        const dashboardPage = new DashboardPage(page);

        // Login first
        await loginPage.goto();
        await loginPage.login('admin@salespro.com', 'Admin123!');

        // Handle API key modal if it appears
        await handleApiKeyModal(page);

        // Wait for dashboard
        await expect(dashboardPage.welcomeHeading).toBeVisible({ timeout: 10000 });

        // Logout (using force click to bypass z-index visibility issue)
        await dashboardPage.logout();

        // Wait for redirect - try URL change instead of element visibility
        await page.waitForURL('http://localhost:5173/', { timeout: 10000 });

        // Verify we're on login page
        await expect(loginPage.welcomeHeading).toBeVisible({ timeout: 2000 });
    });
});
