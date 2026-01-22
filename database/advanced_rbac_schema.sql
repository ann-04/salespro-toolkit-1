USE [SalesProDB];
GO

-- 1. Modules Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Modules]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Modules](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](100) NOT NULL UNIQUE
    );
    INSERT INTO [dbo].[Modules] (Name) VALUES 
    ('Sales'), 
    ('PreSales'), 
    ('Admin'), 
    ('Products'), 
    ('Users'),
    ('Reports');
END
GO

-- 2. Permissions Table (Module + Action)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Permissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Permissions](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [ModuleId] [INT] FOREIGN KEY REFERENCES [dbo].[Modules](Id),
        [Action] [NVARCHAR](20) NOT NULL, -- CREATE, READ, UPDATE, DELETE
        CONSTRAINT UK_Module_Action UNIQUE (ModuleId, Action)
    );
    
    -- Seed default permissions (CRUD for each module)
    INSERT INTO [dbo].[Permissions] (ModuleId, Action)
    SELECT Id, 'CREATE' FROM [dbo].[Modules];
    
    INSERT INTO [dbo].[Permissions] (ModuleId, Action)
    SELECT Id, 'READ' FROM [dbo].[Modules];
    
    INSERT INTO [dbo].[Permissions] (ModuleId, Action)
    SELECT Id, 'UPDATE' FROM [dbo].[Modules];
    
    INSERT INTO [dbo].[Permissions] (ModuleId, Action)
    SELECT Id, 'DELETE' FROM [dbo].[Modules];
END
GO

-- 3. Roles Table (Update or Recreate)
-- We will assume Roles table exists, we may need to drop Permissions column if we are replacing it with RolePermissions table
-- But to be safe, let's keep it simple.
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Roles](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](50) NOT NULL UNIQUE
    );
    INSERT INTO [dbo].[Roles] (Name) VALUES ('Admin'), ('Sales Manager'), ('Pre-Sales Engineer');
END
GO

-- 4. RolePermissions Table (Many-to-Many)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[RolePermissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[RolePermissions](
        [RoleId] [INT] FOREIGN KEY REFERENCES [dbo].[Roles](Id),
        [PermissionId] [INT] FOREIGN KEY REFERENCES [dbo].[Permissions](Id),
        PRIMARY KEY (RoleId, PermissionId)
    );

    -- Seed Admin with ALL Permissions
    INSERT INTO [dbo].[RolePermissions] (RoleId, PermissionId)
    SELECT r.Id, p.Id
    FROM [dbo].[Roles] r, [dbo].[Permissions] p
    WHERE r.Name = 'Admin';
    
    -- Seed Sales Manager with SALES permissions
    INSERT INTO [dbo].[RolePermissions] (RoleId, PermissionId)
    SELECT r.Id, p.Id
    FROM [dbo].[Roles] r
    JOIN [dbo].[Permissions] p ON p.ModuleId = (SELECT Id FROM [dbo].[Modules] WHERE Name = 'Sales')
    WHERE r.Name = 'Sales Manager';
END
GO

-- 5. Business Units Table (Existing)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BusinessUnits]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BusinessUnits](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](100) NOT NULL UNIQUE
    );
    INSERT INTO [dbo].[BusinessUnits] (Name) VALUES ('Sales'), ('Pre-Sales'), ('Cybersecurity'), ('Access');
END
GO

-- 6. Users Table (Modified for Active by default)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    -- We can keep existing table, but lets ensure Status defaults to ACTIVE for new logic
    -- Or just update the logic in backend.
    PRINT 'Users table exists. Ensure Logic handles ACTIVE status.';
END
ELSE
BEGIN
    CREATE TABLE [dbo].[Users](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](100) NOT NULL,
        [Email] [NVARCHAR](150) NOT NULL UNIQUE,
        [PasswordHash] [NVARCHAR](255) NULL,
        [Status] [NVARCHAR](20) DEFAULT 'ACTIVE', -- ADMIN CREATED = ACTIVE
        [MustChangePassword] [BIT] DEFAULT 1,
        [RoleId] [INT] NULL FOREIGN KEY REFERENCES [dbo].[Roles](Id),
        [BusinessUnitId] [INT] NULL FOREIGN KEY REFERENCES [dbo].[BusinessUnits](Id),
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [LastLogin] [DATETIME] NULL
    );
     -- Seed Admin
    INSERT INTO [dbo].[Users] (Name, Email, Status, PasswordHash, MustChangePassword, RoleId)
    SELECT 'System Admin', 'admin@technobind.com', 'ACTIVE', '$2b$10$YourHashedPasswordHere', 0, Id FROM [dbo].[Roles] WHERE Name = 'Admin';
END
GO

PRINT 'Advanced RBAC Schema Applied.'
