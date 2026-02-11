/**
 * Login Page Object Model
 * Encapsulates locators and actions for the login page
 */

export class LoginPage {
    constructor(page) {
        this.page = page;

        // Locators based on actual Login.tsx component
        this.emailInput = page.locator('input[type="email"]');
        this.passwordInput = page.locator('input[type="password"]');
        this.loginButton = page.locator('button[type="submit"]');
        this.registerLink = page.locator('button:has-text("Request Access")');
        this.errorMessage = page.locator('div.bg-red-50.text-red-600');
        this.welcomeHeading = page.locator('h2:has-text("Welcome Back")');
    }

    /**
     * Navigate to login page
     */
    async goto() {
        await this.page.goto('/');
        await this.waitForLoad();
    }

    /**
     * Wait for login page to load
     */
    async waitForLoad() {
        await this.welcomeHeading.waitFor({ state: 'visible', timeout: 10000 });
    }

    /**
     * Perform login with email and password
     */
    async login(email, password) {
        await this.emailInput.fill(email);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }

    /**
     * Get error message text
     */
    async getErrorMessage() {
        await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
        return await this.errorMessage.textContent();
    }

    /**
     * Check if error message is displayed
     */
    async hasError() {
        try {
            await this.errorMessage.waitFor({ state: 'visible', timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Navigate to registration page
     */
    async goToRegister() {
        await this.registerLink.click();
        await this.page.waitForSelector('h2:has-text("Request Access")', { timeout: 5000 });
    }

    /**
     * Check if on login page
     */
    async isOnLoginPage() {
        return await this.welcomeHeading.isVisible();
    }

    /**
     * Get login button text
     */
    async getLoginButtonText() {
        return await this.loginButton.textContent();
    }

    /**
     * Check if login button is disabled
     */
    async isLoginButtonDisabled() {
        return await this.loginButton.isDisabled();
    }
}
