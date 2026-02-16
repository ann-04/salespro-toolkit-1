import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { connectToDatabase, sql } from './db-postgres-compat.js';
import { logAudit } from './audit.js';
import { verifyToken } from './middleware/security.js';
import {
    getFileType,
    copyFileToStorage,
    getFileSize,
    getStoragePath,
    isValidFileType
} from './fileService.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/temp/',
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
    fileFilter: (req, file, cb) => {
        if (isValidFileType(file.originalname)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF, Excel, Word, PowerPoint, and text files are allowed.'));
        }
    }
});

// Ensure temp directory exists
if (!fs.existsSync('uploads/temp')) {
    fs.mkdirSync('uploads/temp', { recursive: true });
}

// Permission Check Middleware for Assets
const authorizeAssetPermission = (permissionCode) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(' ')[1];
            if (!token) return res.status(401).json({ error: 'No token provided' });

            // Use secure JWT verification
            const decoded = verifyToken(token);
            req.user = decoded;

            // Admin bypass
            if (decoded.role === 'Admin') return next();

            // Allow all authenticated users to READ (view) assets
            // Only check permissions for CREATE, UPDATE, DELETE operations
            if (permissionCode.endsWith('_READ')) {
                // All authenticated users can view assets
                return next();
            }

            // For CREATE, UPDATE, DELETE operations, check if user has the required permission
            const pool = await connectToDatabase();
            const result = await pool.request()
                .input('UserId', sql.Int, decoded.id)
                .input('PermCode', sql.NVarChar, permissionCode)
                .query(`
                    SELECT COUNT(*) as count
                    FROM UserAssetPermissions uap
                    JOIN AssetPermissions ap ON uap.PermissionId = ap.Id
                    WHERE uap.UserId = @UserId AND ap.PermissionCode = @PermCode
                `);

            if (result.recordset[0].count === 0) {
                return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
            }

            next();
        } catch (err) {
            return res.status(403).json({ error: err.message || 'Invalid token' });
        }
    };
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        // Use secure JWT verification
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: err.message || 'Invalid token' });
    }
};

// =====================================================
// BUSINESS UNITS ROUTES
// =====================================================

// GET all business units
router.get('/business-units', authenticateToken, authorizeAssetPermission('ASSET_BU_READ'), async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT Id, Name, Description, CreatedAt, UpdatedAt
            FROM AssetBusinessUnits
            WHERE IsDeleted = 0
            ORDER BY Name ASC
        `);

        res.json(result.recordset.map(r => ({
            id: r.Id,
            name: r.Name,
            description: r.Description,
            createdAt: r.CreatedAt,
            updatedAt: r.UpdatedAt
        })));
    } catch (err) {
        console.error('Fetch Business Units Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE business unit
router.post('/business-units', authenticateToken, authorizeAssetPermission('ASSET_BU_CREATE'), async (req, res) => {
    try {
        const { name, description } = req.body;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO AssetBusinessUnits (Name, Description, CreatedBy)
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description, INSERTED.CreatedAt
                VALUES (@Name, @Description, @CreatedBy)
            `);

        await logAudit(pool, req.user.id, 'CREATE_ASSET_BU', 'AssetBusinessUnit', result.recordset[0].Id, { name });
        res.status(201).json({
            id: result.recordset[0].Id,
            name: result.recordset[0].Name,
            description: result.recordset[0].Description,
            createdAt: result.recordset[0].CreatedAt
        });
    } catch (err) {
        console.error('Create Business Unit Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE business unit
router.put('/business-units/:id', authenticateToken, authorizeAssetPermission('ASSET_BU_UPDATE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetBusinessUnits
                SET Name = @Name, Description = @Description, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id AND IsDeleted = 0
            `);

        await logAudit(pool, req.user.id, 'UPDATE_ASSET_BU', 'AssetBusinessUnit', id, { name });
        res.json({ message: 'Business unit updated successfully' });
    } catch (err) {
        console.error('Update Business Unit Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE business unit (soft delete)
router.delete('/business-units/:id', authenticateToken, authorizeAssetPermission('ASSET_BU_DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetBusinessUnits
                SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id
            `);

        await logAudit(pool, req.user.id, 'DELETE_ASSET_BU', 'AssetBusinessUnit', id, null);
        res.json({ message: 'Business unit deleted successfully' });
    } catch (err) {
        console.error('Delete Business Unit Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// PRODUCTS ROUTES
// =====================================================

// GET products in a business unit
router.get('/business-units/:buId/products', authenticateToken, authorizeAssetPermission('ASSET_PRODUCT_READ'), async (req, res) => {
    try {
        const { buId } = req.params;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('BuId', sql.Int, buId)
            .query(`
                SELECT Id, BusinessUnitId, Name, Description, CreatedAt, UpdatedAt
                FROM AssetProducts
                WHERE BusinessUnitId = @BuId AND IsDeleted = 0
                ORDER BY Name ASC
            `);

        res.json(result.recordset.map(r => ({
            id: r.Id,
            businessUnitId: r.BusinessUnitId,
            name: r.Name,
            description: r.Description,
            createdAt: r.CreatedAt,
            updatedAt: r.UpdatedAt
        })));
    } catch (err) {
        console.error('Fetch Products Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE product
router.post('/business-units/:buId/products', authenticateToken, authorizeAssetPermission('ASSET_PRODUCT_CREATE'), async (req, res) => {
    try {
        const { buId } = req.params;
        const { name, description } = req.body;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('BuId', sql.Int, buId)
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO AssetProducts (BusinessUnitId, Name, Description, CreatedBy)
                OUTPUT INSERTED.Id, INSERTED.BusinessUnitId, INSERTED.Name, INSERTED.Description, INSERTED.CreatedAt
                VALUES (@BuId, @Name, @Description, @CreatedBy)
            `);

        await logAudit(pool, req.user.id, 'CREATE_ASSET_PRODUCT', 'AssetProduct', result.recordset[0].Id, { name, buId });
        res.status(201).json({
            id: result.recordset[0].Id,
            businessUnitId: result.recordset[0].BusinessUnitId,
            name: result.recordset[0].Name,
            description: result.recordset[0].Description,
            createdAt: result.recordset[0].CreatedAt
        });
    } catch (err) {
        console.error('Create Product Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE product
router.put('/products/:id', authenticateToken, authorizeAssetPermission('ASSET_PRODUCT_UPDATE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetProducts
                SET Name = @Name, Description = @Description, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id AND IsDeleted = 0
            `);

        await logAudit(pool, req.user.id, 'UPDATE_ASSET_PRODUCT', 'AssetProduct', id, { name });
        res.json({ message: 'Product updated successfully' });
    } catch (err) {
        console.error('Update Product Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE product (soft delete)
router.delete('/products/:id', authenticateToken, authorizeAssetPermission('ASSET_PRODUCT_DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetProducts
                SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id
            `);

        await logAudit(pool, req.user.id, 'DELETE_ASSET_PRODUCT', 'AssetProduct', id, null);
        res.json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Delete Product Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// FOLDERS ROUTES
// =====================================================

// GET folders in a product
router.get('/products/:productId/folders', authenticateToken, authorizeAssetPermission('ASSET_FOLDER_READ'), async (req, res) => {
    try {
        const { productId } = req.params;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('ProductId', sql.Int, productId)
            .query(`
                SELECT Id, ProductId, Name, Description, CreatedAt, UpdatedAt
                FROM AssetFolders
                WHERE ProductId = @ProductId AND IsDeleted = 0
                ORDER BY Name ASC
            `);

        res.json(result.recordset.map(r => ({
            id: r.Id,
            productId: r.ProductId,
            name: r.Name,
            description: r.Description,
            createdAt: r.CreatedAt,
            updatedAt: r.UpdatedAt
        })));
    } catch (err) {
        console.error('Fetch Folders Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE folder
router.post('/products/:productId/folders', authenticateToken, authorizeAssetPermission('ASSET_FOLDER_CREATE'), async (req, res) => {
    try {
        const { productId } = req.params;
        const { name, description } = req.body;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('ProductId', sql.Int, productId)
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .input('CreatedBy', sql.Int, req.user.id)
            .query(`
                INSERT INTO AssetFolders (ProductId, Name, Description, CreatedBy)
                OUTPUT INSERTED.Id, INSERTED.ProductId, INSERTED.Name, INSERTED.Description, INSERTED.CreatedAt
                VALUES (@ProductId, @Name, @Description, @CreatedBy)
            `);

        await logAudit(pool, req.user.id, 'CREATE_ASSET_FOLDER', 'AssetFolder', result.recordset[0].Id, { name, productId });
        res.status(201).json({
            id: result.recordset[0].Id,
            productId: result.recordset[0].ProductId,
            name: result.recordset[0].Name,
            description: result.recordset[0].Description,
            createdAt: result.recordset[0].CreatedAt
        });
    } catch (err) {
        console.error('Create Folder Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE folder
router.put('/folders/:id', authenticateToken, authorizeAssetPermission('ASSET_FOLDER_UPDATE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetFolders
                SET Name = @Name, Description = @Description, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id AND IsDeleted = 0
            `);

        await logAudit(pool, req.user.id, 'UPDATE_ASSET_FOLDER', 'AssetFolder', id, { name });
        res.json({ message: 'Folder updated successfully' });
    } catch (err) {
        console.error('Update Folder Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE folder (soft delete)
router.delete('/folders/:id', authenticateToken, authorizeAssetPermission('ASSET_FOLDER_DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetFolders
                SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id
            `);

        await logAudit(pool, req.user.id, 'DELETE_ASSET_FOLDER', 'AssetFolder', id, null);
        res.json({ message: 'Folder deleted successfully' });
    } catch (err) {
        console.error('Delete Folder Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// ADMIN ASSET ENDPOINTS
// =====================================================

// GET user file assignments
router.get('/admin/users/:userId/assignments', authenticateToken, authorizeAssetPermission('ASSET_FILE_READ'), async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await connectToDatabase();

        // Return list of files where this user has a customized assignment
        // We join to get File Title from the ASSIGNED version
        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT afa.Id, afa.AssetFileId, afa.VersionGroupId, 
                       af.Title, af.VersionNumber, af.OriginalFileName
                FROM AssetFileAssignments afa
                JOIN AssetFiles af ON afa.AssetFileId = af.Id
                WHERE afa.UserId = @UserId
            `);

        // For each assignment, we might want to know what the LATEST version is too
        const assignments = await Promise.all(result.recordset.map(async (r) => {
            const maxRes = await pool.request()
                .input('Gid', sql.NVarChar, r.VersionGroupId)
                .query('SELECT MAX(VersionNumber) as MaxVer FROM AssetFiles WHERE VersionGroupId = @Gid AND IsDeleted=0');

            return {
                ...r,
                latestVersion: maxRes.recordset[0].MaxVer
            };
        }));

        res.json(assignments);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// SEARCH assets globally (grouped)
router.get('/admin/assets/search', authenticateToken, authorizeAssetPermission('ASSET_FILE_READ'), async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) return res.json([]);

        const pool = await connectToDatabase();

        // Find files matching query
        const result = await pool.request()
            .input('Query', sql.NVarChar, `%${q}%`)
            .query(`
                SELECT TOP 20 VersionGroupId, MAX(Title) as Title, MAX(Id) as LatestId
                FROM AssetFiles
                WHERE Title LIKE @Query AND IsDeleted = 0
                GROUP BY VersionGroupId
            `);

        res.json(result.recordset.map(r => ({
            versionGroupId: r.VersionGroupId,
            title: r.Title,
            latestId: r.LatestId // ID of one of the files (usually latest if we trust ID increment, but safest is to just have a handle)
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// FILES ROUTES
// =====================================================

// GET files in a folder
router.get('/folders/:folderId/files', authenticateToken, authorizeAssetPermission('ASSET_FILE_READ'), async (req, res) => {
    try {
        const { folderId } = req.params;
        const { sort, showArchived, showAllVersions } = req.query; // showAllVersions for Admin/Internal to see history
        const pool = await connectToDatabase();

        // Determine sort order
        const orderBy = sort === 'oldest' ? 'ASC' : 'DESC';

        let query = `
                SELECT 
                    af.Id, af.FolderId, af.Title, af.OriginalFileName, af.StoredFileName,
                    af.FileType, af.FileSize, af.Description, af.CreatedAt, af.UpdatedAt,
                    af.IsArchived, af.AudienceLevel, af.VersionGroupId, af.VersionNumber,
                    u.Name as UploadedByName
                FROM AssetFiles af
                LEFT JOIN Users u ON af.CreatedBy = u.Id
                WHERE af.FolderId = @FolderId AND af.IsDeleted = 0
            `;

        if (showArchived !== 'true') {
            query += ' AND af.IsArchived = 0';
        }

        // Role-Based Audience Access Control
        // For Partners: Show files with Partner/EndUser audience OR files specifically assigned to them
        if (req.user.userType === 'PARTNER') {
            query += ` AND (af.AudienceLevel IN ('Partner', 'EndUser')
                        OR EXISTS (
                            SELECT 1 FROM AssetFileAssignments afa
                            WHERE afa.AssetFileId = af.Id
                            AND afa.UserId = @UserId
                        ))`;
        }

        query += ` ORDER BY af.CreatedAt ${orderBy}`;

        const result = await pool.request()
            .input('FolderId', sql.Int, folderId)
            .input('UserId', sql.Int, req.user.id) // Add UserId for the subquery
            .query(query);

        // Fetch Assignments for this user (if Partner) or general knowledge (if Internal wanting to debug? No, tailored view).
        let userAssignments = new Set();
        if (req.user.userType === 'PARTNER') {
            const assignResult = await pool.request()
                .input('UserId', sql.Int, req.user.id)
                .query('SELECT AssetFileId FROM AssetFileAssignments WHERE UserId = @UserId');
            assignResult.recordset.forEach(r => userAssignments.add(r.AssetFileId));
        }

        // Process Recordset
        const rawFiles = result.recordset;

        // Group by VersionGroupId
        const groupedMap = {}; // { groupId: [files...] }
        for (const file of rawFiles) {
            // If legacy file has no VersionGroupId, treat Id as unique group (or client handles it)
            // But we backfilled it.
            const gid = file.VersionGroupId || file.Id;
            if (!groupedMap[gid]) groupedMap[gid] = [];
            groupedMap[gid].push(file);
        }

        const finalFileList = [];

        // Logic:
        // 1. If showAllVersions=true (Admin context), return everything flat (or maybe UI groups it? API returns flat).
        //    Let's return flat if showAllVersions is set, identifying they share GroupId.
        if (showAllVersions === 'true' && req.user.userType !== 'PARTNER') {
            // Return all, let frontend group
            // Just retrieve tags/content types for ALL
            // (We'll do that below)
            rawFiles.forEach(f => finalFileList.push(f));
        } else {
            // 2. Collapse logic
            for (const gid in groupedMap) {
                const groupFiles = groupedMap[gid];

                // Sort by VersionNumber DESC (Newest first)
                groupFiles.sort((a, b) => (b.VersionNumber || 0) - (a.VersionNumber || 0));

                // Debug Log
                console.log(`Group ID ${gid}: Found ${groupFiles.length} versions. Top: V${groupFiles[0].VersionNumber} (ID: ${groupFiles[0].Id})`);

                let selectedFile = null;

                if (req.user.userType === 'PARTNER') {
                    // Check if any specific version is assigned
                    const assignedVersion = groupFiles.find(f => userAssignments.has(f.Id));
                    if (assignedVersion) {
                        selectedFile = assignedVersion;
                    } else {
                        // Default: Show Latest
                        selectedFile = groupFiles[0];
                    }
                } else {
                    // Internal: Default show Latest
                    selectedFile = groupFiles[0];
                }

                if (selectedFile) {
                    finalFileList.push(selectedFile);
                }
            }
        }

        // Get tags and content types for FINAL list only
        const files = await Promise.all(finalFileList.map(async (r) => {
            const tagsResult = await pool.request()
                .input('FileId', sql.Int, r.Id)
                .query('SELECT Id, TagName FROM AssetFileTags WHERE FileId = @FileId');

            const contentTypesResult = await pool.request()
                .input('FileId', sql.Int, r.Id)
                .query(`
                    SELECT ct.Id, ct.Name, ct.Description
                    FROM AssetFileContentTypes afct
                    JOIN ContentTypes ct ON afct.ContentTypeId = ct.Id
                    WHERE afct.FileId = @FileId
                    ORDER BY ct.Name ASC
                `);

            return {
                id: r.Id,
                folderId: r.FolderId,
                title: r.Title,
                originalFileName: r.OriginalFileName,
                storedFileName: r.StoredFileName,
                fileType: r.FileType,
                fileSize: r.FileSize,
                description: r.Description,
                isArchived: r.IsArchived,
                audienceLevel: r.AudienceLevel,
                versionGroupId: r.VersionGroupId,
                versionNumber: r.VersionNumber,
                uploadedBy: r.UploadedByName,
                tags: tagsResult.recordset.map(t => ({ id: t.Id, name: t.TagName })),
                contentTypes: contentTypesResult.recordset.map(ct => ({
                    id: ct.Id,
                    name: ct.Name,
                    description: ct.Description
                })),
                createdAt: r.CreatedAt,
                updatedAt: r.UpdatedAt
            };
        }));

        res.json(files);
    } catch (err) {
        console.error('Fetch Files Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET versions of a specific file (For Access Management)
router.get('/files/:fileId/versions', authenticateToken, authorizeAssetPermission('ASSET_FILE_READ'), async (req, res) => {
    try {
        const { fileId } = req.params;
        const pool = await connectToDatabase();

        // 1. Get VersionGroupId of the target file
        const fileRes = await pool.request().input('Id', sql.Int, fileId).query('SELECT VersionGroupId FROM AssetFiles WHERE Id = @Id');
        if (fileRes.recordset.length === 0) return res.status(404).json({ error: 'File not found' });

        const versionGroupId = fileRes.recordset[0].VersionGroupId;
        if (!versionGroupId) return res.json([]); // Should not happen given backfill

        // 2. Get all versions
        const result = await pool.request()
            .input('Gid', sql.NVarChar, versionGroupId)
            .query(`
                SELECT Id, Title, VersionNumber, CreatedAt, AudienceLevel, IsArchived 
                FROM AssetFiles 
                WHERE VersionGroupId = @Gid AND IsDeleted = 0 
                ORDER BY VersionNumber DESC
            `);

        res.json(result.recordset.map(r => ({
            id: r.Id,
            title: r.Title,
            versionNumber: r.VersionNumber,
            versionGroupId: versionGroupId, // Include the group ID
            audienceLevel: r.AudienceLevel,
            isArchived: r.IsArchived,
            createdAt: r.CreatedAt
        })));

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ASSIGN version to user
router.post('/admin/assign-version', authenticateToken, authorizeAssetPermission('ASSET_FILE_UPDATE'), async (req, res) => {
    try {
        const { userId, assetFileId, versionGroupId } = req.body;
        console.log('ASSIGN VERSION REQUEST:', { userId, assetFileId, versionGroupId });
        // Logic: 
        // 1. Remove any other assignment for this user within this Version Group
        // 2. Insert new assignment

        const pool = await connectToDatabase();

        await pool.request()
            .input('UserId', sql.Int, userId)
            .input('Gid', sql.NVarChar, versionGroupId)
            .query('DELETE FROM AssetFileAssignments WHERE UserId = @UserId AND VersionGroupId = @Gid');

        // If assetFileId is -1 or null, we just wanted to clear the assignment (return to "Latest" default)
        // ensure loose equality or cast to number to handle "-1" string from JSON
        if (assetFileId && Number(assetFileId) !== -1) {
            await pool.request()
                .input('UserId', sql.Int, userId)
                .input('FileId', sql.Int, assetFileId)
                .input('Gid', sql.NVarChar, versionGroupId)
                .input('AdminId', sql.Int, req.user.id)
                .query(`
                    INSERT INTO AssetFileAssignments (UserId, AssetFileId, VersionGroupId, AssignedBy)
                    VALUES (@UserId, @FileId, @Gid, @AdminId)
                `);
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Assign Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPLOAD file
router.post('/folders/:folderId/files', authenticateToken, authorizeAssetPermission('ASSET_FILE_CREATE'), upload.single('file'), async (req, res) => {
    try {
        const { folderId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { title, description, tags, audienceLevel, updateVersionGroupId } = req.body;
        console.log('UPLOAD FILE REQUEST:', { title, updateVersionGroupId, file: req.file.originalname });
        const isArchived = req.body.isArchived === 'true' || req.body.isArchived === true;

        const originalFileName = req.file.originalname;
        const tempFilePath = req.file.path;

        // Get folder hierarchy for storage path
        const pool = await connectToDatabase();
        const hierarchyResult = await pool.request()
            .input('FolderId', sql.Int, folderId)
            .query(`
                SELECT 
                    f.Id as FolderId,
                    p.Id as ProductId,
                    bu.Id as BusinessUnitId
                FROM AssetFolders f
                JOIN AssetProducts p ON f.ProductId = p.Id
                JOIN AssetBusinessUnits bu ON p.BusinessUnitId = bu.Id
                WHERE f.Id = @FolderId
            `);

        if (hierarchyResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const { BusinessUnitId, ProductId, FolderId } = hierarchyResult.recordset[0];

        // Copy file to hierarchical storage
        const storedFileName = await copyFileToStorage(tempFilePath, originalFileName);
        const hierarchicalPath = `storage/assets/${BusinessUnitId}/${ProductId}/${FolderId}`;
        const finalStoragePath = path.join(hierarchicalPath, storedFileName);

        // Ensure hierarchical directory exists
        if (!fs.existsSync(hierarchicalPath)) {
            fs.mkdirSync(hierarchicalPath, { recursive: true });
        }

        // Move file to hierarchical location
        const currentPath = getStoragePath(storedFileName);
        fs.renameSync(currentPath, finalStoragePath);

        // Get file metadata
        const fileType = getFileType(originalFileName);
        const fileSize = getFileSize(finalStoragePath);

        // VERSIONING LOGIC
        let versionGroupId = updateVersionGroupId;
        let versionNumber = 1;

        if (versionGroupId) {
            // Fetch max version
            // Fetch max version
            const verRes = await pool.request()
                .input('Gid', sql.NVarChar, versionGroupId)
                .query('SELECT MAX(VersionNumber) as MaxVer FROM AssetFiles WHERE VersionGroupId = @Gid AND IsDeleted = 0');

            let maxVer = verRes.recordset[0].MaxVer;

            // HANDLE LEGACY: If maxVer is null, it means no files have this VersionGroupId.
            // This happens if the user clicked "New Version" on a Legacy file (VersionGroupId=NULL).
            // The frontend sends the File ID as the versionGroupId.
            // We must find that legacy file and "upgrade" it to use its ID as its VersionGroupId.
            if (maxVer === null) {
                // Check if versionGroupId looks like an Integer (File ID)
                if (/^\d+$/.test(versionGroupId.toString())) {
                    const legacyRes = await pool.request()
                        .input('Id', sql.Int, versionGroupId)
                        .query('SELECT Id, VersionNumber FROM AssetFiles WHERE Id = @Id AND VersionGroupId IS NULL');

                    if (legacyRes.recordset.length > 0) {
                        console.log(`Upgrading Legacy File ${versionGroupId} to VersionGroup...`);
                        // Upgrade the legacy file
                        await pool.request()
                            .input('Id', sql.Int, versionGroupId)
                            .input('Gid', sql.NVarChar, versionGroupId.toString())
                            .query('UPDATE AssetFiles SET VersionGroupId = @Gid WHERE Id = @Id');

                        // Set maxVer from the legacy file
                        maxVer = legacyRes.recordset[0].VersionNumber || 1;
                    }
                }
            }

            versionNumber = (maxVer || 0) + 1;
        } else {
            // Generate new Group ID (User didn't specific an existing file to update)
            // We can use a request to SQL NewID or generate in JS. Let's use SQL output variable? 
            // Simpler: Just rely on DB "default" if I allowed it, but I didn't set default in schema for that param (I did for table though? No, I did Update).
            // Let's generate one in JS for clarity or use UUID lib if available. 
            // Or simpler: `SELECT NEWID() as newId`.
            const idRes = await pool.request().query('SELECT NEWID() as newId');
            versionGroupId = idRes.recordset[0].newId;
        }

        // Insert file record
        const result = await pool.request()
            .input('FolderId', sql.Int, folderId)
            .input('Title', sql.NVarChar, title)
            .input('OriginalFileName', sql.NVarChar, originalFileName)
            .input('StoredFileName', sql.NVarChar, storedFileName)
            .input('FileType', sql.NVarChar, fileType)
            .input('FileSize', sql.BigInt, fileSize)
            .input('StoragePath', sql.NVarChar, finalStoragePath)
            .input('Description', sql.NVarChar, description || null)
            .input('IsArchived', sql.Bit, isArchived ? 1 : 0)
            .input('AudienceLevel', sql.NVarChar, audienceLevel || 'Internal')
            .input('CreatedBy', sql.Int, req.user.id)
            .input('VersionGroupId', sql.NVarChar, versionGroupId) // New
            .input('VersionNumber', sql.Int, versionNumber) // New
            .query(`
                INSERT INTO AssetFiles (FolderId, Title, OriginalFileName, StoredFileName, FileType, FileSize, StoragePath, Description, IsArchived, AudienceLevel, CreatedBy, VersionGroupId, VersionNumber)
                OUTPUT INSERTED.Id
                VALUES (@FolderId, @Title, @OriginalFileName, @StoredFileName, @FileType, @FileSize, @StoragePath, @Description, @IsArchived, @AudienceLevel, @CreatedBy, @VersionGroupId, @VersionNumber)
            `);

        const fileId = result.recordset[0].Id;

        // Add tags if provided
        if (tags) {
            const tagArray = Array.isArray(tags) ? tags : JSON.parse(tags);
            for (const tag of tagArray) {
                await pool.request()
                    .input('FileId', sql.Int, fileId)
                    .input('TagName', sql.NVarChar, tag)
                    .query('INSERT INTO AssetFileTags (FileId, TagName) VALUES (@FileId, @TagName)');
            }
        }

        await logAudit(pool, req.user.id, 'UPLOAD_ASSET_FILE', 'AssetFile', fileId, { title, fileType, folderId, versionNumber });
        res.status(201).json({
            id: fileId,
            title,
            originalFileName,
            fileType,
            fileSize,
            isArchived,
            audienceLevel: audienceLevel || 'Internal',
            versionNumber,
            versionGroupId,
            message: 'File uploaded successfully'
        });

    } catch (err) {
        console.error('Upload File Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// BULK UPLOAD files (for folder upload)
router.post('/folders/:folderId/files/bulk', authenticateToken, authorizeAssetPermission('ASSET_FILE_CREATE'), upload.array('files', 100), async (req, res) => {
    try {
        console.log('=== BULK UPLOAD START ===');
        const { folderId } = req.params;
        console.log('Folder ID:', folderId);
        console.log('Files received:', req.files ? req.files.length : 0);

        if (!req.files || req.files.length === 0) {
            console.log('ERROR: No files uploaded');
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { description, audienceLevel } = req.body;
        // Bulk defaults for now; can be enhanced to support per-file config
        const isArchived = false;
        const selectedAudienceLevel = audienceLevel || 'Internal';
        const uploadedFiles = [];
        const errors = [];

        // Get folder hierarchy for storage path
        const pool = await connectToDatabase();
        const hierarchyResult = await pool.request()
            .input('FolderId', sql.Int, folderId)
            .query(`
                SELECT 
                    f.Id as FolderId,
                    p.Id as ProductId,
                    bu.Id as BusinessUnitId
                FROM AssetFolders f
                JOIN AssetProducts p ON f.ProductId = p.Id
                JOIN AssetBusinessUnits bu ON p.BusinessUnitId = bu.Id
                WHERE f.Id = @FolderId
            `);

        if (hierarchyResult.recordset.length === 0) {
            console.log('ERROR: Folder not found');
            return res.status(404).json({ error: 'Folder not found' });
        }

        const { BusinessUnitId, ProductId, FolderId } = hierarchyResult.recordset[0];
        const hierarchicalPath = `storage/assets/${BusinessUnitId}/${ProductId}/${FolderId}`;
        console.log('Hierarchical path:', hierarchicalPath);

        // Ensure hierarchical directory exists
        if (!fs.existsSync(hierarchicalPath)) {
            fs.mkdirSync(hierarchicalPath, { recursive: true });
            console.log('Created directory:', hierarchicalPath);
        }

        // Process each file
        console.log('Processing', req.files.length, 'files...');
        for (const file of req.files) {
            try {
                console.log('Processing file:', file.originalname);
                const originalFileName = file.originalname;
                const tempFilePath = file.path;

                // Copy file to hierarchical storage
                const storedFileName = await copyFileToStorage(tempFilePath, originalFileName);
                const finalStoragePath = path.join(hierarchicalPath, storedFileName);

                // Move file to hierarchical location
                const currentPath = getStoragePath(storedFileName);
                fs.renameSync(currentPath, finalStoragePath);

                // Get file metadata
                const fileType = getFileType(originalFileName);
                const fileSize = getFileSize(finalStoragePath);

                // Use original filename as title (without extension)
                const title = path.parse(originalFileName).name;

                // Insert file record
                const result = await pool.request()
                    .input('FolderId', sql.Int, folderId)
                    .input('Title', sql.NVarChar, title)
                    .input('OriginalFileName', sql.NVarChar, originalFileName)
                    .input('StoredFileName', sql.NVarChar, storedFileName)
                    .input('FileType', sql.NVarChar, fileType)
                    .input('FileSize', sql.BigInt, fileSize)
                    .input('StoragePath', sql.NVarChar, finalStoragePath)
                    .input('Description', sql.NVarChar, description || null)
                    .input('IsArchived', sql.Bit, isArchived ? 1 : 0)
                    .input('AudienceLevel', sql.NVarChar, selectedAudienceLevel)
                    .input('CreatedBy', sql.Int, req.user.id)
                    .query(`
                        INSERT INTO AssetFiles (FolderId, Title, OriginalFileName, StoredFileName, FileType, FileSize, StoragePath, Description, IsArchived, AudienceLevel, CreatedBy)
                        OUTPUT INSERTED.Id
                        VALUES (@FolderId, @Title, @OriginalFileName, @StoredFileName, @FileType, @FileSize, @StoragePath, @Description, @IsArchived, @AudienceLevel, @CreatedBy)
                    `);

                const fileId = result.recordset[0].Id;

                uploadedFiles.push({
                    id: fileId,
                    title,
                    originalFileName,
                    fileType,
                    fileSize
                });

                await logAudit(pool, req.user.id, 'BULK_UPLOAD_ASSET_FILE', 'AssetFile', fileId, { title, fileType, folderId });
                console.log('Successfully uploaded:', originalFileName);

            } catch (fileErr) {
                console.error(`Error uploading file ${file.originalname}:`, fileErr);
                errors.push({
                    filename: file.originalname,
                    error: fileErr.message
                });
            }
        }

        console.log('=== BULK UPLOAD COMPLETE ===');
        console.log('Uploaded:', uploadedFiles.length, 'Failed:', errors.length);

        res.status(201).json({
            message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
            uploadedFiles,
            errors: errors.length > 0 ? errors : undefined,
            totalUploaded: uploadedFiles.length,
            totalFailed: errors.length
        });

    } catch (err) {
        console.error('Bulk Upload Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE file metadata
router.put('/files/:id', authenticateToken, authorizeAssetPermission('ASSET_FILE_UPDATE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, tags, contentTypeIds, isArchived, audienceLevel } = req.body;

        console.log('📝 UPDATE FILE METADATA REQUEST:', {
            fileId: id,
            title,
            description,
            tags,
            contentTypeIds,
            isArchived,
            audienceLevel
        });

        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('Title', sql.NVarChar, title)
            .input('Description', sql.NVarChar, description || null)
            .input('IsArchived', sql.Bit, isArchived === true || isArchived === 'true' ? 1 : 0)
            .input('AudienceLevel', sql.NVarChar, audienceLevel || 'Internal')
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetFiles
                SET Title = @Title, Description = @Description, IsArchived = @IsArchived, AudienceLevel = @AudienceLevel, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id AND IsDeleted = 0
            `);

        console.log('✅ File basic metadata updated');

        // Update tags if provided
        if (tags && Array.isArray(tags)) {
            // Delete existing tags
            await pool.request()
                .input('fileId', sql.Int, id)
                .query('DELETE FROM AssetFileTags WHERE FileID = @fileId');

            // Insert new tags
            for (const tag of tags) {
                if (tag.trim()) {
                    await pool.request()
                        .input('fileId', sql.Int, id)
                        .input('tag', sql.NVarChar, tag.trim())
                        .query('INSERT INTO AssetFileTags (FileID, TagName) VALUES (@fileId, @tag)');
                }
            }
            console.log(`✅ Updated ${tags.length} tags`);
        }

        // Update content types if provided
        if (contentTypeIds && Array.isArray(contentTypeIds)) {
            // Delete existing content type associations
            await pool.request()
                .input('fileId', sql.Int, id)
                .query('DELETE FROM AssetFileContentTypes WHERE FileID = @fileId');

            console.log(`🗑️ Deleted existing content types for file ${id}`);

            // Insert new content type associations
            for (const contentTypeId of contentTypeIds) {
                await pool.request()
                    .input('fileId', sql.Int, id)
                    .input('contentTypeId', sql.Int, contentTypeId)
                    .query('INSERT INTO AssetFileContentTypes (FileID, ContentTypeID) VALUES (@fileId, @contentTypeId)');
                console.log(`✅ Added content type ${contentTypeId} to file ${id}`);
            }
            console.log(`✅ Updated ${contentTypeIds.length} content types`);
        }

        await logAudit(pool, req.user.id, 'UPDATE_ASSET_FILE', 'AssetFile', id, { title, tagsCount: tags?.length || 0, contentTypesCount: contentTypeIds?.length || 0 });

        console.log('✅ File metadata update complete');
        res.json({ message: 'File updated successfully' });
    } catch (err) {
        console.error('❌ Update File Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DOWNLOAD file
router.get('/files/:id/download', authenticateToken, authorizeAssetPermission('ASSET_FILE_READ'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('Id', sql.Int, id)
            .query('SELECT OriginalFileName, StoragePath FROM AssetFiles WHERE Id = @Id AND IsDeleted = 0');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const { OriginalFileName, StoragePath } = result.recordset[0];

        if (!fs.existsSync(StoragePath)) {
            return res.status(404).json({ error: 'File not found on disk' });
        }

        await logAudit(pool, req.user.id, 'DOWNLOAD_ASSET_FILE', 'AssetFile', id, null);
        res.download(StoragePath, OriginalFileName);

    } catch (err) {
        console.error('Download File Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE file (soft delete)
router.delete('/files/:id', authenticateToken, authorizeAssetPermission('ASSET_FILE_DELETE'), async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('Id', sql.Int, id)
            .input('UpdatedBy', sql.Int, req.user.id)
            .query(`
                UPDATE AssetFiles
                SET IsDeleted = 1, UpdatedBy = @UpdatedBy, UpdatedAt = GETDATE()
                WHERE Id = @Id
            `);

        await logAudit(pool, req.user.id, 'DELETE_ASSET_FILE', 'AssetFile', id, null);
        res.json({ message: 'File deleted successfully' });
    } catch (err) {
        console.error('Delete File Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ADD tag to file
router.post('/files/:id/tags', authenticateToken, authorizeAssetPermission('ASSET_FILE_UPDATE'), async (req, res) => {
    try {
        const { id } = req.params;
        const { tagName } = req.body;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('FileId', sql.Int, id)
            .input('TagName', sql.NVarChar, tagName)
            .query(`
                INSERT INTO AssetFileTags (FileId, TagName)
                OUTPUT INSERTED.Id, INSERTED.TagName
                VALUES (@FileId, @TagName)
            `);

        res.status(201).json({
            id: result.recordset[0].Id,
            name: result.recordset[0].TagName
        });
    } catch (err) {
        console.error('Add Tag Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// REMOVE tag from file
router.delete('/files/:id/tags/:tagId', authenticateToken, authorizeAssetPermission('ASSET_FILE_UPDATE'), async (req, res) => {
    try {
        const { tagId } = req.params;
        const pool = await connectToDatabase();

        await pool.request()
            .input('TagId', sql.Int, tagId)
            .query('DELETE FROM AssetFileTags WHERE Id = @TagId');

        res.json({ message: 'Tag removed successfully' });
    } catch (err) {
        console.error('Remove Tag Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// PERMISSION MANAGEMENT ROUTES (Admin Only)
// =====================================================

// GET all asset permissions
router.get('/admin/asset-permissions', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT Id, ResourceType, Action, PermissionCode, Description
            FROM AssetPermissions
            ORDER BY ResourceType, Action
        `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Fetch Asset Permissions Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET user's asset permissions
router.get('/admin/users/:userId/asset-permissions', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('UserId', sql.Int, userId)
            .query(`
                SELECT ap.Id, ap.ResourceType, ap.Action, ap.PermissionCode, ap.Description
                FROM UserAssetPermissions uap
                JOIN AssetPermissions ap ON uap.PermissionId = ap.Id
                WHERE uap.UserId = @UserId
                ORDER BY ap.ResourceType, ap.Action
            `);

        res.json(result.recordset);
    } catch (err) {
        console.error('Fetch User Asset Permissions Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ASSIGN asset permissions to user
router.post('/admin/users/:userId/asset-permissions', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { permissionIds } = req.body; // Array of permission IDs
        const pool = await connectToDatabase();

        // Delete existing permissions
        await pool.request()
            .input('UserId', sql.Int, userId)
            .query('DELETE FROM UserAssetPermissions WHERE UserId = @UserId');

        // Insert new permissions
        if (permissionIds && permissionIds.length > 0) {
            for (const permId of permissionIds) {
                await pool.request()
                    .input('UserId', sql.Int, userId)
                    .input('PermissionId', sql.Int, permId)
                    .input('GrantedBy', sql.Int, req.user.id)
                    .query(`
                        INSERT INTO UserAssetPermissions (UserId, PermissionId, GrantedBy)
                        VALUES (@UserId, @PermissionId, @GrantedBy)
                    `);
            }
        }

        await logAudit(pool, req.user.id, 'ASSIGN_ASSET_PERMISSIONS', 'User', userId, { count: permissionIds?.length });
        res.json({ message: 'Permissions assigned successfully' });
    } catch (err) {
        console.error('Assign Asset Permissions Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// =====================================================
// CONTENT TYPES ROUTES
// =====================================================

// GET all content types
router.get('/content-types', authenticateToken, async (req, res) => {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT Id, Name, Description, CreatedAt
            FROM ContentTypes
            ORDER BY Name ASC
        `);

        const contentTypes = result.recordset.map(ct => ({
            id: ct.Id,
            name: ct.Name,
            description: ct.Description,
            createdAt: ct.CreatedAt
        }));

        res.json(contentTypes);
    } catch (err) {
        console.error('Get Content Types Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// CREATE new content type (Admin only)
router.post('/content-types', authenticateToken, async (req, res) => {
    try {
        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Content type name is required' });
        }

        const pool = await connectToDatabase();

        // Check if content type already exists
        const check = await pool.request()
            .input('Name', sql.NVarChar, name)
            .query('SELECT Id FROM ContentTypes WHERE Name = @Name');

        if (check.recordset.length > 0) {
            return res.status(400).json({ error: 'Content type already exists' });
        }

        const result = await pool.request()
            .input('Name', sql.NVarChar, name)
            .input('Description', sql.NVarChar, description || null)
            .query(`
                INSERT INTO ContentTypes (Name, Description)
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.Description
                VALUES (@Name, @Description)
            `);

        await logAudit(pool, req.user.id, 'CREATE_CONTENT_TYPE', 'ContentType', result.recordset[0].Id, { name });

        res.status(201).json({
            id: result.recordset[0].Id,
            name: result.recordset[0].Name,
            description: result.recordset[0].Description
        });
    } catch (err) {
        console.error('Create Content Type Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// GET content types for a specific file
router.get('/files/:fileId/content-types', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const pool = await connectToDatabase();

        const result = await pool.request()
            .input('FileId', sql.Int, fileId)
            .query(`
                SELECT ct.Id, ct.Name, ct.Description
                FROM AssetFileContentTypes afct
                JOIN ContentTypes ct ON afct.ContentTypeId = ct.Id
                WHERE afct.FileId = @FileId
                ORDER BY ct.Name ASC
            `);

        const contentTypes = result.recordset.map(ct => ({
            id: ct.Id,
            name: ct.Name,
            description: ct.Description
        }));

        res.json(contentTypes);
    } catch (err) {
        console.error('Get File Content Types Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// UPDATE content types for a file
router.put('/files/:fileId/content-types', authenticateToken, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { contentTypeIds } = req.body; // Array of content type IDs

        if (!Array.isArray(contentTypeIds)) {
            return res.status(400).json({ error: 'contentTypeIds must be an array' });
        }

        const pool = await connectToDatabase();

        // Delete existing content type associations
        await pool.request()
            .input('FileId', sql.Int, fileId)
            .query('DELETE FROM AssetFileContentTypes WHERE FileId = @FileId');

        // Insert new content type associations
        if (contentTypeIds.length > 0) {
            for (const typeId of contentTypeIds) {
                await pool.request()
                    .input('FileId', sql.Int, fileId)
                    .input('ContentTypeId', sql.Int, typeId)
                    .query(`
                        INSERT INTO AssetFileContentTypes (FileId, ContentTypeId)
                        VALUES (@FileId, @ContentTypeId)
                    `);
            }
        }

        await logAudit(pool, req.user.id, 'UPDATE_FILE_CONTENT_TYPES', 'AssetFile', fileId, { count: contentTypeIds.length });

        res.json({ message: 'Content types updated successfully', count: contentTypeIds.length });
    } catch (err) {
        console.error('Update File Content Types Error:', err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
