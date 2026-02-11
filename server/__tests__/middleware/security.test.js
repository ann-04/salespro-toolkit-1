/**
 * Unit Tests for Security Middleware
 * Tests JWT authentication, permission enforcement, and token creation
 */

const jwt = require('jsonwebtoken');
const {
    authenticateToken,
    requirePermission,
    createToken,
    verifyToken
} = require('../../middleware/security.cjs');

// Mock environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_ALGORITHM = 'HS256';
process.env.JWT_EXPIRATION = '15m';


describe('[Test] Security Middleware', () => {
    describe('createToken', () => {
        test('should create valid JWT token', () => {
            const userId = 1;
            const permissions = ['USERS_VIEW', 'PRODUCTS_VIEW'];

            const token = createToken({ userId, permissions });

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');

            // Verify token structure
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            expect(decoded.userId).toBe(userId);
            expect(decoded.permissions).toEqual(permissions);
        });

        test('should set correct expiration time', () => {
            const token = createToken({ userId: 1, permissions: [] });
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const now = Math.floor(Date.now() / 1000);
            const expectedExp = now + (15 * 60); // 15 minutes

            expect(decoded.exp).toBeGreaterThan(now);
            expect(decoded.exp).toBeLessThanOrEqual(expectedExp + 5); // Allow 5 sec tolerance
        });

        test('should include required claims', () => {
            const token = createToken({ userId: 1, permissions: ['TEST_PERMISSION'] });
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            expect(decoded).toHaveProperty('userId');
            expect(decoded).toHaveProperty('permissions');
            expect(decoded).toHaveProperty('iat'); // Issued at
            expect(decoded).toHaveProperty('exp'); // Expiration
            expect(decoded).toHaveProperty('iss'); // Issuer
            expect(decoded).toHaveProperty('aud'); // Audience
        });
    });

    describe('verifyToken', () => {
        test('should verify valid token', () => {
            const token = createToken({ userId: 1, permissions: ['TEST'] });
            const decoded = verifyToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.userId).toBe(1);
        });

        test('should reject expired token', () => {
            // Create token that expires immediately
            const expiredToken = jwt.sign(
                { userId: 1, permissions: [] },
                process.env.JWT_SECRET,
                { expiresIn: '-1h', algorithm: 'HS256' }
            );

            expect(() => verifyToken(expiredToken)).toThrow();
        });

        test('should reject token with invalid signature', () => {
            const token = createToken({ userId: 1, permissions: [] });
            const tamperedToken = token.slice(0, -5) + 'XXXXX';

            expect(() => verifyToken(tamperedToken)).toThrow();
        });

        test('should reject malformed token', () => {
            expect(() => verifyToken('not.a.token')).toThrow();
            expect(() => verifyToken('invalid')).toThrow();
        });
    });


    describe('authenticateToken middleware', () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                headers: {},
                user: null
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        test('should accept valid token in Authorization header', () => {
            const token = createToken({ userId: 1, permissions: ['TEST'] });
            req.headers.authorization = `Bearer ${token}`;

            authenticateToken(req, res, next);

            expect(req.user).toBeDefined();
            expect(req.user.userId).toBe(1);
            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should reject missing Authorization header', () => {
            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.json).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject invalid token format', () => {
            req.headers.authorization = 'InvalidFormat';

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        test('should reject expired token', () => {
            const expiredToken = jwt.sign(
                { userId: 1, permissions: [] },
                process.env.JWT_SECRET,
                { expiresIn: '-1h', algorithm: 'HS256' }
            );
            req.headers.authorization = `Bearer ${expiredToken}`;

            authenticateToken(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });
    });


    describe('requirePermission middleware', () => {
        let req, res, next;

        beforeEach(() => {
            req = {
                user: {
                    userId: 1,
                    permissions: ['USERS_VIEW', 'PRODUCTS_VIEW']
                }
            };
            res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            next = jest.fn();
        });

        test('should allow user with required permission', () => {
            const middleware = requirePermission('USERS_VIEW');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.status).not.toHaveBeenCalled();
        });

        test('should deny user without required permission', () => {
            const middleware = requirePermission('USERS_MANAGE');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });

        test('should deny unauthenticated user', () => {
            req.user = null;
            const middleware = requirePermission('USERS_VIEW');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(401);
            expect(next).not.toHaveBeenCalled();
        });

        test('should handle multiple permissions', () => {
            req.user.permissions = ['USERS_VIEW', 'USERS_MANAGE', 'PRODUCTS_VIEW'];
            const middleware = requirePermission('USERS_MANAGE');
            middleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        test('should be case-sensitive', () => {
            const middleware = requirePermission('users_view');
            middleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });
});
