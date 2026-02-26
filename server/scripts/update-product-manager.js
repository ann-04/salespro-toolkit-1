import { connectToDatabase, sql } from './db.js';

async function updateProductManager() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        const roleName = 'Product Manager';
        const modName = 'Products';

        // Get IDs
        const roleRes = await pool.request().input('RName', sql.NVarChar, roleName).query("SELECT Id FROM Roles WHERE Name = @RName");
        const roleId = roleRes.recordset[0]?.Id;

        const modRes = await pool.request().input('MName', sql.NVarChar, modName).query("SELECT Id FROM Modules WHERE Name = @MName");
        const modId = modRes.recordset[0]?.Id;

        if (!roleId) {
            console.error(`Error: Role '${roleName}' not found. Creating it...`);
            await pool.request().input('Name', sql.NVarChar, roleName).query("INSERT INTO Roles (Name) VALUES (@Name)");
            // Fetch again
            const r2 = await pool.request().input('RName', sql.NVarChar, roleName).query("SELECT Id FROM Roles WHERE Name = @RName");
            if (!r2.recordset[0]) throw new Error('Failed to create role');
            console.log(`Created Role '${roleName}' with ID ${r2.recordset[0].Id}`);
        }

        if (!modId) {
            console.error(`Error: Module '${modName}' not found. Cannot assign permissions.`);
            process.exit(1);
        }

        const finalRoleId = roleId || (await pool.request().input('RName', sql.NVarChar, roleName).query("SELECT Id FROM Roles WHERE Name = @RName")).recordset[0].Id;

        console.log(`Granting CRUD permissions for '${roleName}' on '${modName}'...`);

        const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];

        for (const action of actions) {
            await pool.request()
                .input('RoleId', sql.Int, finalRoleId)
                .input('ModId', sql.Int, modId)
                .input('Action', sql.NVarChar, action)
                .query(`
                    DECLARE @PermId INT = (SELECT Id FROM Permissions WHERE ModuleId = @ModId AND Action = @Action);
                    IF @PermId IS NOT NULL
                    BEGIN
                        IF NOT EXISTS (SELECT * FROM RolePermissions WHERE RoleId = @RoleId AND PermissionId = @PermId)
                        BEGIN
                            INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@RoleId, @PermId);
                            PRINT 'Granted ' + @Action;
                        END
                        ELSE PRINT @Action + ' already exists';
                    END
                    ELSE PRINT 'Permission ' + @Action + ' not found in DB';
                `);
        }

        console.log('Product Manager permissions updated successfully.');
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateProductManager();
