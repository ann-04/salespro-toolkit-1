const jwt = require('jsonwebtoken');

/**
 * Test Helper Utilities for API Integration Tests
 * Provides functions to create test users and generate auth tokens
 */

// JWT Configuration (matches production settings)
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_ISSUER = process.env.JWT_ISSUER || 'salespro-toolkit';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'salespro-api';

/**
 * Create a test user object with specified permissions
 * @param {Array<string>} permissions - Array of permission strings
 * @param {Object} overrides - Optional overrides for user properties
 * @returns {Object} Test user object
 */
function createTestUser(permissions = [], overrides = {}) {
    return {
        userId: 1,
        email: 'test@test.com',
        userType: 'INTERNAL',
        firstName: 'Test',
        lastName: 'User',
        permissions,
        ...overrides
    };
}

/**
 * Generate a JWT auth token for testing
 * @param {Object} user - User object to encode in token
 * @param {Object} options - Optional JWT options
 * @returns {string} JWT token
 */
function generateAuthToken(user, options = {}) {
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
        ...user,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        iat: now,
        nbf: now,
        jti: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    return jwt.sign(tokenPayload, JWT_SECRET, {
        algorithm: JWT_ALGORITHM,
        expiresIn: options.expiresIn || '15m',
    });
}

/**
 * Create an admin token with all permissions
 * @returns {string} JWT token for admin user
 */
function createAdminToken() {
    const adminUser = createTestUser([
        'USERS_VIEW',
        'USERS_CREATE',
        'USERS_MANAGE',
        'USERS_DELETE',
        'DEPARTMENTS_MANAGE',
        'ROLES_MANAGE',
        'PRODUCTS_MANAGE',
        'CATEGORIES_MANAGE',
        'SALES_ASSETS_MANAGE'
    ], {
        userId: 1,
        email: 'admin@test.com',
        userType: 'INTERNAL',
        firstName: 'Admin',
        lastName: 'User'
    });

    return generateAuthToken(adminUser);
}

/**
 * Create a limited user token with only view permissions
 * @returns {string} JWT token for limited user
 */
function createLimitedToken() {
    const limitedUser = createTestUser(['USERS_VIEW'], {
        userId: 2,
        email: 'limited@test.com',
        userType: 'INTERNAL',
        firstName: 'Limited',
        lastName: 'User'
    });

    return generateAuthToken(limitedUser);
}

/**
 * Create a token with no permissions
 * @returns {string} JWT token for user with no permissions
 */
function createNoPermToken() {
    const noPermUser = createTestUser([], {
        userId: 3,
        email: 'noperm@test.com',
        userType: 'INTERNAL',
        firstName: 'NoPerm',
        lastName: 'User'
    });

    return generateAuthToken(noPermUser);
}

/**
 * Create a partner user token
 * @param {string} category - Partner category (BRONZE, SILVER, GOLD, PLATINUM)
 * @returns {string} JWT token for partner user
 */
function createPartnerToken(category = 'BRONZE') {
    const partnerUser = createTestUser(['USERS_VIEW'], {
        userId: 4,
        email: 'partner@test.com',
        userType: 'PARTNER',
        partnerCategory: category,
        firstName: 'Partner',
        lastName: 'User'
    });

    return generateAuthToken(partnerUser);
}

/**
 * Create an expired token for testing
 * @returns {string} Expired JWT token
 */
function createExpiredToken() {
    const expiredUser = createTestUser(['USERS_VIEW'], {
        userId: 5,
        email: 'expired@test.com'
    });

    return generateAuthToken(expiredUser, { expiresIn: '-1h' });
}

module.exports = {
    createTestUser,
    generateAuthToken,
    createAdminToken,
    createLimitedToken,
    createNoPermToken,
    createPartnerToken,
    createExpiredToken
};
