
import { connectToDatabase, sql } from './db.js';

async function setupRBAC() {
    try {
        const pool = await connectToDatabase();
        console.log("Connected to DB. forcing RBAC Schema Recreation...");

        // DROP Order: Child tables first
        console.log("Dropping existing tables...");
        await pool.request().query(`
            IF OBJECT_ID(N'[dbo].[RolePermissions]', N'U') IS NOT NULL DROP TABLE [dbo].[RolePermissions];
            IF OBJECT_ID(N'[dbo].[Permissions]', N'U') IS NOT NULL DROP TABLE [dbo].[Permissions];
            IF OBJECT_ID(N'[dbo].[Modules]', N'U') IS NOT NULL DROP TABLE [dbo].[Modules]; -- Drop this if it exists to avoid confusion
        `);

        // 1. Create Permissions Table (Simpler Schema)
        console.log("Creating Permissions table...");
        await pool.request().query(`
            CREATE TABLE [dbo].[Permissions](
                [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
                [Module] [NVARCHAR](50) NOT NULL,
                [Action] [NVARCHAR](50) NOT NULL,
                [Description] [NVARCHAR](255) NULL,
                CONSTRAINT UK_Permission UNIQUE (Module, Action)
            );
        `);

        // Seed Defaults
        console.log("Seeding Permissions...");
        await pool.request().query(`
            INSERT INTO [dbo].[Permissions] (Module, Action, Description) VALUES 
            ('PRODUCTS', 'CREATE', 'Can create new products'),
            ('PRODUCTS', 'UPDATE', 'Can edit existing products'),
            ('PRODUCTS', 'DELETE', 'Can delete products'),
            ('USERS', 'CREATE', 'Can create new users'),
            ('USERS', 'UPDATE', 'Can edit user details'),
            ('USERS', 'DELETE', 'Can delete users'),
            ('USERS', 'APPROVE', 'Can approve pending users'),
            ('ROLES', 'UPDATE', 'Can manage roles and permissions'),
            ('AUDIT', 'DELETE', 'Can delete audit logs');
        `);

        // 2. Create RolePermissions Table
        console.log("Creating RolePermissions table...");
        await pool.request().query(`
            CREATE TABLE [dbo].[RolePermissions](
                [RoleId] [INT] FOREIGN KEY REFERENCES [dbo].[Roles](Id) ON DELETE CASCADE,
                [PermissionId] [INT] FOREIGN KEY REFERENCES [dbo].[Permissions](Id) ON DELETE CASCADE,
                PRIMARY KEY (RoleId, PermissionId)
            );
        `);

        // 3. Seed Admin with ALL permissions
        console.log("Seeding Admin permissions...");
        const adminRole = await pool.request().query("SELECT Id FROM Roles WHERE Name = 'Admin'");
        if (adminRole.recordset.length > 0) {
            const adminId = adminRole.recordset[0].Id;
            await pool.request().input('RoleId', sql.Int, adminId).query(`
                INSERT INTO RolePermissions (RoleId, PermissionId)
                SELECT @RoleId, Id FROM Permissions
            `);
            console.log("Admin permissions ensured.");
        }

        console.log("RBAC Setup Complete.");

    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        process.exit(0);
    }
}

setupRBAC();
