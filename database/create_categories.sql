IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Categories]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Categories](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [Name] [NVARCHAR](255) NOT NULL UNIQUE,
        [CreatedAt] [DATETIME] DEFAULT GETDATE()
    );
END
