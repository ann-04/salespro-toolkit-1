-- =====================================================
-- Content Types for Sales Assets
-- =====================================================
USE SalesProDB;
GO

-- Create ContentTypes table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ContentTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[ContentTypes](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](100) NOT NULL UNIQUE,
        [Description] [NVARCHAR](255) NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_contenttype_name ON ContentTypes(Name);
    
    PRINT 'ContentTypes table created successfully';
END
ELSE
BEGIN
    PRINT 'ContentTypes table already exists';
END
GO

-- Create AssetFileContentTypes junction table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[AssetFileContentTypes]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[AssetFileContentTypes](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [FileId] [INT] NOT NULL,
        [ContentTypeId] [INT] NOT NULL,
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (FileId) REFERENCES AssetFiles(Id) ON DELETE CASCADE,
        FOREIGN KEY (ContentTypeId) REFERENCES ContentTypes(Id),
        CONSTRAINT UK_FileContentType UNIQUE (FileId, ContentTypeId)
    );
    
    CREATE INDEX idx_filecontenttype_file ON AssetFileContentTypes(FileId);
    CREATE INDEX idx_filecontenttype_type ON AssetFileContentTypes(ContentTypeId);
    
    PRINT 'AssetFileContentTypes junction table created successfully';
END
ELSE
BEGIN
    PRINT 'AssetFileContentTypes junction table already exists';
END
GO

-- Seed default content types
IF NOT EXISTS (SELECT * FROM ContentTypes)
BEGIN
    INSERT INTO ContentTypes (Name, Description) VALUES
    ('Datasheet', 'Product datasheets and specifications'),
    ('Whitepaper', 'Technical whitepapers and research documents'),
    ('Case Study', 'Customer case studies and success stories'),
    ('Presentation', 'Sales presentations and pitch decks'),
    ('Brochure', 'Marketing brochures and flyers'),
    ('Manual', 'User manuals and guides'),
    ('Video', 'Video content and recordings'),
    ('Infographic', 'Visual infographics and diagrams'),
    ('Template', 'Templates and boilerplates'),
    ('Report', 'Reports and analytics documents');
    
    PRINT 'Default content types seeded successfully';
END
ELSE
BEGIN
    PRINT 'Content types already exist, skipping seed';
END
GO

PRINT 'Content type schema setup complete!';
