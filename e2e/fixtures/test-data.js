/**
 * Test Data Generators for E2E Tests
 * Provides functions to generate test data
 */

import { randomUUID } from 'crypto';

/**
 * Generate unique email
 * @returns {string}
 */
export function generateEmail() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `test.user.${timestamp}.${random}@example.com`;
}

/**
 * Generate test user data
 * @param {Object} overrides - Override default values
 * @returns {Object}
 */
export function createTestUser(overrides = {}) {
    return {
        email: generateEmail(),
        password: 'Test123!',
        firstName: 'Test',
        lastName: 'User',
        userType: 'INTERNAL',
        ...overrides
    };
}

/**
 * Generate test partner user data
 * @param {string} category - Partner category
 * @returns {Object}
 */
export function createTestPartner(category = 'GOLD') {
    return {
        email: generateEmail(),
        password: 'Partner123!',
        firstName: 'Partner',
        lastName: 'User',
        userType: 'PARTNER',
        partnerCategory: category
    };
}

/**
 * Generate test product data
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTestProduct(overrides = {}) {
    const timestamp = Date.now();
    return {
        name: `Test Product ${timestamp}`,
        description: 'This is a test product for E2E testing',
        category: 'Software',
        price: 99.99,
        ...overrides
    };
}

/**
 * Generate test business unit data
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTestBusinessUnit(overrides = {}) {
    const timestamp = Date.now();
    return {
        name: `Test Business Unit ${timestamp}`,
        description: 'Test business unit for E2E testing',
        ...overrides
    };
}

/**
 * Generate test department data
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTestDepartment(overrides = {}) {
    const timestamp = Date.now();
    return {
        name: `Test Department ${timestamp}`,
        description: 'Test department for E2E testing',
        ...overrides
    };
}

/**
 * Generate test role data
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTestRole(overrides = {}) {
    const timestamp = Date.now();
    return {
        name: `Test Role ${timestamp}`,
        description: 'Test role for E2E testing',
        permissions: ['USERS_VIEW', 'PRODUCTS_VIEW'],
        ...overrides
    };
}

/**
 * Generate test file data
 * @param {Object} overrides
 * @returns {Object}
 */
export function createTestFile(overrides = {}) {
    const timestamp = Date.now();
    return {
        name: `test-file-${timestamp}.pdf`,
        type: 'application/pdf',
        size: 1024 * 100, // 100KB
        ...overrides
    };
}

/**
 * Generate random string
 * @param {number} length
 * @returns {string}
 */
export function randomString(length = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Wait for a specified duration
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate test AI chat message
 * @returns {string}
 */
export function createTestChatMessage() {
    const messages = [
        'What are the features of this product?',
        'Tell me about the pricing',
        'How do I get started?',
        'What support options are available?',
        'Can you help me with integration?'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}
