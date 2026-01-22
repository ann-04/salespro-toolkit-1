-- Create Database (if not exists, usually run manually)
-- CREATE DATABASE SalesProDB;

USE SalesProDB;
GO

-- Products Table
-- Stores all product details. Complex arrays are stored as JSON for simplicity, 
-- though properly normalized tables (ProductCapabilities, ProductICP, etc.) are an option.
-- Given the requirement is "CRUD" and the data usage is read-heavy for display, JSON is efficient.

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Products]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Products](
        [Id] [NVARCHAR](100) NOT NULL PRIMARY KEY, -- Using String ID to match frontend 'seclore-drm' style or UUID
        [Name] [NVARCHAR](255) NOT NULL,
        [Category] [NVARCHAR](255) NOT NULL,
        [Description] [NVARCHAR](MAX) NULL,
        [ProblemSolved] [NVARCHAR](MAX) NULL,
        [ItLandscape] [NVARCHAR](MAX) NULL, -- JSON Array
        [DeploymentModels] [NVARCHAR](MAX) NULL, -- JSON Array
        [Licensing] [NVARCHAR](255) NULL,
        [PricingBand] [NVARCHAR](100) NULL,
        [NotToSell] [NVARCHAR](MAX) NULL, -- JSON Array
        [Capabilities] [NVARCHAR](MAX) NULL, -- JSON Array of Objects
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE()
    );
END
GO

-- Users Table (for Admin Access)
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Users]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Users](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Username] [NVARCHAR](50) NOT NULL UNIQUE,
        [PasswordHash] [NVARCHAR](255) NOT NULL, -- In real app, hash this.
        [Role] [NVARCHAR](20) DEFAULT 'Admin',
        [CreatedAt] [DATETIME] DEFAULT GETDATE()
    );

    -- Seed generic admin user
    IF NOT EXISTS (SELECT * FROM [dbo].[Users] WHERE Username = 'admin')
    BEGIN
        INSERT INTO [dbo].[Users] (Username, PasswordHash) VALUES ('admin', 'admin123');
    END
END
GO
