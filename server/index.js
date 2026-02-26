import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { connectToDatabase, sql } from './db-postgres-compat.js';
import { logAudit } from './audit.js';
import { generateContent } from './services/geminiService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import {
    ensureStorageDirectory,
    getFileType,
    generateStoredFileName,
    getStoragePath,
    extractPdfText,
    extractExcelMetadata,
    getFileSize,
    copyFileToStorage,
    deleteFileFromStorage,
    isValidFileType,
    getAllFilesFromFolder
} from './fileService.js';
import salesAssetsRoutes from './salesAssetsRoutes.js';
import {
    authenticateToken,
    createToken,
    securityHeaders,
    errorHandler,
    requirePermission,
    requireRole,
    rateLimiter,
    hppMiddleware,
    authRateLimiter
} from './middleware/security.js';
import {
    isValidEmail,
    isValidPassword,
    isValidLength,
    isValidUserType,
    isValidPartnerCategory,
    isValidId,
    sanitizeString,
    getPasswordStrengthMessage
} from './utils/validation.js';

// Helper: validate integer (positive integer string or number)
function isValidInteger(val) {
    const n = Number(val);
    return Number.isInteger(n) && n > 0;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
// In production (Render), env vars are set directly, no .env file needed
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.resolve(__dirname, '../.env.local');
    const result = dotenv.config({ path: envPath });

    console.log('--- DEBUG ENV ---');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Env Path:', envPath);
    if (result.error) {
        console.error('Dotenv Error:', result.error);
    } else {
        console.log('Dotenv Parsed:', Object.keys(result.parsed || {}));
    }

    const dbUrl = process.env.DATABASE_URL || '';
    // Mask password in logs
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':***@');
    console.log('DATABASE_URL (Masked):', maskedUrl);
    console.log('-----------------');
}

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration - restrict to allowed origins
// MUST be first so OPTIONS preflight requests are handled before any other middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

// --- Core Security Middleware ---
// Helmet configured for API server use:
// - contentSecurityPolicy: false — CSP is for HTML pages, not JSON APIs
// - crossOriginResourcePolicy: false — API is intentionally consumed cross-origin by the frontend
const helmetMiddleware = helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false,
});

// 1. Helmet sets comprehensive secure HTTP headers (configured for API use)
app.use(helmetMiddleware);

// 2. HTTP Parameter Pollution prevention
app.use(hppMiddleware);

// 3. Global rate limiter: 100 req per 15 min per IP
app.use(rateLimiter);

app.use(express.json({ limit: '10kb' })); // Limit request body size to prevent payload attacks
app.use(securityHeaders);

// Sales Assets Routes
app.use('/api/assets', salesAssetsRoutes);

// --- MIDDLEWARE ---
// authenticateToken is now imported from security middleware

// --- Mock Email Service (development only) ---
const sendCredentialsEmail = async (email, password) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`
    =================================================
    📧 MOCK EMAIL SENT TO: ${email}
    -------------------------------------------------
    Subject: Your SalesPro Account Credentials

    Hello,

    Your access request has been approved.

    Login URL: http://localhost:5173/login
    Email: ${email}
    Temporary Password: ${password}

    For security reasons, you will be required to change your password
    immediately after logging in.

    Regards,
    SalesPro Admin Team
    =================================================
    `);
    }
    // TODO: In production, use a real email service (e.g. SendGrid, SES):
    // await emailService.sendCredentials(email, password);
};

const sendRequestReceivedEmail = async (email) => {
    if (process.env.NODE_ENV !== 'production') {
        console.log(`
    =================================================
    📧 MOCK EMAIL SENT TO: ${email}
    -------------------------------------------------
    Subject: Registration Received

    Hello,

    We have received your request. An admin will review it shortly.
    =================================================
    `);
    }
    // TODO: In production, use a real email service.
};

// Root route to check if server is running
app.get('/', (req, res) => {
    res.send('SalesPro API Server is running. Access endpoints at /api/products');
});

// --- AUTH ROUTES ---

// 1. REGISTER (No password required, Status=PENDING)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, roleId, buId, userType } = req.body;

        // Input validation
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!isValidLength(name, 2, 100)) {
            return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
        }

        const sanitizedName = sanitizeString(name);
        const sanitizedUserType = userType?.toUpperCase() || 'INTERNAL';

        if (!isValidUserType(sanitizedUserType)) {
            return res.status(400).json({ error: 'Invalid user type. Must be INTERNAL or PARTNER' });
        }

        const pool = await connectToDatabase();

        // Check if email exists
        const check = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        if (check.recordset.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        await pool.request()
            .input('Name', sql.NVarChar, sanitizedName)
            .input('Email', sql.NVarChar, email)
            .input('RoleId', sql.Int, roleId || null)
            .input('BusinessUnitId', sql.Int, buId || null)
            .input('UserType', sql.NVarChar, sanitizedUserType)
            .query(`
                INSERT INTO Users (Name, Email, PasswordHash, Status, UserType, RoleId, BusinessUnitId)
                VALUES (@Name, @Email, NULL, 'PENDING', @UserType, @RoleId, @BusinessUnitId)
            `);

        await sendRequestReceivedEmail(email);
        await logAudit(pool, null, 'REGISTER', 'User', email, { name: sanitizedName, email, roleId, buId, userType: sanitizedUserType });
        res.status(201).json({ message: 'Registration successful. Waiting for Admin approval.' });

    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// 2. ADMIN APPROVE (Generates password, Emails user)
app.post('/api/admin/users/:id/approve', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID parameter
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const pool = await connectToDatabase();

        // Generate Random Password
        const tempPassword = crypto.randomBytes(4).toString('hex'); // e.g. 'a1b2c3d4'
        const hash = await bcrypt.hash(tempPassword, 10);

        // Update User — set MustChangePassword=TRUE so the user is forced to change on first login
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                UPDATE Users 
                SET Status = 'APPROVED', PasswordHash = @Hash, "MustChangePassword" = TRUE
                WHERE Id = @Id
            `);

        // Fetch User Email to send credentials
        const userRes = await pool.request().input('Id', sql.Int, id).query('SELECT Email FROM Users WHERE Id = @Id');
        if (userRes.recordset.length > 0) {
            await sendCredentialsEmail(userRes.recordset[0].Email, tempPassword);
        }

        await logAudit(pool, req.user?.id, 'APPROVE', 'User', id, { approvedBy: req.user?.email });

        res.json({
            message: 'User approved and credentials sent.',
            tempPassword: tempPassword
        });

    } catch (err) {
        console.error('Approve Error:', err);
        res.status(500).json({ error: 'Failed to approve user' });
    }
});

// 3. ADMIN UPDATE USER (Role, BU, PartnerCategory, UserType)
app.put('/api/admin/users/:id', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId, buId, partnerCategory, userType } = req.body;

        // Validate ID parameter
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Validate inputs if provided
        if (roleId !== undefined && roleId !== null && !isValidInteger(roleId)) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }

        if (buId !== undefined && buId !== null && !isValidInteger(buId)) {
            return res.status(400).json({ error: 'Invalid business unit ID' });
        }

        if (userType !== undefined && !isValidUserType(userType)) {
            return res.status(400).json({ error: 'Invalid user type. Must be INTERNAL or PARTNER' });
        }

        if (partnerCategory !== undefined && partnerCategory !== null && !isValidPartnerCategory(partnerCategory)) {
            return res.status(400).json({ error: 'Invalid partner category' });
        }

        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('RoleId', sql.Int, roleId || null)
            .input('BusinessUnitId', sql.Int, buId || null)
            .input('PartnerCategory', sql.NVarChar, partnerCategory || null)
            .input('UserType', sql.NVarChar, userType || 'INTERNAL')
            .query(`
                UPDATE Users 
                SET RoleId = @RoleId, BusinessUnitId = @BusinessUnitId, PartnerCategory = @PartnerCategory, UserType = @UserType
                WHERE Id = @Id
            `);

        await logAudit(pool, req.user?.id, 'UPDATE_USER', 'User', id, req.body);
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        console.error('Update User Error:', err);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// GET ALL USERS (For Admin Dashboard)
app.get('/api/admin/users', authenticateToken, requirePermission('USERS_VIEW'), async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT u.Id, u.Name, u.Email, u.Status, u.RoleId, u.BusinessUnitId, u.CreatedAt, u.UserType, u.PartnerCategory,
            r.Name as RoleName, b.Name as BuName
            FROM Users u
            LEFT JOIN Roles r ON u.RoleId = r.Id
            LEFT JOIN BusinessUnits b ON u.BusinessUnitId = b.Id
            ORDER BY u.CreatedAt DESC
            `);

        // Map to cleaner objects
        const users = result.recordset.map(u => ({
            id: u.Id,
            name: u.Name,
            email: u.Email,
            status: u.Status,
            roleId: u.RoleId,
            roleName: u.RoleName,
            buId: u.BusinessUnitId,
            buName: u.BuName,
            userType: u.UserType,
            partnerCategory: u.PartnerCategory,
            createdAt: u.CreatedAt
        }));

        res.json(users);
    } catch (err) {
        console.error('Get Users Error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// --- AUTH ROUTES ---

// 1. LOGIN (Updated for Permissions)
// authRateLimiter: strict 10 attempts per IP per 15 minutes to prevent brute-force
app.post('/api/auth/login', authRateLimiter, async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await connectToDatabase();

        // Join with Roles and BUs to get names
        // Added UserType and PartnerCategory
        const result = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query(`
                SELECT 
                    u.Id, u.Name, u.Email, u.PasswordHash, u.Status, 
                    u.UserType, u.PartnerCategory, u.MustChangePassword,
                    u.RoleId, u.BusinessUnitId, u.CreatedAt, u.LastLogin,
                    r.Name as RoleName, 
                    b.Name as BuName
                FROM Users u
                LEFT JOIN Roles r ON u.RoleId = r.Id
                LEFT JOIN BusinessUnits b ON u.BusinessUnitId = b.Id
                WHERE u.Email = @Email
            `);

        const user = result.recordset[0];

        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        if (user.Status === 'DISABLED') return res.status(403).json({ error: 'Account is disabled' });
        if (!user.PasswordHash) return res.status(403).json({ error: 'Account has no password set' });

        const match = await bcrypt.compare(password, user.PasswordHash);
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        await pool.request().input('Id', sql.Int, user.Id).query('UPDATE Users SET LastLogin = GETDATE() WHERE Id = @Id');
        await logAudit(pool, user.Id, 'LOGIN', 'User', user.Id, { role: user.RoleName });

        const mustChangePassword = user.MustChangePassword === true || user.MustChangePassword === 't' || user.MustChangePassword === 1;

        // FETCH PERMISSIONS
        const permResult = await pool.request()
            .input('RoleId', sql.Int, user.RoleId)
            .query(`
                SELECT p.Module, p.Action 
                FROM RolePermissions rp
                JOIN Permissions p ON rp.PermissionId = p.Id
                WHERE rp.RoleId = @RoleId
            `);

        const permissions = permResult.recordset.map(row => `${row.Module.toUpperCase()}_${row.Action}`);

        // Generate Token with secure configuration
        const token = createToken({
            id: user.Id,
            email: user.Email,
            role: user.RoleName,
            buId: user.BusinessUnitId,
            userType: user.UserType || 'INTERNAL',
            partnerCategory: user.PartnerCategory,
            permissions: permissions,
            mustChangePassword: mustChangePassword
        });

        res.json({
            token,
            user: {
                id: user.Id,
                name: user.Name,
                email: user.Email,
                mustChangePassword: mustChangePassword,
                role: user.RoleName,
                bu: user.BuName,
                userType: user.UserType || 'INTERNAL',
                partnerCategory: user.PartnerCategory,
                permissions: permissions
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({
            error: 'Login failed',
            detail: err.message,
            hint: err.hint,
            code: err.code
        });
    }
});

// 2. ADMIN CREATE USER (New Flow)
app.post('/api/users', authenticateToken, requirePermission('USERS_CREATE'), async (req, res) => {
    try {
        const { name, email, roleId, buId, userType, partnerCategory } = req.body;

        // Input validation
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        if (!isValidLength(name, 2, 100)) {
            return res.status(400).json({ error: 'Name must be between 2 and 100 characters' });
        }

        if (roleId && !isValidInteger(roleId)) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }

        if (buId && !isValidInteger(buId)) {
            return res.status(400).json({ error: 'Invalid business unit ID' });
        }

        const sanitizedName = sanitizeString(name);
        const sanitizedUserType = userType?.toUpperCase() || 'INTERNAL';

        if (!isValidUserType(sanitizedUserType)) {
            return res.status(400).json({ error: 'Invalid user type. Must be INTERNAL or PARTNER' });
        }

        if (partnerCategory && !isValidPartnerCategory(partnerCategory)) {
            return res.status(400).json({ error: 'Invalid partner category. Must be Bronze, Silver, or Gold' });
        }

        const pool = await connectToDatabase();

        const check = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @Email');
        if (check.recordset.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const tempPassword = crypto.randomBytes(4).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);

        await pool.request()
            .input('Name', sql.NVarChar, sanitizedName)
            .input('Email', sql.NVarChar, email)
            .input('Hash', sql.NVarChar, hash)
            .input('RoleId', sql.Int, roleId || null)
            .input('BuId', sql.Int, buId || null)
            .input('UserType', sql.NVarChar, sanitizedUserType)
            .input('PartnerCategory', sql.NVarChar, partnerCategory || null)
            .query(`
                INSERT INTO Users (Name, Email, PasswordHash, Status, RoleId, BusinessUnitId, UserType, PartnerCategory, "MustChangePassword")
                VALUES (@Name, @Email, @Hash, 'APPROVED', @RoleId, @BuId, @UserType, @PartnerCategory, TRUE)
            `);

        await sendCredentialsEmail(email, tempPassword);
        await logAudit(pool, req.user?.id, 'CREATE_USER', 'User', email, { name: sanitizedName, email, roleId, buId, userType: sanitizedUserType, partnerCategory });
        res.json({ message: 'User created successfully. Credentials sent.', tempPassword });
    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// 4. CHANGE PASSWORD
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, newPassword } = req.body;

        // Validate password strength
        if (!isValidPassword(newPassword)) {
            const message = getPasswordStrengthMessage(newPassword);
            return res.status(400).json({ error: message });
        }

        const pool = await connectToDatabase();

        const hash = await bcrypt.hash(newPassword, 10);

        await pool.request()
            .input('Id', sql.Int, userId)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                UPDATE Users 
                SET PasswordHash = @Hash, "MustChangePassword" = FALSE
                WHERE Id = @Id
            `);

        res.json({ message: 'Password changed successfully.' });

    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: 'Password change failed' });
    }
});

// GET Business Units
app.get('/api/admin/business-units', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM BusinessUnits');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch business units' });
    }
});

// CREATE Business Unit
app.post('/api/admin/business-units', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { name } = req.body;

        // Validate name
        if (!isValidLength(name, 2, 100)) {
            return res.status(400).json({ error: 'Business unit name must be between 2 and 100 characters' });
        }

        const sanitizedName = sanitizeString(name);
        const pool = await connectToDatabase();

        await pool.request()
            .input('Name', sql.NVarChar, sanitizedName)
            .query('INSERT INTO BusinessUnits (Name) VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_BU', 'BusinessUnit', sanitizedName, null);
        res.json({ message: 'Business Unit added.' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create business unit' });
    }
});
// CREATE BU (legacy route - delegates to main route logic)
app.post('/api/admin/bus', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.trim().length < 2) {
            return res.status(400).json({ error: 'Business unit name must be at least 2 characters' });
        }
        const sanitizedName = sanitizeString(name);
        const pool = await connectToDatabase();
        const result = await pool.request()
            .input('Name', sql.NVarChar, sanitizedName)
            .query('INSERT INTO BusinessUnits (Name) VALUES (@Name) RETURNING Id, Name');
        await logAudit(pool, req.user?.id, 'CREATE_BU', 'BusinessUnit', result.recordset[0]?.Id, { name: sanitizedName });
        res.json(result.recordset[0] || { message: 'Business Unit added.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDIT BU
app.put('/api/admin/bus/:id', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Validate inputs
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid business unit ID' });
        }

        if (!isValidLength(name, 2, 100)) {
            return res.status(400).json({ error: 'Business unit name must be between 2 and 100 characters' });
        }

        const sanitizedName = sanitizeString(name);
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, sanitizedName)
            .query('UPDATE BusinessUnits SET Name = @Name WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'UPDATE_BU', 'BusinessUnit', id, { name: sanitizedName });
        res.json({ message: 'BU updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update business unit' });
    }
});

// DELETE BU
app.delete('/api/admin/bus/:id', authenticateToken, requirePermission('DEPARTMENTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid business unit ID' });
        }

        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM BusinessUnits WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'DELETE_BU', 'BusinessUnit', id, null);
        res.json({ message: 'BU deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Cannot delete business unit in use or error occurred' });
    }
});

// GET Roles
app.get('/api/admin/roles', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Roles');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch roles' });
    }
});

// CREATE ROLE
app.post('/api/admin/roles', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const { name } = req.body;

        // Validate name
        if (!isValidLength(name, 2, 50)) {
            return res.status(400).json({ error: 'Role name must be between 2 and 50 characters' });
        }

        const sanitizedName = sanitizeString(name);
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('Name', sql.NVarChar, sanitizedName)
            .query('INSERT INTO Roles (Name) OUTPUT INSERTED.Id, INSERTED.Name VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_ROLE', 'Role', result.recordset[0].Id, { name: sanitizedName });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// EDIT ROLE
app.put('/api/admin/roles/:id', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        // Validate inputs
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }

        if (!isValidLength(name, 2, 50)) {
            return res.status(400).json({ error: 'Role name must be between 2 and 50 characters' });
        }

        const sanitizedName = sanitizeString(name);
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, sanitizedName)
            .query('UPDATE Roles SET Name = @Name WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'UPDATE_ROLE', 'Role', id, { name: sanitizedName });
        res.json({ message: 'Role updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// DELETE ROLE
app.delete('/api/admin/roles/:id', authenticateToken, requirePermission('ROLES_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }

        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM Roles WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'DELETE_ROLE', 'Role', id, null);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Cannot delete role in use or error occurred' });
    }
});

// --- PERMISSION ROUTES ---

// GET All Permissions
app.get('/api/admin/permissions', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        // Schema is (Id, Module, Action), simple select.
        const result = await pool.request().query('SELECT Id, Module, Action FROM Permissions ORDER BY Module, Action');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET Permissions for a Role
app.get('/api/admin/roles/:id/permissions', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        const result = await pool.request().input('RoleId', sql.Int, id).query(`
            SELECT PermissionId FROM RolePermissions WHERE RoleId = @RoleId
        `);
        // Return array of IDs
        res.json(result.recordset.map(r => r.PermissionId));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Role Permissions
app.post('/api/admin/roles/:id/permissions', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { permissionIds } = req.body; // Array of IDs
        const pool = await connectToDatabase();

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Delete existing
            await transaction.request().input('RoleId', sql.Int, id).query(`
                DELETE FROM RolePermissions WHERE RoleId = @RoleId
            `);

            // Insert new (if any)
            if (permissionIds && permissionIds.length > 0) {
                // Validate all IDs are positive integers
                const invalidIds = permissionIds.filter(id => !Number.isInteger(Number(id)) || Number(id) <= 0);
                if (invalidIds.length > 0) {
                    await transaction.rollback();
                    return res.status(400).json({ error: 'Invalid permission IDs provided' });
                }

                // Use parameterized queries to prevent SQL injection
                for (const pId of permissionIds) {
                    await transaction.request()
                        .input('RoleId', sql.Int, id)
                        .input('PermissionId', sql.Int, pId)
                        .query(`
                            INSERT INTO RolePermissions (RoleId, PermissionId) 
                            VALUES (@RoleId, @PermissionId)
                        `);
                }
            }

            await transaction.commit();
            await logAudit(pool, req.user?.id, 'UPDATE_PERMISSIONS', 'Role', id, { count: permissionIds?.length });
            res.json({ message: 'Permissions updated' });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        console.error('Update Permissions Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- MIDDLEWARE ---
const authorizeModule = (moduleName, action) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'No token provided' });

            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded; // Attach user to req

            // Admin bypass (optional, but Admin role usually has all permissions anyway via DB)
            if (decoded.role === 'Admin') return next(); // Changed from decoded.roleName to decoded.role based on JWT payload

            const requiredPerm = `${moduleName.toUpperCase()}_${action.toUpperCase()} `;
            if (!decoded.permissions || !decoded.permissions.includes(requiredPerm)) {
                return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
            }
            next();
        } catch (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
    };
};

// NOTE: Duplicate /api/admin/permissions route removed (Modules table does not exist in Supabase schema)

// UPDATE USER ROLE & BU
app.put('/api/admin/users/:id/role-bu', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId, buId } = req.body;

        // Validate inputs
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        if (roleId && !isValidInteger(roleId)) {
            return res.status(400).json({ error: 'Invalid role ID' });
        }

        if (buId && !isValidInteger(buId)) {
            return res.status(400).json({ error: 'Invalid business unit ID' });
        }

        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('RoleId', sql.Int, roleId)
            .input('BuId', sql.Int, buId)
            .query('UPDATE Users SET RoleId = @RoleId, BusinessUnitId = @BuId WHERE Id = @Id');

        await logAudit(pool, req.user?.id, 'UPDATE_USER_ROLE', 'User', id, { roleId, buId });
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user role' });
    }
});

// DELETE USER
app.delete('/api/admin/users/:id', authenticateToken, requirePermission('USERS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;

        // Validate ID
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .query('Delete FROM Users WHERE Id = @Id');

        await logAudit(pool, req.user?.id, 'DELETE_USER', 'User', id, null);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});


// --- SYSTEM SETTINGS ENDPOINTS ---
app.get('/api/admin/system-settings', authenticateToken, requirePermission('SYSTEM_SETTINGS_VIEW'), async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT settingkey, settingvalue FROM appsettings');

        // Convert to key-value object
        const settings = {};
        result.recordset.forEach(row => {
            // Support both PascalCase (from compat layer) and lowercase
            const key = row.Key || row.settingkey;
            const value = row.Value || row.settingvalue;
            if (key) settings[key] = value;
        });

        res.json(settings);
    } catch (err) {
        console.error('Get System Settings Error:', err);
        res.status(500).json({ error: 'Failed to fetch system settings' });
    }
});

app.post('/api/admin/system-settings', authenticateToken, requirePermission('SYSTEM_SETTINGS_MANAGE'), async (req, res) => {
    try {
        const { apiKey, modelName } = req.body;
        const pool = await connectToDatabase();

        // Upsert GEMINI_API_KEY using PostgreSQL ON CONFLICT
        if (apiKey !== undefined) {
            await pool.request()
                .input('key', sql.NVarChar, 'GEMINI_API_KEY')
                .input('value', sql.NVarChar, apiKey)
                .query(`
                    INSERT INTO appsettings (settingkey, settingvalue)
                    VALUES (@key, @value)
                    ON CONFLICT (settingkey) DO UPDATE SET settingvalue = EXCLUDED.settingvalue, updatedat = NOW()
                `);
        }

        // Upsert GEMINI_MODEL
        if (modelName !== undefined) {
            await pool.request()
                .input('key', sql.NVarChar, 'GEMINI_MODEL')
                .input('value', sql.NVarChar, modelName)
                .query(`
                    INSERT INTO appsettings (settingkey, settingvalue)
                    VALUES (@key, @value)
                    ON CONFLICT (settingkey) DO UPDATE SET settingvalue = EXCLUDED.settingvalue, updatedat = NOW()
                `);
        }

        res.json({ message: 'System settings updated successfully' });
    } catch (err) {
        console.error('Update System Settings Error:', err);
        res.status(500).json({ error: 'Failed to update system settings' });
    }
});
// GET all products -- ENHANCED LOGGING

// GET all products -- ENHANCED LOGGING




// GET all products -- ENHANCED LOGGING & PARTNER FILTERING
app.get('/api/products', authenticateToken, async (req, res) => {
    try {
        console.log('Attempting to fetch products for:', req.user.email, 'Type:', req.user.userType);
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Products ORDER BY Name ASC');
        console.log(`Products fetched: ${result.recordset.length} `);

        const products = result.recordset.map(row => {
            const p = {
                id: row.Id,
                name: row.Name,
                category: row.Category,
                description: row.Description,
                problemSolved: row.ProblemSolved,
                licensing: row.Licensing,
                pricingBand: row.PricingBand,
                itLandscape: row.ItLandscape ? JSON.parse(row.ItLandscape) : [],
                deploymentModels: row.DeploymentModels ? JSON.parse(row.DeploymentModels) : [],
                notToSell: row.NotToSell ? JSON.parse(row.NotToSell) : [],
                capabilities: row.Capabilities ? JSON.parse(row.Capabilities) : []
            };

            // PARTNER ACCESS CONTROL
            if (req.user && req.user.userType && req.user.userType.toUpperCase() === 'PARTNER') {
                const cat = (req.user.partnerCategory || '').toLowerCase();

                if (cat === 'bronze') {
                    // Bronze: Overview Only (Hide Commercials & Deep Dive)
                    p.pricingBand = undefined;
                    p.licensing = undefined;
                    p.capabilities = []; // Hide detailed capabilities
                    p.deploymentModels = []; // Hide deployment
                    p.itLandscape = []; // Hide IT landscape
                    p.notToSell = [];
                } else if (cat === 'silver') {
                    // Silver: No Commercials
                    p.pricingBand = undefined;
                    p.licensing = undefined;
                }
            }
            return p;
        });

        res.json(products);
    } catch (err) {
        console.error('❌ Error fetching products:', err);
        res.status(500).json({ error: err.message, detailed: err });
    }
});

// CREATE Product
app.post('/api/products', authenticateToken, requirePermission('PRODUCTS_MANAGE'), async (req, res) => {
    try {
        const { name, category, description, problemSolved, itLandscape, deploymentModels, licensing, pricingBand, notToSell, capabilities } = req.body;

        // Validate inputs
        if (!isValidLength(name, 2, 200)) {
            return res.status(400).json({ error: 'Product name must be between 2 and 200 characters' });
        }

        if (description && !isValidLength(description, 0, 1000)) {
            return res.status(400).json({ error: 'Description must not exceed 1000 characters' });
        }

        if (category && !isValidLength(category, 0, 100)) {
            return res.status(400).json({ error: 'Category must not exceed 100 characters' });
        }

        const sanitizedName = sanitizeString(name);
        const sanitizedDescription = description ? sanitizeString(description) : null;
        const sanitizedCategory = category ? sanitizeString(category) : null;

        const pool = await connectToDatabase();

        await pool.request()
            .input('Name', sql.NVarChar, sanitizedName)
            .input('Category', sql.NVarChar, sanitizedCategory)
            .input('Description', sql.NVarChar, sanitizedDescription)
            .input('ProblemSolved', sql.NVarChar, problemSolved)
            .input('ItLandscape', sql.NVarChar, JSON.stringify(itLandscape))
            .input('DeploymentModels', sql.NVarChar, JSON.stringify(deploymentModels))
            .input('Licensing', sql.NVarChar, licensing)
            .input('PricingBand', sql.NVarChar, pricingBand)
            .input('NotToSell', sql.NVarChar, JSON.stringify(notToSell))
            .input('Capabilities', sql.NVarChar, JSON.stringify(capabilities))
            .query(`
                INSERT INTO Products(Name, Category, Description, ProblemSolved, ItLandscape, DeploymentModels, Licensing, PricingBand, NotToSell, Capabilities)
        VALUES(@Name, @Category, @Description, @ProblemSolved, @ItLandscape, @DeploymentModels, @Licensing, @PricingBand, @NotToSell, @Capabilities)
            `);

        await logAudit(pool, req.user?.id, 'CREATE_PRODUCT', 'Product', sanitizedName, { category: sanitizedCategory });
        res.status(201).json({ message: 'Product created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// UPDATE Product
app.put('/api/products/:id', authenticateToken, requirePermission('PRODUCTS_MANAGE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description, problemSolved, itLandscape, deploymentModels, licensing, pricingBand, notToSell, capabilities } = req.body;

        // Validate inputs
        if (!isValidInteger(id)) {
            return res.status(400).json({ error: 'Invalid product ID' });
        }

        if (name && !isValidLength(name, 2, 200)) {
            return res.status(400).json({ error: 'Product name must be between 2 and 200 characters' });
        }

        if (description && !isValidLength(description, 0, 1000)) {
            return res.status(400).json({ error: 'Description must not exceed 1000 characters' });
        }

        if (category && !isValidLength(category, 0, 100)) {
            return res.status(400).json({ error: 'Category must not exceed 100 characters' });
        }

        const sanitizedName = name ? sanitizeString(name) : name;
        const sanitizedDescription = description ? sanitizeString(description) : description;
        const sanitizedCategory = category ? sanitizeString(category) : category;

        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, sanitizedName)
            .input('Category', sql.NVarChar, sanitizedCategory)
            .input('Description', sql.NVarChar, sanitizedDescription)
            .input('ProblemSolved', sql.NVarChar, problemSolved)
            .input('ItLandscape', sql.NVarChar, JSON.stringify(itLandscape))
            .input('DeploymentModels', sql.NVarChar, JSON.stringify(deploymentModels))
            .input('Licensing', sql.NVarChar, licensing)
            .input('PricingBand', sql.NVarChar, pricingBand)
            .input('NotToSell', sql.NVarChar, JSON.stringify(notToSell))
            .input('Capabilities', sql.NVarChar, JSON.stringify(capabilities))
            .query(`
                UPDATE Products 
                SET Name = @Name, Category = @Category, Description = @Description, ProblemSolved = @ProblemSolved,
            ItLandscape = @ItLandscape, DeploymentModels = @DeploymentModels, Licensing = @Licensing,
            PricingBand = @PricingBand, NotToSell = @NotToSell, Capabilities = @Capabilities
                WHERE Id = @Id
            `);

        await logAudit(pool, req.user?.id, 'UPDATE_PRODUCT', 'Product', id, { name: sanitizedName });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error('Update Product Error:', err);
        res.status(500).json({ error: 'Failed to update product', details: err.message });
    }
});

// DELETE Product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id) // Changed to Int
            .query('DELETE FROM Products WHERE Id = @Id');

        await logAudit(pool, req.user?.id, 'DELETE_PRODUCT', 'Product', id, null);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- CATEGORIES ROUTES ---

// GET Categories
app.get('/api/categories', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Categories ORDER BY Name ASC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE Category
app.post('/api/categories', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .query('INSERT INTO Categories (Name) VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_CATEGORY', 'Category', name, null);
        res.json({ message: 'Category added' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Category
app.put('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .query('UPDATE Categories SET Name = @Name WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'UPDATE_CATEGORY', 'Category', id, { name });
        res.json({ message: 'Category updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE Category
app.delete('/api/categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request()
            .input('Id', sql.Int, id)
            .query('DELETE FROM Categories WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'DELETE_CATEGORY', 'Category', id, null);
        res.json({ message: 'Category deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Cannot delete category in use or error occurred' });
    }
});

// --- PARTNER CATEGORIES ---
app.get('/api/admin/partner-categories', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT Id as id, Name as name FROM PartnerCategories ORDER BY Name');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/admin/partner-categories', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request().input('Name', sql.NVarChar, name).query('INSERT INTO PartnerCategories (Name) VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_PARTNER_CAT', 'PartnerCategory', name, null);
        res.status(201).json({ message: 'Created' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/partner-categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).input('Name', sql.NVarChar, name).query('UPDATE PartnerCategories SET Name = @Name WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'UPDATE_PARTNER_CAT', 'PartnerCategory', id, { name });
        res.json({ message: 'Updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/partner-categories/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM PartnerCategories WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'DELETE_PARTNER_CAT', 'PartnerCategory', id, null);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AUDIT LOGS ENDPOINT ---
app.get('/api/admin/audit-logs', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT a.Id, a.UserId, a.Action, a.Entity, a.EntityId, a.Details, a.Timestamp, u.Name as UserName, u.Email as UserEmail
            FROM AuditLogs a
            LEFT JOIN Users u ON a.UserId = u.Id
            ORDER BY a.Timestamp DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error('Fetch Audit Logs Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// Delete specific audit log
app.delete('/api/admin/audit-logs/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM AuditLogs WHERE Id = @Id');
        // Do not log this audit deletion to avoid recursion or keep it if needed. 
        // For now, let's just delete it silently or log it as a system action? 
        // Let's log it to console serverside at least.
        console.log(`Audit log ${id} deleted by user ${req.user?.id}`);
        res.json({ message: 'Deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Clear all audit logs
app.delete('/api/admin/audit-logs', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        await pool.request().query('DELETE FROM AuditLogs');
        console.log(`All audit logs cleared by user ${req.user?.id}`);
        res.json({ message: 'All logs cleared' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- AI ASSISTANT ROUTES ---
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
    try {
        const { messages, context } = req.body;

        // Validate messages
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Validate each message
        for (const msg of messages) {
            if (!msg.content || !isValidLength(msg.content, 1, 10000)) {
                return res.status(400).json({ error: 'Message content must be between 1 and 10000 characters' });
            }
        }

        // Read API Key from Header (preferred) or Body
        const apiKey = req.headers['x-gemini-api-key'] || req.body.apiKey;

        if (!apiKey) {
            console.error('[AI Chat] Missing API Key');
            return res.status(400).json({ error: 'Gemini API Key is required. Please set it in your application settings.' });
        }

        console.log(`[AI Chat] Received request. Key length: ${apiKey.length}, Key prefix: ${apiKey.substring(0, 4)}...`);

        const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `
            ${context}
            
            Current Conversation:
            ${conversationHistory}
        `;

        console.log('[AI Chat] Sending prompt to Gemini...');
        const response = await generateContent(prompt, apiKey);
        console.log('[AI Chat] Received response from Gemini');

        res.json({ response: response });
    } catch (err) {
        console.error('[AI Chat] Error:', err.message);
        res.status(500).json({ error: 'Failed to process AI chat request' });
    }
});

// --- NEW DATA ENDPOINTS ---
app.get('/api/personas', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Personas');
        const data = result.recordset.map(r => ({
            role: r.Role,
            name: r.Name,
            narrative: r.Narrative,
            kpis: r.KPIs ? JSON.parse(r.KPIs) : [],
            fears: r.Fears ? JSON.parse(r.Fears) : []
        }));
        res.json(data);
    } catch (err) {
        console.error('Personas table not found or error:', err.message);
        res.json([]); // Return empty array if table doesn't exist
    }
});

app.get('/api/objections', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Objections');
        const data = result.recordset.map(r => ({
            query: r.Query,
            reason: r.Reason,
            response: r.Response,
            proof: r.Proof
        }));
        res.json(data);
    } catch (err) {
        console.error('Objections table not found or error:', err.message);
        res.json([]); // Return empty array if table doesn't exist
    }
});

app.get('/api/icp', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM ICPs');
        if (result.recordset.length === 0) return res.json({});
        const r = result.recordset[0];
        const data = {
            companySize: r.CompanySize ? JSON.parse(r.CompanySize) : [],
            revenueRange: r.RevenueRange,
            industries: r.Industries ? JSON.parse(r.Industries) : [],
            geography: r.Geography ? JSON.parse(r.Geography) : [],
            buyingTriggers: r.BuyingTriggers ? JSON.parse(r.BuyingTriggers) : []
        };
        res.json(data);
    } catch (err) {
        console.error('ICPs table not found or error:', err.message);
        res.json({}); // Return empty object if table doesn't exist
    }
});

app.get('/api/competitors', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Competitors');
        const data = result.recordset.map(r => ({
            name: r.Name,
            position: r.Position,
            strengths: r.Strengths ? JSON.parse(r.Strengths) : [],
            weaknesses: r.Weaknesses ? JSON.parse(r.Weaknesses) : [],
            winStrategy: r.WinStrategy
        }));
        res.json(data);
    } catch (err) {
        console.error('Competitors table not found or error:', err.message);
        res.json([]); // Return empty array if table doesn't exist
    }
});

// --- USER PREFERENCES ROUTES ---

// GET User Preferences (stored in appsettings or returned as defaults if table missing)
app.get('/api/user/preferences', authenticateToken, async (req, res) => {
    try {
        // Return default preferences - UserPreferences table may not exist in Supabase
        res.json({ userId: req.user.id, theme: 'light' });
    } catch (err) {
        console.error('Get Preferences Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Theme Preference
app.put('/api/user/preferences/theme', authenticateToken, async (req, res) => {
    try {
        const { theme } = req.body;

        // Validate theme value
        if (!['light', 'dark'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme value. Must be "light" or "dark"' });
        }

        // Theme preference stored client-side (UserPreferences table may not exist)
        res.json({ message: 'Theme updated successfully', theme });
    } catch (err) {
        console.error('Update Theme Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/learning-paths', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM LearningPaths');
        const data = result.recordset.map(r => ({
            title: r.Title,
            duration: r.Duration,
            modules: r.Modules ? JSON.parse(r.Modules) : [],
            outcome: r.Outcome,
            status: r.Status
        }));
        res.json(data);
    } catch (err) {
        console.error('LearningPaths table not found or error:', err.message);
        res.json([]); // Return empty array if table doesn't exist
    }
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        ensureStorageDirectory(); // Ensure storage directory exists on startup
    });
}

// Error handler middleware - must be last
app.use(errorHandler);

// Export app for testing
export default app;

