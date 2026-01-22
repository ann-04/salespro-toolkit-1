
import { connectToDatabase, sql } from './db.js';

async function seedGranularPermissions() {
    try {
        const pool = await connectToDatabase();
        console.log("Seeding Granular Permissions...");

        const newPerms = [
            { module: 'ROLES', action: 'CREATE', desc: 'Can create new roles' },
            { module: 'ROLES', action: 'DELETE', desc: 'Can delete roles' },
            { module: 'DEPARTMENTS', action: 'VIEW', desc: 'Can view departments' },
            { module: 'DEPARTMENTS', action: 'MANAGE', desc: 'Can create/edit/delete departments' },
            { module: 'CATEGORIES', action: 'MANAGE', desc: 'Can manage partner categories' }
        ];

        for (const p of newPerms) {
            try {
                await pool.request()
                    .input('Module', sql.NVarChar, p.module)
                    .input('Action', sql.NVarChar, p.action)
                    .input('Desc', sql.NVarChar, p.desc)
                    .query(`
                        IF NOT EXISTS (SELECT * FROM Permissions WHERE Module = @Module AND Action = @Action)
                        BEGIN
                            INSERT INTO Permissions (Module, Action, Description) VALUES (@Module, @Action, @Desc)
                            PRINT 'Inserted: ' + @Module + '_' + @Action
                        END
                    `);
            } catch (err) {
                console.warn(`Failed to insert ${p.module}_${p.action}`, err.message);
            }
        }

        // Auto-assign new permissions to Admin
        console.log("Updating Admin permissions...");
        const adminRole = await pool.request().query("SELECT Id FROM Roles WHERE Name = 'Admin'");
        if (adminRole.recordset.length > 0) {
            const adminId = adminRole.recordset[0].Id;
            await pool.request().input('RoleId', sql.Int, adminId).query(`
                INSERT INTO RolePermissions (RoleId, PermissionId)
                SELECT @RoleId, Id FROM Permissions
                WHERE Id NOT IN (SELECT PermissionId FROM RolePermissions WHERE RoleId = @RoleId)
            `);
        }

        console.log("Done.");

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

seedGranularPermissions();
