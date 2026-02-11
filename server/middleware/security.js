/**
 * Security Middleware
 * Implements JWT security best practices and input validation
 */

import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProd = process.env.NODE_ENV === 'production' || process.resourcesPath;
const envPath = isProd
    ? path.join(process.resourcesPath, '.env.local')
    : path.resolve(__dirname, '../../.env.local');

dotenv.config({ path: envPath });

// JWT Configuration from environment
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-immediately';
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'HS256';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_ISSUER = process.env.JWT_ISSUER || 'salespro-toolkit';
const JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'salespro-api';

// Allowed algorithms (whitelist to prevent algorithm confusion attacks)
const ALLOWED_ALGORITHMS = ['HS256', 'HS384', 'HS512'];

/**
 * Validate JWT secret is strong enough
 */
function validateJwtSecret() {
    if (JWT_SECRET === 'fallback-secret-change-immediately' ||
        JWT_SECRET === 'super-secret-key-change-in-production') {
        console.warn('⚠️  WARNING: Using weak or default JWT secret! Set JWT_SECRET in .env.local');
    }

    if (JWT_SECRET.length < 32) {
        console.warn('⚠️  WARNING: JWT secret is too short! Should be at least 256 bits (32 bytes)');
    }
}

// Validate on module load
validateJwtSecret();

/**
 * Create JWT token with proper claims
 */
export function createToken(payload, options = {}) {
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload = {
        ...payload,
        iss: JWT_ISSUER,
        aud: JWT_AUDIENCE,
        iat: now,
        nbf: now, // Not valid before now
        jti: generateJti(), // Unique token ID for revocation
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
export function verifyToken(token) {
    // First decode without verification to check algorithm
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded) {
        throw new Error('Invalid token format');
    }

    // Prevent 'none' algorithm attack
    if (!decoded.header.alg || decoded.header.alg.toLowerCase() === 'none') {
        throw new Error('Algorithm "none" is not allowed');
    }

    // Validate algorithm against whitelist (prevent algorithm confusion)
    if (!ALLOWED_ALGORITHMS.includes(decoded.header.alg)) {
        throw new Error(`Algorithm ${decoded.header.alg} is not allowed`);
    }

    // Verify signature and claims
    const verified = jwt.verify(token, JWT_SECRET, {
        algorithms: ALLOWED_ALGORITHMS,
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
        clockTolerance: 30, // 30 seconds clock skew tolerance
    });

    return verified;
}

/**
 * Generate unique JWT ID for token revocation
 */
function generateJti() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware: Authenticate JWT token
 */
export const authenticateToken = (req, res, next) => {
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

        // Verify token with security checks
        const decoded = verifyToken(token);

        // Attach user info to request
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
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Admin bypass: Admins have access to everything
        if (req.user.role === 'Admin') {
            return next();
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
export const requireRole = (role) => {
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
export const securityHeaders = (req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    next();
};

/**
 * Middleware: Error handler (production-safe)
 */
export const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Don't expose internal errors in production
    const isDev = process.env.NODE_ENV !== 'production';

    if (isDev) {
        return res.status(500).json({
            error: err.message,
            stack: err.stack
        });
    }

    // Generic error in production
    res.status(500).json({
        error: 'An internal error occurred'
    });
};

// Export configuration for use in other modules
export const jwtConfig = {
    secret: JWT_SECRET,
    algorithm: JWT_ALGORITHM,
    expiresIn: JWT_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
};
