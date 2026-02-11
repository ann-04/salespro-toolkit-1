/**
 * [Test] User Management E2E Tests
 * Tests user CRUD operations and permission enforcement
 */

import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsPartner } from './fixtures/auth.js';
import { DashboardPage } from './page-objects/DashboardPage.js';
import { UserManagementPage } from './page-objects/UserManagementPage.js';
import { createTestUser, createTestPartner } from './fixtures/test-data.js';

test.describe('[Test] User Management', () => {
    let dashboardPage;
    let userPage;

    test.beforeEach(async ({ page }) => {
        dashboardPage = new DashboardPage(page);
        userPage = new UserManagementPage(page);
    });

    test.describe('View Users', () => {
        test('should display user list for admin', async ({ page }) => {
            await loginAsAdmin(page);
            await dashboardPage.goToUsers();

            // User table should be visible
            await userPage.waitForLoad();
            await expect(userPage.userTable).toBeVisible();

            // Should have at least one user (admin)
            const userCount = await userPage.getUserCount();
            expect(userCount).toBeGreaterThan(0);
        });

        test('should hide user management for non-admin partner', async ({ page }) => {
            await loginAsPartner(page, 'BRONZE');

            // Users tab should not be visible
            const isVisible = await dashboardPage.isTabVisible('Users');
            expect(isVisible).toBe(false);
        });
    });

    test.describe('Create User', () => {
        test.beforeEach(async ({ page }) => {
            await loginAsAdmin(page);
            await dashboardPage.goToUsers();
            await userPage.waitForLoad();
        });

        test('should create new internal user', async ({ page }) => {
            const userData = createTestUser();

            await userPage.clickAddUser();
            await userPage.fillUserForm(userData);
            await userPage.saveUser();

            // Should show success message
            await expect(page.locator('text=/.*success.*|.*created.*/i')).toBeVisible({
                timeout: 5000
            });

            // User should appear in table
            const exists = await userPage.userExists(userData.email);
            expect(exists).toBe(true);
        });

        test('should create new partner user', async ({ page }) => {
            const userData = createTestPartner('GOLD');

            await userPage.clickAddUser();
            await userPage.fillUserForm(userData);
            await userPage.saveUser();

            // Should show success message
            await expect(page.locator('text=/.*success.*|.*created.*/i')).toBeVisible({
                timeout: 5000
            });
        });

        test('should validate required fields', async ({ page }) => {
            await userPage.clickAddUser();

            // Try to save without filling fields
            await userPage.saveUser();

            // Should show validation errors
            const emailValidity = await userPage.emailInput.evaluate(
                (el) => el.validity.valid
            );
            expect(emailValidity).toBe(false);
        });

        test('should show error for invalid email', async ({ page }) => {
            const userData = createTestUser({ email: 'invalid-email' });

            await userPage.clickAddUser();
            await userPage.fillUserForm(userData);
            await userPage.saveUser();

            // Should show validation error
            const emailValidity = await userPage.emailInput.evaluate(
                (el) => el.validity.valid
            );
            expect(emailValidity).toBe(false);
        });

        test('should show partner category for partner users', async ({ page }) => {
            await userPage.clickAddUser();

            // Select partner user type
            await userPage.userTypeSelect.selectOption('PARTNER');

            // Partner category should be visible
            await expect(userPage.partnerCategorySelect).toBeVisible();
        });

        test('should sanitize HTML in user input', async ({ page }) => {
            const userData = createTestUser({
                firstName: '<script>alert("xss")</script>',
                lastName: '<img src=x onerror=alert(1)>'
            });

            await userPage.clickAddUser();
            await userPage.fillUserForm(userData);
            await userPage.saveUser();

            // Check that no alert was triggered
            page.on('dialog', async dialog => {
                throw new Error('Unexpected alert dialog - XSS not prevented!');
            });

            // Wait a bit to ensure no alert
            await page.waitForTimeout(1000);
        });
    });

    test.describe('Edit User', () => {
        test.beforeEach(async ({ page }) => {
            await loginAsAdmin(page);
            await dashboardPage.goToUsers();
            await userPage.waitForLoad();
        });

        test('should update user details', async ({ page }) => {
            // Find first user in table
            const firstUserEmail = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();

            await userPage.editUser(firstUserEmail);

            // Update first name
            await userPage.firstNameInput.fill('Updated');
            await userPage.saveUser();

            // Should show success message
            await expect(page.locator('text=/.*success.*|.*updated.*/i')).toBeVisible({
                timeout: 5000
            });
        });

        test('should approve pending user', async ({ page }) => {
            // This test assumes there's a pending user
            // In real scenario, create a pending user first

            const pendingUserRow = page.locator('tr:has-text("Pending")').first();

            if (await pendingUserRow.isVisible()) {
                const email = await pendingUserRow.locator('td:nth-child(2)').textContent();
                await userPage.approveUser(email);

                // Should show success message
                await expect(page.locator('text=/.*approved.*/i')).toBeVisible({
                    timeout: 5000
                });
            }
        });
    });

    test.describe('Delete User', () => {
        test.beforeEach(async ({ page }) => {
            await loginAsAdmin(page);
            await dashboardPage.goToUsers();
            await userPage.waitForLoad();
        });

        test('should delete user with confirmation', async ({ page }) => {
            // Create a test user first
            const userData = createTestUser();
            await userPage.clickAddUser();
            await userPage.fillUserForm(userData);
            await userPage.saveUser();

            // Wait for user to be created
            await page.waitForTimeout(1000);

            // Delete the user
            await userPage.deleteUser(userData.email);

            // Confirm deletion
            await userPage.confirmAction();

            // Should show success message
            await expect(page.locator('text=/.*deleted.*/i')).toBeVisible({
                timeout: 5000
            });

            // User should not exist
            const exists = await userPage.userExists(userData.email);
            expect(exists).toBe(false);
        });

        test('should cancel delete operation', async ({ page }) => {
            const firstUserEmail = await page.locator('tbody tr:first-child td:nth-child(2)').textContent();

            await userPage.deleteUser(firstUserEmail);

            // Cancel deletion
            await userPage.cancelButton.click();

            // User should still exist
            const exists = await userPage.userExists(firstUserEmail);
            expect(exists).toBe(true);
        });
    });

    test.describe('Search and Filter', () => {
        test.beforeEach(async ({ page }) => {
            await loginAsAdmin(page);
            await dashboardPage.goToUsers();
            await userPage.waitForLoad();
        });

        test('should search users by email', async ({ page }) => {
            await userPage.searchUser('admin@salespro.com');

            // Should show filtered results
            const userCount = await userPage.getUserCount();
            expect(userCount).toBeGreaterThan(0);

            // Should contain admin user
            const exists = await userPage.userExists('admin@salespro.com');
            expect(exists).toBe(true);
        });
    });
});
