import { connectToDatabase, sql } from './db.js';

async function updatePresales() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        const roleName = 'Pre-Sales Engineer'; // Matching schema
        const modName = 'Products';

        // Get IDs
        const roleRes = await pool.request().input('RName', sql.NVarChar, roleName).query("SELECT Id FROM Roles WHERE Name = @RName");
        const roleId = roleRes.recordset[0]?.Id;

        const modRes = await pool.request().input('MName', sql.NVarChar, modName).query("SELECT Id FROM Modules WHERE Name = @MName");
        const modId = modRes.recordset[0]?.Id;

        if (!roleId || !modId) {
            console.error(`Error: Could not find Role '${roleName}' or Module '${modName}'`);
            process.exit(1);
        }

        console.log(`Configuring permissions for '${roleName}' on '${modName}'...`);

        // 1. Grant READ
        const readAction = 'READ';
        await pool.request()
            .input('RoleId', sql.Int, roleId)
            .input('ModId', sql.Int, modId)
            .input('Action', sql.NVarChar, readAction)
            .query(`
                DECLARE @PermId INT = (SELECT Id FROM Permissions WHERE ModuleId = @ModId AND Action = @Action);
                IF NOT EXISTS (SELECT * FROM RolePermissions WHERE RoleId = @RoleId AND PermissionId = @PermId)
                BEGIN
                    INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@RoleId, @PermId);
                    PRINT 'Granted READ';
                END
                ELSE PRINT 'READ already exists';
            `);

        // 2. Revoke CREATE, UPDATE, DELETE
        const revokeActions = ['CREATE', 'UPDATE', 'DELETE'];
        for (const action of revokeActions) {
            const result = await pool.request()
                .input('RoleId', sql.Int, roleId)
                .input('ModId', sql.Int, modId)
                .input('Action', sql.NVarChar, action)
                .query(`
                    DELETE rp 
                    FROM RolePermissions rp
                    JOIN Permissions p ON rp.PermissionId = p.Id
                    WHERE rp.RoleId = @RoleId 
                      AND p.ModuleId = @ModId 
                      AND p.Action = @Action
                `);
            if (result.rowsAffected[0] > 0) {
                console.log(`Revoked ${action}`);
            }
        }

        console.log('Pre-Sales permissions configured successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updatePresales();
