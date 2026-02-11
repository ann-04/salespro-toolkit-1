// Jest setup file
// This file runs before each test suite

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_ALGORITHM = 'HS256';
process.env.JWT_EXPIRATION = '15m';
process.env.JWT_ISSUER = 'salespro-toolkit-test';
process.env.JWT_AUDIENCE = 'salespro-toolkit-test';

// Mock database connection
jest.mock('./server/db.js', () => ({
    connectToDatabase: jest.fn().mockResolvedValue({
        request: jest.fn().mockReturnThis(),
        input: jest.fn().mockReturnThis(),
        query: jest.fn().mockResolvedValue({ recordset: [] }),
    }),
}));

// Increase timeout for integration tests
jest.setTimeout(10000);

// Global test utilities
global.testUtils = {
    createMockUser: () => ({
        id: 1,
        email: 'test@test.com',
        name: 'Test User',
        roleId: 1,
        buId: 1,
        permissions: ['USERS_VIEW', 'PRODUCTS_VIEW'],
    }),

    createMockToken: (userId = 1, permissions = []) => {
        const jwt = require('jsonwebtoken');
        return jwt.sign(
            { userId, permissions },
            process.env.JWT_SECRET,
            { expiresIn: '15m', algorithm: 'HS256' }
        );
    },
};
