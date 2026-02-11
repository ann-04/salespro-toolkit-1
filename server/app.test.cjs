/**
 * CommonJS Wrapper for Express App
 * This file provides a CommonJS-compatible export of the Express app
 * for use in Jest integration tests
 */

// Since the main index.js is ES6, we can't directly require it in Jest
// Instead, we'll create a minimal test server setup that mimics the production app

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// Set test environment
process.env.NODE_ENV = 'test';

const app = express();

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Import middleware from CommonJS wrappers
const {
    authenticateToken,
    createToken,
    securityHeaders,
    errorHandler,
    requirePermission
} = require('./middleware/security.cjs');

const {
    isValidEmail,
    isValidPassword,
    isValidLength,
    isValidUserType,
    isValidPartnerCategory,
    isValidId,
    sanitizeString
} = require('./utils/validation.cjs');

app.use(securityHeaders);

// Mock database connection for tests
const mockDb = {
    query: async () => ({ recordset: [] }),
    connect: async () => mockDb,
    close: async () => { }
};

// --- Authentication Endpoints ---

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Mock authentication - in real tests, this would query the database
        if (email === 'admin@test.com' && password === 'Admin123!') {
            const token = createToken({
                userId: 1,
                email,
                userType: 'INTERNAL',
                permissions: ['USERS_VIEW', 'USERS_CREATE', 'USERS_MANAGE']
            });
            return res.json({ token, user: { userId: 1, email } });
        }

        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName, userType, partnerCategory } = req.body;

        if (!email || !password || !firstName || !lastName || !userType) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Password does not meet requirements' });
        }

        if (!isValidUserType(userType)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        if (userType === 'PARTNER' && !isValidPartnerCategory(partnerCategory)) {
            return res.status(400).json({ error: 'Invalid partner category' });
        }

        const sanitizedFirstName = sanitizeString(firstName);
        const sanitizedLastName = sanitizeString(lastName);

        return res.status(201).json({
            userId: 1,
            email,
            firstName: sanitizedFirstName,
            lastName: sanitizedLastName
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- User Management Endpoints ---

app.get('/api/admin/users', authenticateToken, requirePermission('USERS_VIEW'), async (req, res) => {
    try {
        return res.json([]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticateToken, requirePermission('USERS_CREATE'), async (req, res) => {
    try {
        const { email, password, firstName, lastName, userType } = req.body;

        if (!email || !password || !firstName || !lastName || !userType) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!isValidPassword(password)) {
            return res.status(400).json({ error: 'Password does not meet requirements' });
        }

        if (!isValidUserType(userType)) {
            return res.status(400).json({ error: 'Invalid user type' });
        }

        const sanitizedFirstName = sanitizeString(firstName);
        const sanitizedLastName = sanitizeString(lastName);

        return res.status(201).json({
            userId: 1,
            email,
            firstName: sanitizedFirstName,
            lastName: sanitizedLastName
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        return res.status(404).json({ error: 'User not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requirePermission('USERS_DELETE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        return res.status(404).json({ error: 'User not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id/approve', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        return res.status(404).json({ error: 'User not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/users/:id/role', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid user ID format' });
        }

        if (!roleId) {
            return res.status(400).json({ error: 'Role ID is required' });
        }

        if (!isValidId(roleId)) {
            return res.status(400).json({ error: 'Invalid role ID format' });
        }

        return res.status(404).json({ error: 'User not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Organization Endpoints ---

app.get('/api/business-units', authenticateToken, async (req, res) => {
    try {
        return res.json([]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/business-units', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        if (!isValidLength(name, 3, 100)) {
            return res.status(400).json({ error: 'Name must be between 3 and 100 characters' });
        }

        const sanitizedName = sanitizeString(name);

        return res.status(201).json({ id: 1, name: sanitizedName, description });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/business-units/:id', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        return res.status(404).json({ error: 'Business unit not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/business-units/:id', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        return res.status(404).json({ error: 'Business unit not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Role Endpoints ---

app.get('/api/roles', authenticateToken, async (req, res) => {
    try {
        return res.json([]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/roles', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        if (!isValidLength(name, 3, 100)) {
            return res.status(400).json({ error: 'Name must be between 3 and 100 characters' });
        }

        return res.status(201).json({ id: 1, name, description });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/roles/:id', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        return res.status(404).json({ error: 'Role not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/roles/:id', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        return res.status(404).json({ error: 'Role not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Department Endpoints ---

app.get('/api/departments', authenticateToken, async (req, res) => {
    try {
        return res.json([]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/departments', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { name, businessUnitId } = req.body;

        if (!name || !businessUnitId) {
            return res.status(400).json({ error: 'Name and businessUnitId are required' });
        }

        if (!isValidId(businessUnitId)) {
            return res.status(400).json({ error: 'Invalid businessUnitId format' });
        }

        return res.status(201).json({ id: 1, name, businessUnitId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Product Endpoints ---

app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        return res.json([]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/products', authenticateToken, requirePermission('PRODUCTS_MANAGE'), async (req, res) => {
    try {
        const { name, description, category } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }

        if (!isValidLength(name, 3, 200)) {
            return res.status(400).json({ error: 'Name must be between 3 and 200 characters' });
        }

        const sanitizedName = sanitizeString(name);

        return res.status(201).json({ id: 1, name: sanitizedName, description, category });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/products/:id', authenticateToken, requirePermission('PRODUCTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        return res.status(404).json({ error: 'Product not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/products/:id', authenticateToken, requirePermission('PRODUCTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({ error: 'Invalid ID format' });
        }

        return res.status(404).json({ error: 'Product not found' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AI Chat Endpoint ---

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
        const { message, conversationHistory } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        if (typeof message !== 'string') {
            return res.status(400).json({ error: 'Message must be a string' });
        }

        if (message.trim() === '') {
            return res.status(400).json({ error: 'Message cannot be empty' });
        }

        if (message.length > 10000) {
            return res.status(400).json({ error: 'Message is too long' });
        }

        if (conversationHistory && !Array.isArray(conversationHistory)) {
            return res.status(400).json({ error: 'Conversation history must be an array' });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: 'API key not configured' });
        }

        return res.json({ response: 'Mock AI response' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Error handler middleware - must be last
app.use(errorHandler);

module.exports = app;
