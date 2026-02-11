/**
 * User Management Page Object
 * Encapsulates interactions with the user management page
 */

export class UserManagementPage {
    /**
     * @param {import('@playwright/test').Page} page
     */
    constructor(page) {
        this.page = page;

        // Locators
        this.userTable = page.locator('[data-testid="user-table"]');
        this.addUserButton = page.locator('[data-testid="add-user-button"]');
        this.searchInput = page.locator('input[placeholder*="Search"]');
        this.filterSelect = page.locator('select[name="filter"]');

        // User form locators
        this.emailInput = page.locator('input[name="email"]');
        this.passwordInput = page.locator('input[name="password"]');
        this.firstNameInput = page.locator('input[name="firstName"]');
        this.lastNameInput = page.locator('input[name="lastName"]');
        this.userTypeSelect = page.locator('select[name="userType"]');
        this.partnerCategorySelect = page.locator('select[name="partnerCategory"]');
        this.saveButton = page.locator('button:has-text("Save")');
        this.cancelButton = page.locator('button:has-text("Cancel")');

        // Action buttons
        this.editButtons = page.locator('[data-testid="edit-user-button"]');
        this.deleteButtons = page.locator('[data-testid="delete-user-button"]');
        this.approveButtons = page.locator('[data-testid="approve-user-button"]');

        // Dialogs
        this.confirmDialog = page.locator('[role="dialog"]');
        this.confirmButton = page.locator('button:has-text("Confirm")');
    }

    /**
     * Wait for page to load
     */
    async waitForLoad() {
        await this.userTable.waitFor({ state: 'visible', timeout: 10000 });
    }

    /**
     * Click add user button
     */
    async clickAddUser() {
        await this.addUserButton.click();
    }

    /**
     * Fill user form
     * @param {Object} userData
     */
    async fillUserForm(userData) {
        await this.emailInput.fill(userData.email);
        if (userData.password) {
            await this.passwordInput.fill(userData.password);
        }
        await this.firstNameInput.fill(userData.firstName);
        await this.lastNameInput.fill(userData.lastName);
        await this.userTypeSelect.selectOption(userData.userType);

        if (userData.userType === 'PARTNER' && userData.partnerCategory) {
            await this.partnerCategorySelect.selectOption(userData.partnerCategory);
        }
    }

    /**
     * Save user form
     */
    async saveUser() {
        await this.saveButton.click();
    }

    /**
     * Cancel user form
     */
    async cancelUser() {
        await this.cancelButton.click();
    }

    /**
     * Search for user
     * @param {string} query
     */
    async searchUser(query) {
        await this.searchInput.fill(query);
    }

    /**
     * Get user row by email
     * @param {string} email
     * @returns {import('@playwright/test').Locator}
     */
    getUserRow(email) {
        return this.page.locator(`tr:has-text("${email}")`);
    }

    /**
     * Edit user by email
     * @param {string} email
     */
    async editUser(email) {
        const row = this.getUserRow(email);
        await row.locator('[data-testid="edit-user-button"]').click();
    }

    /**
     * Delete user by email
     * @param {string} email
     */
    async deleteUser(email) {
        const row = this.getUserRow(email);
        await row.locator('[data-testid="delete-user-button"]').click();
    }

    /**
     * Approve user by email
     * @param {string} email
     */
    async approveUser(email) {
        const row = this.getUserRow(email);
        await row.locator('[data-testid="approve-user-button"]').click();
    }

    /**
     * Confirm dialog action
     */
    async confirmAction() {
        await this.confirmButton.click();
    }

    /**
     * Get user count
     * @returns {Promise<number>}
     */
    async getUserCount() {
        const rows = await this.userTable.locator('tbody tr').count();
        return rows;
    }

    /**
     * Check if user exists
     * @param {string} email
     * @returns {Promise<boolean>}
     */
    async userExists(email) {
        const row = this.getUserRow(email);
        return await row.isVisible();
    }
}
