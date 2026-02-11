-- =====================================================
-- User Preferences Table for Theme and Other Settings
-- =====================================================
USE SalesProDB;
GO

-- Create UserPreferences table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[UserPreferences]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[UserPreferences](
        [Id] [INT] IDENTITY(1,1) NOT NULL PRIMARY KEY,
        [UserId] [INT] NOT NULL UNIQUE,
        [Theme] [NVARCHAR](20) DEFAULT 'light', -- 'light' or 'dark'
        [CreatedAt] [DATETIME] DEFAULT GETDATE(),
        [UpdatedAt] [DATETIME] DEFAULT GETDATE(),
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_userprefs_userid ON UserPreferences(UserId);
    
    PRINT 'UserPreferences table created successfully';
END
ELSE
BEGIN
    PRINT 'UserPreferences table already exists';
END
GO

-- Insert default preferences for existing users
INSERT INTO UserPreferences (UserId, Theme)
SELECT Id, 'light'
FROM Users
WHERE Id NOT IN (SELECT UserId FROM UserPreferences);

PRINT 'Default preferences created for existing users';
GO
