/**
 * CommonJS wrapper for security middleware
 * This allows Jest tests to import the ES6 security module
 */

const jwt = require('jsonwebtoken');

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_ISSUER = process.env.JWT_ISSUER || 'salespro-toolkit';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'salespro-api';

const ALLOWED_ALGORITHMS = ['HS256', 'HS384', 'HS512'];

/**
 * Generate unique JWT ID
 */
function generateJti() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create JWT token with proper claims
 */
function createToken(payload, options = {}) {
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
        ...payload,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        iat: now,
        nbf: now,
        jti: generateJti(),
    };

    const tokenOptions = {
        algorithm: JWT_ALGORITHM,
        expiresIn: options.expiresIn || JWT_EXPIRES_IN,
    };

    return jwt.sign(tokenPayload, JWT_SECRET, tokenOptions);
}

/**
 * Verify JWT token with security best practices
 */
function verifyToken(token) {
    // First decode without verification to check algorithm
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
        throw new Error('Invalid token format');
    }

    // Prevent 'none' algorithm attack
    if (!decoded.header.alg || decoded.header.alg.toLowerCase() === 'none') {
        throw new Error('Algorithm "none" is not allowed');
    }

    // Validate algorithm against whitelist
    if (!ALLOWED_ALGORITHMS.includes(decoded.header.alg)) {
        throw new Error(`Algorithm ${decoded.header.alg} is not allowed`);
    }

    // Verify signature and claims
    const verified = jwt.verify(token, JWT_SECRET, {
        algorithms: ALLOWED_ALGORITHMS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        clockTolerance: 30,
    });

    return verified;
}

/**
 * Middleware: Authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header provided' });
        }

        const parts = authHeader.split(' ');

        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({ error: 'Invalid authorization header format. Use: Bearer <token>' });
        }

        const token = parts[1];
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        return res.status(403).json({ error: err.message });
    }
};

/**
 * Middleware: Require specific permission
 */
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const permissions = req.user.permissions || [];

        if (!permissions.includes(permission)) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: permission
            });
        }

        next();
    };
};

/**
 * Middleware: Require specific role
 */
const requireRole = (role) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== role) {
            return res.status(403).json({
                error: 'Insufficient permissions',
                required: role
            });
        }

        next();
    };
};

/**
 * Middleware: Security headers
 */
const securityHeaders = (req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
};

/**
 * Middleware: Error handler
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
        return res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }

    res.status(500).json({
        error: 'An internal error occurred'
    });
};

module.exports = {
    createToken,
    verifyToken,
    authenticateToken,
    requirePermission,
    requireRole,
    securityHeaders,
    errorHandler,
    jwtConfig: {
        secret: JWT_SECRET,
        algorithm: JWT_ALGORITHM,
        expiresIn: JWT_EXPIRES_IN,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
    }
};
