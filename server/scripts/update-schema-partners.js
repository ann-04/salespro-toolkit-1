import { connectToDatabase, sql } from './db.js';

async function updateSchemaForPartners() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        // 1. Add UserType column if not exists
        console.log('Checking UserType column...');
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'UserType')
                BEGIN
                    ALTER TABLE [dbo].[Users] ADD [UserType] NVARCHAR(50) DEFAULT 'INTERNAL';
                    PRINT 'Added UserType column';
                END
                ELSE PRINT 'UserType column already exists';
            `);
        } catch (err) {
            console.error('Column error:', err.message);
        }

        // 2. Create Partner Roles
        const newRoles = ['Partner Gold', 'Partner Silver', 'Partner Bronze'];
        for (const role of newRoles) {
            await pool.request().input('Name', sql.NVarChar, role).query(`
                IF NOT EXISTS (SELECT * FROM Roles WHERE Name = @Name)
                INSERT INTO Roles (Name) VALUES (@Name)
            `);
        }
        console.log('Partner Roles ensured.');

        // 3. Assign Default READ permissions to Partners (Same as Pre-Sales roughly)
        // They can READ Products.
        const modRes = await pool.request().query("SELECT Id FROM Modules WHERE Name = 'Products'");
        const modId = modRes.recordset[0]?.Id;

        if (modId) {
            const permRes = await pool.request().input('ModId', sql.Int, modId).query("SELECT Id FROM Permissions WHERE ModuleId = @ModId AND Action = 'READ'");
            const readPermId = permRes.recordset[0]?.Id;

            if (readPermId) {
                for (const role of newRoles) {
                    await pool.request()
                        .input('RoleName', sql.NVarChar, role)
                        .input('PermId', sql.Int, readPermId)
                        .query(`
                            DECLARE @RoleId INT = (SELECT Id FROM Roles WHERE Name = @RoleName);
                            IF NOT EXISTS (SELECT * FROM RolePermissions WHERE RoleId = @RoleId AND PermissionId = @PermId)
                            INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@RoleId, @PermId);
                        `);
                }
                console.log('Assigned READ permissions to Partners.');
            }
        }

        console.log('Partner Schema update complete.');
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateSchemaForPartners();
