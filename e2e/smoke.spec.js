/**
 * [Test] Basic Smoke Test
 * Verifies Playwright setup and basic application functionality
 */

import { test, expect } from '@playwright/test';

test.describe('[Test] Smoke Tests', () => {
    test('should load the application', async ({ page }) => {
        await page.goto('/');

        // Page should load successfully
        await expect(page).toHaveTitle(/SalesPro/i);
    });

    test('should display login form', async ({ page }) => {
        await page.goto('/');

        // Login form elements should be visible
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[type="password"]')).toBeVisible();
        await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should be responsive', async ({ page }) => {
        await page.goto('/');

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });
        await expect(page.locator('input[type="email"]')).toBeVisible();

        // Test tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });
        await expect(page.locator('input[type="email"]')).toBeVisible();

        // Test desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await expect(page.locator('input[type="email"]')).toBeVisible();
    });
});
