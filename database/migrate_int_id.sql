USE [SalesProDB];
GO

-- 1. Drop existing Products table (Data will be lost as per user request to start fresh)
--    If we needed to keep data, we would create a new table, copy data, drop old, rename new.
--    But user is in dev mode.
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Products]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[Products];
END
GO

-- 2. Recreate Table with INT IDENTITY
CREATE TABLE [dbo].[Products](
    [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY, -- Auto-increment number
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
GO

PRINT 'Products table recreated with INT IDENTITY Id.'
