import { connectToDatabase, sql } from './db.js';

async function updateSchemaPartnersRefined() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        // 1. Add PartnerCategory column
        console.log('Checking PartnerCategory column...');
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND name = 'PartnerCategory')
            BEGIN
                ALTER TABLE [dbo].[Users] ADD [PartnerCategory] NVARCHAR(50) NULL;
                PRINT 'Added PartnerCategory column';
            END
        `);

        // 2. Create generic Partner Role
        console.log('Creating generic Partner role...');
        const roleName = 'Partner';
        await pool.request().input('Name', sql.NVarChar, roleName).query(`
            IF NOT EXISTS (SELECT * FROM Roles WHERE Name = @Name)
            INSERT INTO Roles (Name) VALUES (@Name)
        `);

        // 3. Remove old roles (Gold, Silver, Bronze)
        // Note: If users assigned, they might need migration. Assuming fresh dev state or minimal users.
        // We will Migrate them if they exist.
        const oldRoles = ['Partner Gold', 'Partner Silver', 'Partner Bronze'];

        // Get new Partner ID
        const pRes = await pool.request().input('Name', sql.NVarChar, roleName).query("SELECT Id FROM Roles WHERE Name = @Name");
        const partnerRoleId = pRes.recordset[0].Id;

        for (const oldRole of oldRoles) {
            const oldRes = await pool.request().input('Name', sql.NVarChar, oldRole).query("SELECT Id FROM Roles WHERE Name = @Name");
            const oldId = oldRes.recordset[0]?.Id;

            if (oldId) {
                // Update users to new role
                await pool.request()
                    .input('NewId', sql.Int, partnerRoleId)
                    .input('OldId', sql.Int, oldId)
                    .query("UPDATE Users SET RoleId = @NewId WHERE RoleId = @OldId");

                // Delete permissions
                await pool.request().input('RoleId', sql.Int, oldId).query("DELETE FROM RolePermissions WHERE RoleId = @RoleId");

                // Delete role
                await pool.request().input('RoleId', sql.Int, oldId).query("DELETE FROM Roles WHERE Id = @RoleId");
                console.log(`Migrated and Deleted role: ${oldRole}`);
            }
        }

        // 4. Assign READ permissions to generic Partner role
        const modRes = await pool.request().query("SELECT Id FROM Modules WHERE Name = 'Products'");
        const modId = modRes.recordset[0]?.Id;
        if (modId) {
            const permRes = await pool.request().input('ModId', sql.Int, modId).query("SELECT Id FROM Permissions WHERE ModuleId = @ModId AND Action = 'READ'");
            const readPermId = permRes.recordset[0]?.Id;
            if (readPermId) {
                await pool.request()
                    .input('RoleId', sql.Int, partnerRoleId)
                    .input('PermId', sql.Int, readPermId)
                    .query(`
                        IF NOT EXISTS (SELECT * FROM RolePermissions WHERE RoleId = @RoleId AND PermissionId = @PermId)
                        INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (@RoleId, @PermId);
                    `);
                console.log('Assigned READ permission to Partner role.');
            }
        }

        console.log('Partner Refinement complete.');
        process.exit(0);

    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

updateSchemaPartnersRefined();
