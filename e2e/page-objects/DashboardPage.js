/**
 * Dashboard Page Object Model
 * Encapsulates locators and actions for the dashboard page
 */

export class DashboardPage {
    constructor(page) {
        this.page = page;

        // Locators based on actual App.tsx and Dashboard.tsx
        this.dashboard = page.locator('div.space-y-8.animate-fadeIn');
        this.welcomeHeading = page.locator('h2.text-3xl:has-text("Welcome back")');
        // Top-right controls (from App.tsx line 223-245)
        // Note: Logout button has dynamic text: "Logout (FirstName)"
        // Using simpler selector without parent div for better reliability
        this.logoutButton = page.locator('button:has-text("Logout (")');
        this.apiKeyButton = page.locator('button:has-text("API Key")');

        // Sidebar navigation (from Sidebar.tsx via App.tsx)
        // Note: Sidebar uses Pillar enum, but we can target by text
        this.dashboardTab = page.locator('text=Dashboard').first();
        this.usersTab = page.locator('text=Users').first();
        this.organizationTab = page.locator('text=Organization').first();
        this.productsTab = page.locator('text=Products').first();
        this.aiChatTab = page.locator('text=AI Assistant').first();
        this.salesAssetsTab = page.locator('text=Sales Assets').first();
        this.adminTab = page.locator('text=Admin Panel').first();
    }

    /**
     * Wait for dashboard to load
     */
    async waitForLoad() {
        await this.welcomeHeading.waitFor({ state: 'visible', timeout: 10000 });
    }

    /**
     * Navigate to Users tab
     */
    async goToUsers() {
        await this.usersTab.click();
        await this.page.waitForTimeout(500); // Wait for navigation
    }

    /**
     * Navigate to Organization tab
     */
    async goToOrganization() {
        await this.organizationTab.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Navigate to Products tab
     */
    async goToProducts() {
        await this.productsTab.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Navigate to AI Chat tab
     */
    async goToAIChat() {
        await this.aiChatTab.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Navigate to Sales Assets tab
     */
    async goToSalesAssets() {
        await this.salesAssetsTab.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Navigate to Admin Panel tab
     */
    async goToAdminPanel() {
        await this.adminTab.click();
        await this.page.waitForTimeout(500);
    }

    /**
     * Logout the current user
     */
    async logout() {
        // Wait for dashboard to be fully loaded (no modals blocking)
        await this.welcomeHeading.waitFor({ state: 'visible', timeout: 10000 });

        // Force click to bypass visibility check
        // The API key modal (z-index 100) covers the logout button (z-index 50)
        // even after being dismissed, causing Playwright to think button is hidden
        await this.logoutButton.click({ force: true });
    }

    /**
     * Check if specific tab is visible
     */
    async isTabVisible(tabName) {
        const tabLocator = this.page.locator(`text=${tabName}`).first();
        return await tabLocator.isVisible();
    }

    /**
     * Get welcome message text
     */
    async getWelcomeMessage() {
        return await this.welcomeHeading.textContent();
    }

    /**
     * Check if on dashboard
     */
    async isOnDashboard() {
        return await this.dashboard.isVisible();
    }
}
