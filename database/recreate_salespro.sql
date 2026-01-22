USE [master]
GO

-- Forcefully remove the login if it exists, to clear any broken state
IF EXISTS (SELECT * FROM sys.server_principals WHERE name = N'salesPro')
BEGIN
    PRINT 'Dropping existing salesPro login...'
    DROP LOGIN [salesPro]
END
GO

-- Create it fresh
PRINT 'Creating salesPro login...'
CREATE LOGIN [salesPro] WITH PASSWORD=N'app123', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
GO

-- Grant Admin rights
ALTER SERVER ROLE [sysadmin] ADD MEMBER [salesPro]
GO

PRINT 'User salesPro has been completely recreated on: ' + @@SERVERNAME
