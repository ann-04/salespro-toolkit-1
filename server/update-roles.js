import { connectToDatabase, sql } from './db.js';

async function updateRoles() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        // 1. Ensure 'Product Manager' Role exists
        await pool.request()
            .input('Name', sql.NVarChar, 'Product Manager')
            .query(`
                IF NOT EXISTS (SELECT * FROM Roles WHERE Name = @Name)
                INSERT INTO Roles (Name) VALUES (@Name)
            `);
        console.log('Product Manager Role ensured.');

        // 2. Ensure ALL Permissions for 'Products' Module exist
        const modules = ['Products', 'Sales'];
        for (const mod of modules) {
            await pool.request().input('ModName', sql.NVarChar, mod).query(`
                IF NOT EXISTS (SELECT * FROM Modules WHERE Name = @ModName)
                INSERT INTO Modules (Name) VALUES (@ModName)
            `);
        }

        // Get Module IDs
        const modRes = await pool.request().query("SELECT Id, Name FROM Modules WHERE Name IN ('Products', 'Sales')");
        const prodModId = modRes.recordset.find(m => m.Name === 'Products').Id;
        const salesModId = modRes.recordset.find(m => m.Name === 'Sales').Id;

        // Ensure Permissions exist for Products
        const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
        for (const action of actions) {
            await pool.request()
                .input('ModId', sql.Int, prodModId)
                .input('Action', sql.NVarChar, action)
                .query(`
                    IF NOT EXISTS (SELECT * FROM Permissions WHERE ModuleId = @ModId AND Action = @Action)
                    INSERT INTO Permissions (ModuleId, Action) VALUES (@ModId, @Action)
                `);
        }

        // 3. Assign Permissions to Roles

        // Helper to get Role ID
        const getRoleId = async (name) => {
            const r = await pool.request().input('Name', sql.NVarChar, name).query('SELECT Id FROM Roles WHERE Name = @Name');
            return r.recordset[0]?.Id;
        };

        const salesMgrId = await getRoleId('Sales Manager');
        const prodMgrId = await getRoleId('Product Manager');

        // Assign CRUD Products to Sales Manager
        // (First clear existing product permissions to be clean or just insert if missing)
        // We will just insert if missing

        console.log('Assigning Permissions to Sales Manager...');
        for (const action of actions) {
            await pool.request()
                .input('RoleId', sql.Int, salesMgrId)
                .input('ModId', sql.Int, prodModId)
                .input('Action', sql.NVarChar, action)
                .query(`
                    DECLARE @PermId INT = (SELECT Id FROM Permissions WHERE ModuleId = @ModId AND Action = @Action);
                    IF NOT EXISTS (SELECT * FROM RolePermissions WHERE RoleId = @RoleId AND PermissionId = @PermId)
                    INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@RoleId, @PermId);
                `);
        }

        // Assign READ Products to Product Manager
        console.log('Assigning READ Permissions to Product Manager...');
        await pool.request()
            .input('RoleId', sql.Int, prodMgrId)
            .input('ModId', sql.Int, prodModId)
            .input('Action', sql.NVarChar, 'READ')
            .query(`
                DECLARE @PermId INT = (SELECT Id FROM Permissions WHERE ModuleId = @ModId AND Action = @Action);
                IF NOT EXISTS (SELECT * FROM RolePermissions WHERE RoleId = @RoleId AND PermissionId = @PermId)
                INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@RoleId, @PermId);
            `);

        console.log('Roles and Permissions updated successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Failed to update roles:', err);
        process.exit(1);
    }
}

updateRoles();
