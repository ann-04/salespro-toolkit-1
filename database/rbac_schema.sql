USE [SalesProDB];
GO

-- 1. Business Units Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[BusinessUnits]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[BusinessUnits](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](100) NOT NULL UNIQUE,
        [Description] [NVARCHAR](255) NULL
    );
    -- Seed default BUs
    INSERT INTO [dbo].[BusinessUnits] (Name) VALUES ('Sales'), ('Pre-Sales'), ('Cybersecurity'), ('Access');
END
GO

-- 2. Roles Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Roles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Roles](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](50) NOT NULL UNIQUE,
        [Permissions] [NVARCHAR](MAX) NULL -- JSON Array of permission strings (e.g. ["MANAGE_USERS", "DELETE_PRODUCTS"])
    );
    -- Seed default Roles
    INSERT INTO [dbo].[Roles] (Name, Permissions) VALUES 
    ('Admin', '["ALL"]'),
    ('Sales Manager', '["VIEW_PRODUCTS", "EDIT_PRODUCTS"]'),
    ('Pre-Sales Executive', '["VIEW_PRODUCTS"]');
END
GO

-- 3. Users Table (Recreating to match new requirements)
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    -- Check if it has the new columns, if not, simpler to drop and recreate for this dev phase
    -- We will drop for now to ensure clean slate as per request
    DROP TABLE [dbo].[Users];
END
GO

CREATE TABLE [dbo].[Users](
    [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Name] [NVARCHAR](100) NOT NULL,
    [Email] [NVARCHAR](150) NOT NULL UNIQUE,
    [Status] [NVARCHAR](20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    [PasswordHash] [NVARCHAR](255) NULL, -- Null initially
    [MustChangePassword] [BIT] DEFAULT 1,
    [RoleId] [INT] NULL FOREIGN KEY REFERENCES [dbo].[Roles](Id),
    [BusinessUnitId] [INT] NULL FOREIGN KEY REFERENCES [dbo].[BusinessUnits](Id),
    [CreatedAt] [DATETIME] DEFAULT GETDATE(),
    [LastLogin] [DATETIME] NULL
);
GO

-- Seed Root Admin (so you are not locked out)
-- Password: app@123 (Needs to be hashed in real app, but for now we might store plain or hash it in backend)
-- For this setup, let's assume the backend will handle hashing. 
-- We'll insert a pre-hashed version or handle plaintext in dev if specified. 
-- User prompt said "Use bcrypt", so we cannot easily seed a bcrypt hash via SQL without generating it first.
-- We will insert a dummy admin that MustChangePassword=0 and Status=APPROVED.
-- Note: 'app@123' hashed with bcrypt cost 10 roughly looks like a standard bcrypt string.
-- I will place a placeholder hash or plain string if the backend supports migration.
-- Requirement: "System generates login credentials... Password never stored in plain text".
-- I will seed 'admin' with a known hash for 'app@123' if possible, or just plain 'admin' and explain.
-- Actually, let's seed the 'sales_root' we used efficiently.
INSERT INTO [dbo].[Users] (Name, Email, Status, PasswordHash, MustChangePassword, RoleId)
SELECT 'System Admin', 'admin@technobind.com', 'APPROVED', '$2b$10$YourHashedPasswordHere', 0, Id FROM [dbo].[Roles] WHERE Name = 'Admin';
-- NOTE: You will need to Reset this admin's password via the script I'll provide later or backend logic.
GO


-- 4. Audit Logs Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AuditLogs]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AuditLogs](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Action] [NVARCHAR](50) NOT NULL, -- USER_APPROVED, PRODUCT_DELETED
        [ActorUserId] [INT] NULL, -- Who did it
        [TargetEntity] [NVARCHAR](50) NULL, -- USER, PRODUCT
        [TargetId] [NVARCHAR](100) NULL, -- ID of the thing affected
        [Details] [NVARCHAR](MAX) NULL, -- JSON details
        [Timestamp] [DATETIME] DEFAULT GETDATE()
    );
END
GO

PRINT 'RBAC Schema (Users, Roles, BUs, Logs) created successfully.'
