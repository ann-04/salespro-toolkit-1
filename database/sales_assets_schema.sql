-- =====================================================
-- Sales Assets Repository - Hierarchical Schema
-- Business Units → Products → Folders → Files
-- =====================================================
USE SalesProDB;
GO

-- =====================================================
-- 1. DROP OLD TABLE
-- =====================================================
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalesAssets]') AND type in (N'U'))
BEGIN
    DROP TABLE [dbo].[SalesAssets];
    PRINT 'Old SalesAssets table dropped successfully';
END
GO

-- =====================================================
-- 2. ASSET BUSINESS UNITS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetBusinessUnits]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetBusinessUnits](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](255) NOT NULL,
        [Description] [NVARCHAR](MAX) NULL,
        [IsDeleted] [BIT] DEFAULT 0,
        [CreatedBy] [INT] NULL,
        [UpdatedBy] [INT] NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
        FOREIGN KEY (UpdatedBy) REFERENCES Users(Id)
    );
    
    CREATE INDEX idx_assetbu_name ON AssetBusinessUnits(Name);
    CREATE INDEX idx_assetbu_deleted ON AssetBusinessUnits(IsDeleted);
    
    PRINT 'AssetBusinessUnits table created successfully';
END
GO

-- =====================================================
-- 3. ASSET PRODUCTS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetProducts]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetProducts](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [BusinessUnitId] [INT] NOT NULL,
        [Name] [NVARCHAR](255) NOT NULL,
        [Description] [NVARCHAR](MAX) NULL,
        [IsDeleted] [BIT] DEFAULT 0,
        [CreatedBy] [INT] NULL,
        [UpdatedBy] [INT] NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (BusinessUnitId) REFERENCES AssetBusinessUnits(Id),
        FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
        FOREIGN KEY (UpdatedBy) REFERENCES Users(Id)
    );
    
    CREATE INDEX idx_assetproduct_bu ON AssetProducts(BusinessUnitId);
    CREATE INDEX idx_assetproduct_name ON AssetProducts(Name);
    CREATE INDEX idx_assetproduct_deleted ON AssetProducts(IsDeleted);
    
    PRINT 'AssetProducts table created successfully';
END
GO

-- =====================================================
-- 4. ASSET FOLDERS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetFolders]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetFolders](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [ProductId] [INT] NOT NULL,
        [Name] [NVARCHAR](255) NOT NULL,
        [Description] [NVARCHAR](MAX) NULL,
        [IsDeleted] [BIT] DEFAULT 0,
        [CreatedBy] [INT] NULL,
        [UpdatedBy] [INT] NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (ProductId) REFERENCES AssetProducts(Id),
        FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
        FOREIGN KEY (UpdatedBy) REFERENCES Users(Id)
    );
    
    CREATE INDEX idx_assetfolder_product ON AssetFolders(ProductId);
    CREATE INDEX idx_assetfolder_name ON AssetFolders(Name);
    CREATE INDEX idx_assetfolder_deleted ON AssetFolders(IsDeleted);
    
    PRINT 'AssetFolders table created successfully';
END
GO

-- =====================================================
-- 5. ASSET FILES TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetFiles]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetFiles](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [FolderId] [INT] NOT NULL,
        [Title] [NVARCHAR](255) NOT NULL,
        [OriginalFileName] [NVARCHAR](255) NOT NULL,
        [StoredFileName] [NVARCHAR](255) NOT NULL,
        [FileType] [NVARCHAR](50) NOT NULL, -- 'PDF', 'XLSX', 'DOCX', 'PPTX', etc.
        [FileSize] [BIGINT] NULL, -- Size in bytes
        [StoragePath] [NVARCHAR](500) NULL, -- Full storage path
        [Description] [NVARCHAR](MAX) NULL,
        [IsDeleted] [BIT] DEFAULT 0,
        [CreatedBy] [INT] NULL,
        [UpdatedBy] [INT] NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (FolderId) REFERENCES AssetFolders(Id),
        FOREIGN KEY (CreatedBy) REFERENCES Users(Id),
        FOREIGN KEY (UpdatedBy) REFERENCES Users(Id)
    );
    
    CREATE INDEX idx_assetfile_folder ON AssetFiles(FolderId);
    CREATE INDEX idx_assetfile_type ON AssetFiles(FileType);
    CREATE INDEX idx_assetfile_deleted ON AssetFiles(IsDeleted);
    CREATE INDEX idx_assetfile_title ON AssetFiles(Title);
    
    PRINT 'AssetFiles table created successfully';
END
GO

-- =====================================================
-- 6. ASSET FILE TAGS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetFileTags]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetFileTags](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [FileId] [INT] NOT NULL,
        [TagName] [NVARCHAR](100) NOT NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (FileId) REFERENCES AssetFiles(Id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_assetfiletag_file ON AssetFileTags(FileId);
    CREATE INDEX idx_assetfiletag_name ON AssetFileTags(TagName);
    
    PRINT 'AssetFileTags table created successfully';
END
GO

-- =====================================================
-- 7. ASSET FILE METADATA TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetFileMetadata]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetFileMetadata](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [FileId] [INT] NOT NULL,
        [MetaKey] [NVARCHAR](100) NOT NULL,
        [MetaValue] [NVARCHAR](MAX) NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (FileId) REFERENCES AssetFiles(Id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_assetfilemeta_file ON AssetFileMetadata(FileId);
    CREATE INDEX idx_assetfilemeta_key ON AssetFileMetadata(MetaKey);
    
    PRINT 'AssetFileMetadata table created successfully';
END
GO

-- =====================================================
-- 8. ASSET PERMISSIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetPermissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetPermissions](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [ResourceType] [NVARCHAR](50) NOT NULL, -- 'BUSINESS_UNIT', 'PRODUCT', 'FOLDER', 'FILE'
        [Action] [NVARCHAR](20) NOT NULL, -- 'CREATE', 'READ', 'UPDATE', 'DELETE'
        [PermissionCode] [NVARCHAR](100) NOT NULL UNIQUE, -- e.g., 'ASSET_BU_CREATE'
        [Description] [NVARCHAR](255) NULL
    );
    
    -- Seed Asset Permissions
    INSERT INTO [dbo].[AssetPermissions] (ResourceType, Action, PermissionCode, Description) VALUES
    -- Business Unit Permissions
    ('BUSINESS_UNIT', 'CREATE', 'ASSET_BU_CREATE', 'Create new business units'),
    ('BUSINESS_UNIT', 'READ', 'ASSET_BU_READ', 'View business units'),
    ('BUSINESS_UNIT', 'UPDATE', 'ASSET_BU_UPDATE', 'Edit business units'),
    ('BUSINESS_UNIT', 'DELETE', 'ASSET_BU_DELETE', 'Delete business units'),
    
    -- Product Permissions
    ('PRODUCT', 'CREATE', 'ASSET_PRODUCT_CREATE', 'Create new products'),
    ('PRODUCT', 'READ', 'ASSET_PRODUCT_READ', 'View products'),
    ('PRODUCT', 'UPDATE', 'ASSET_PRODUCT_UPDATE', 'Edit products'),
    ('PRODUCT', 'DELETE', 'ASSET_PRODUCT_DELETE', 'Delete products'),
    
    -- Folder Permissions
    ('FOLDER', 'CREATE', 'ASSET_FOLDER_CREATE', 'Create new folders'),
    ('FOLDER', 'READ', 'ASSET_FOLDER_READ', 'View folders'),
    ('FOLDER', 'UPDATE', 'ASSET_FOLDER_UPDATE', 'Edit folders'),
    ('FOLDER', 'DELETE', 'ASSET_FOLDER_DELETE', 'Delete folders'),
    
    -- File Permissions
    ('FILE', 'CREATE', 'ASSET_FILE_CREATE', 'Upload new files'),
    ('FILE', 'READ', 'ASSET_FILE_READ', 'View and download files'),
    ('FILE', 'UPDATE', 'ASSET_FILE_UPDATE', 'Edit file metadata'),
    ('FILE', 'DELETE', 'ASSET_FILE_DELETE', 'Delete files'),
    
    -- Admin Permission
    ('ADMIN', 'MANAGE', 'ASSET_PERMISSIONS_MANAGE', 'Manage asset permissions');
    
    PRINT 'AssetPermissions table created and seeded successfully';
END
GO

-- =====================================================
-- 9. USER ASSET PERMISSIONS TABLE
-- =====================================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserAssetPermissions]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserAssetPermissions](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] [INT] NOT NULL,
        [PermissionId] [INT] NOT NULL,
        [GrantedBy] [INT] NULL,
        [GrantedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE,
        FOREIGN KEY (PermissionId) REFERENCES AssetPermissions(Id),
        FOREIGN KEY (GrantedBy) REFERENCES Users(Id),
        CONSTRAINT UK_UserAssetPermission UNIQUE (UserId, PermissionId)
    );
    
    CREATE INDEX idx_userassetperm_user ON UserAssetPermissions(UserId);
    CREATE INDEX idx_userassetperm_permission ON UserAssetPermissions(PermissionId);
    
    PRINT 'UserAssetPermissions table created successfully';
END
GO

-- =====================================================
-- 10. GRANT ADMIN FULL PERMISSIONS
-- =====================================================
-- Grant all asset permissions to Admin role users
DECLARE @AdminRoleId INT;
SELECT @AdminRoleId = Id FROM Roles WHERE Name = 'Admin';

IF @AdminRoleId IS NOT NULL
BEGIN
    -- Get all admin users
    INSERT INTO UserAssetPermissions (UserId, PermissionId, GrantedBy)
    SELECT u.Id, ap.Id, NULL
    FROM Users u
    CROSS JOIN AssetPermissions ap
    WHERE u.RoleId = @AdminRoleId
    AND NOT EXISTS (
        SELECT 1 FROM UserAssetPermissions uap 
        WHERE uap.UserId = u.Id AND uap.PermissionId = ap.Id
    );
    
    PRINT 'Admin users granted all asset permissions';
END
GO

-- =====================================================
-- 11. SEED SAMPLE DATA (Optional)
-- =====================================================
-- Create sample Business Units
IF NOT EXISTS (SELECT * FROM AssetBusinessUnits WHERE Name = 'Sales')
BEGIN
    INSERT INTO AssetBusinessUnits (Name, Description) VALUES
    ('Sales', 'Sales department assets'),
    ('Pre-Sales', 'Pre-sales and technical assets'),
    ('Marketing', 'Marketing materials and collateral'),
    ('Product Management', 'Product documentation and specs');
    
    PRINT 'Sample Business Units created';
END
GO

PRINT '✅ Sales Assets Repository Schema Applied Successfully!';
PRINT 'Tables Created:';
PRINT '  - AssetBusinessUnits';
PRINT '  - AssetProducts';
PRINT '  - AssetFolders';
PRINT '  - AssetFiles';
PRINT '  - AssetFileTags';
PRINT '  - AssetFileMetadata';
PRINT '  - AssetPermissions';
PRINT '  - UserAssetPermissions';
GO
