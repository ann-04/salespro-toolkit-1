import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { connectToDatabase, sql } from './db.js';
import { logAudit } from './audit.js';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const app = express();
const PORT = 3000;
const JWT_SECRET = 'super-secret-key-change-in-production'; // In real app, use .env

app.use(cors());
app.use(express.json());

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        // Allow admin approve/register to proceed without token if needed, 
        // BUT implemented routes dictate admin action needs auth.
        // For now, standard implementation.
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid token' });
    }
};

// --- Mock Email Service ---
const sendCredentialsEmail = async (email, password) => {
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
    // In real app: await transporter.sendMail(...)
};

const sendRequestReceivedEmail = async (email) => {
    console.log(`
    =================================================
    📧 MOCK EMAIL SENT TO: ${email}
    -------------------------------------------------
    Subject: Registration Received

    Hello,

    We have received your request. An admin will review it shortly.
    =================================================
    `);
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
        const pool = await connectToDatabase();

        // Check if email exists
        const check = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @Email');

        if (check.recordset.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Email', sql.NVarChar, email)
            .input('RoleId', sql.Int, roleId || null)
            .input('BusinessUnitId', sql.Int, buId || null)
            .input('UserType', sql.NVarChar, userType || 'INTERNAL')
            .query(`
                INSERT INTO Users (Name, Email, Status, MustChangePassword, UserType)
                VALUES (@Name, @Email, 'PENDING', 1, @UserType)
            `);

        await sendRequestReceivedEmail(email);
        await logAudit(pool, null, 'REGISTER', 'User', email, { name, email, roleId, buId, userType });
        res.status(201).json({ message: 'Registration successful. Waiting for Admin approval.' });

    } catch (err) {
        console.error('Register Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. ADMIN APPROVE (Generates password, Emails user)
app.post('/api/admin/users/:id/approve', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        // Generate Random Password
        const tempPassword = crypto.randomBytes(4).toString('hex'); // e.g. 'a1b2c3d4'
        const hash = await bcrypt.hash(tempPassword, 10);

        // Update User
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                UPDATE Users 
                SET Status = 'APPROVED', PasswordHash = @Hash, MustChangePassword = 1 
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
        res.status(500).json({ error: err.message });
    }
});

// 3. ADMIN UPDATE USER (Role, BU, PartnerCategory, UserType)
app.put('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId, buId, partnerCategory, userType } = req.body;
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
        res.status(500).json({ error: err.message });
    }
});

// GET ALL USERS (For Admin Dashboard)
app.get('/api/admin/users', async (req, res) => {
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
        console.error('Fetch Users Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- AUTH ROUTES ---

// 1. LOGIN (Updated for Permissions)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const pool = await connectToDatabase();

        // Join with Roles and BUs to get names
        // Added UserType and PartnerCategory
        const result = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query(`
                SELECT u.*, r.Name as RoleName, b.Name as BuName 
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

        // Generate Token
        // Include userType and partnerCategory
        const token = jwt.sign({
            id: user.Id,
            role: user.RoleName,
            buId: user.BusinessUnitId,
            userType: user.UserType || 'INTERNAL',
            partnerCategory: user.PartnerCategory,
            permissions: permissions,
            mustChangePassword: user.MustChangePassword
        }, JWT_SECRET, { expiresIn: '8h' });

        res.json({
            token,
            user: {
                id: user.Id,
                name: user.Name,
                email: user.Email,
                mustChangePassword: user.MustChangePassword,
                role: user.RoleName,
                bu: user.BuName,
                userType: user.UserType || 'INTERNAL',
                partnerCategory: user.PartnerCategory,
                permissions: permissions
            }
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. ADMIN CREATE USER (New Flow)
app.post('/api/users', authenticateToken, async (req, res) => {
    try {
        const { name, email, roleId, buId, userType, partnerCategory } = req.body; // Added partnerCategory
        const pool = await connectToDatabase();

        const check = await pool.request()
            .input('Email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE Email = @Email');
        if (check.recordset.length > 0) return res.status(400).json({ error: 'Email already exists' });

        const tempPassword = crypto.randomBytes(4).toString('hex');
        const hash = await bcrypt.hash(tempPassword, 10);

        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Email', sql.NVarChar, email)
            .input('Hash', sql.NVarChar, hash)
            .input('RoleId', sql.Int, roleId || null)
            .input('BuId', sql.Int, buId || null)
            .input('UserType', sql.NVarChar, userType || 'INTERNAL')
            .input('PartnerCategory', sql.NVarChar, partnerCategory || null)
            .query(`
                INSERT INTO Users(Name, Email, PasswordHash, Status, MustChangePassword, RoleId, BusinessUnitId, UserType, PartnerCategory)
        VALUES(@Name, @Email, @Hash, 'ACTIVE', 1, @RoleId, @BuId, @UserType, @PartnerCategory)
            `);

        await sendCredentialsEmail(email, tempPassword);
        await logAudit(pool, req.user?.id, 'CREATE_USER', 'User', email, { name, roleId, buId });
        res.status(201).json({ message: 'User created successfully', tempPassword });
    } catch (err) {
        console.error('Create User Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. CHANGE PASSWORD
app.post('/api/auth/change-password', async (req, res) => {
    try {
        const { userId, newPassword } = req.body; // In real app, extract userId from JWT middleware
        const pool = await connectToDatabase();

        const hash = await bcrypt.hash(newPassword, 10);

        await pool.request()
            .input('Id', sql.Int, userId)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                UPDATE Users 
                SET PasswordHash = @Hash, MustChangePassword = 0 
                WHERE Id = @Id
            `);

        res.json({ message: 'Password changed successfully.' });

    } catch (err) {
        console.error('Change Password Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET Business Units
app.get('/api/admin/business-units', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM BusinessUnits');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE Business Unit
app.post('/api/admin/business-units', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('Name', sql.NVarChar, name)
            .query('INSERT INTO BusinessUnits (Name) VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_BU', 'BusinessUnit', name, null);
        res.json({ message: 'Business Unit added.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// CREATE BU
app.post('/api/admin/bus', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await connectToDatabase();
        const result = await pool.request().input('Name', sql.NVarChar, name).query('INSERT INTO BusinessUnits (Name) OUTPUT INSERTED.Id, INSERTED.Name VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_BU', 'BusinessUnit', result.recordset[0].Id, { name });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDIT BU
app.put('/api/admin/bus/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .query('UPDATE BusinessUnits SET Name = @Name WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'UPDATE_BU', 'BusinessUnit', id, { name });
        res.json({ message: 'BU updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE BU
app.delete('/api/admin/bus/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM BusinessUnits WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'DELETE_BU', 'BusinessUnit', id, null);
        res.json({ message: 'BU deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Cannot delete BU in use or error occured' });
    }
});

// GET Roles
app.get('/api/admin/roles', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Roles');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// CREATE ROLE
app.post('/api/admin/roles', authenticateToken, async (req, res) => {
    try {
        const { name } = req.body;
        const pool = await connectToDatabase();
        const result = await pool.request().input('Name', sql.NVarChar, name).query('INSERT INTO Roles (Name) OUTPUT INSERTED.Id, INSERTED.Name VALUES (@Name)');
        await logAudit(pool, req.user?.id, 'CREATE_ROLE', 'Role', result.recordset[0].Id, { name });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// EDIT ROLE
app.put('/api/admin/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const pool = await connectToDatabase();
        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .query('UPDATE Roles SET Name = @Name WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'UPDATE_ROLE', 'Role', id, { name });
        res.json({ message: 'Role updated' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE ROLE
app.delete('/api/admin/roles/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();
        await pool.request().input('Id', sql.Int, id).query('DELETE FROM Roles WHERE Id = @Id');
        await logAudit(pool, req.user?.id, 'DELETE_ROLE', 'Role', id, null);
        res.json({ message: 'Role deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Cannot delete role in use or error occured' });
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
                const request = transaction.request();
                for (const pId of permissionIds) {
                    await request.query(`
                        INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (${id}, ${pId})
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

// GET All Permissions (for Role UI)
app.get('/api/admin/permissions', async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT p.Id, p.Action, m.Name as Module, m.Id as ModuleId
            FROM Permissions p
            JOIN Modules m ON p.ModuleId = m.Id
            ORDER BY m.Name, p.Action
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE USER ROLE & BU
app.put('/api/admin/users/:id/role-bu', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { roleId, buId } = req.body;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('RoleId', sql.Int, roleId)
            .input('BuId', sql.Int, buId)
            .query('UPDATE Users SET RoleId = @RoleId, BusinessUnitId = @BuId WHERE Id = @Id');



        await logAudit(pool, req.user?.id, 'UPDATE_USER_ROLE', 'User', id, { roleId, buId });
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE USER
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .query('Delete FROM Users WHERE Id = @Id');



        await logAudit(pool, req.user?.id, 'DELETE_USER', 'User', id, null);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const { name, category, description, problemSolved, itLandscape, deploymentModels, licensing, pricingBand, notToSell, capabilities } = req.body;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Category', sql.NVarChar, category)
            .input('Description', sql.NVarChar, description)
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

        await logAudit(pool, req.user?.id, 'CREATE_PRODUCT', 'Product', name, { category });
        res.status(201).json({ message: 'Product created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE Product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description, problemSolved, itLandscape, deploymentModels, licensing, pricingBand, notToSell, capabilities } = req.body;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id) // Changed to Int
            .input('Name', sql.NVarChar, name)
            .input('Category', sql.NVarChar, category)
            .input('Description', sql.NVarChar, description)
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

        await logAudit(pool, req.user?.id, 'UPDATE_PRODUCT', 'Product', id, { name });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        constresult = await pool.request().query('SELECT * FROM Categories ORDER BY Name ASC');
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

        if (!process.env.GEMINI_API_KEY) {
            console.error('Gemini API Key is missing');
            return res.status(500).json({ error: 'AI service configuration error' });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        // Construct the prompt
        // Messages come in as { role: 'user' | 'assistant', content: string }
        // We need to format them for the model or just pass as text sequence
        // Simple approach: combine them

        const conversationHistory = messages.map(m => `${m.role}: ${m.content}`).join('\n');

        const prompt = `
            ${context}
            
            Current Conversation:
            ${conversationHistory}
            
            Assistant Response:
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-flash-latest',
            contents: [
                { role: 'user', parts: [{ text: prompt }] }
            ]
        });

        let text = '';
        if (response.candidates && response.candidates[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        } else if (typeof response.text === 'function') {
            text = response.text();
        }

        res.json({ response: text });

    } catch (err) {
        console.error('AI Chat Error:', err);
        res.status(500).json({ error: 'Failed to generate AI response' });
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
            kpis: JSON.parse(r.KPIs),
            fears: JSON.parse(r.Fears)
        }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
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
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/icp', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM ICPs');
        if (result.recordset.length === 0) return res.json({});
        const r = result.recordset[0];
        const data = {
            companySize: JSON.parse(r.CompanySize),
            revenueRange: r.RevenueRange,
            industries: JSON.parse(r.Industries),
            geography: JSON.parse(r.Geography),
            buyingTriggers: JSON.parse(r.BuyingTriggers)
        };
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/competitors', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Competitors');
        const data = result.recordset.map(r => ({
            name: r.Name,
            position: r.Position,
            strengths: JSON.parse(r.Strengths),
            weaknesses: JSON.parse(r.Weaknesses),
            winStrategy: r.WinStrategy
        }));
        res.json(data);
    } catch (err) {
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
            modules: JSON.parse(r.Modules),
            outcome: r.Outcome,
            status: r.Status
        }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/assets', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT * FROM Assets');
        const data = result.recordset.map(r => ({
            title: r.Title,
            type: r.Type,
            stage: r.Stage,
            audience: r.Audience,
            size: r.Size
        }));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
