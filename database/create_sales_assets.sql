-- Create SalesAssets Table for Sales Assets Repository
USE SalesProDB;
GO

IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SalesAssets]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[SalesAssets](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Title] [NVARCHAR](255) NOT NULL,
        [OriginalFileName] [NVARCHAR](255) NOT NULL,
        [StoredFileName] [NVARCHAR](255) NOT NULL,
        [FileType] [NVARCHAR](50) NOT NULL, -- 'PDF', 'XLSX', 'FOLDER', 'OTHER'
        [FileSize] [BIGINT] NULL, -- Size in bytes
        [SalesStage] [NVARCHAR](100) NULL, -- 'Discovery', 'Proposal', 'Negotiation', etc.
        [Audience] [NVARCHAR](100) NULL, -- 'C-Level', 'Technical', 'Business', etc.
        [Category] [NVARCHAR](100) NULL, -- 'Deck', 'Case Study', 'Proposal', etc.
        [ExtractedText] [NVARCHAR](MAX) NULL, -- For PDF text extraction
        [Metadata] [NVARCHAR](MAX) NULL, -- JSON for additional metadata
        [UploadedBy] [INT] NULL, -- Foreign key to Users
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (UploadedBy) REFERENCES Users(Id)
    );

    -- Create indexes for efficient querying
    CREATE INDEX idx_filetype ON SalesAssets(FileType);
    CREATE INDEX idx_salesstage ON SalesAssets(SalesStage);
    CREATE INDEX idx_category ON SalesAssets(Category);
    CREATE INDEX idx_uploadedby ON SalesAssets(UploadedBy);

    PRINT 'SalesAssets table created successfully';
END
ELSE
BEGIN
    PRINT 'SalesAssets table already exists';
END
GO
