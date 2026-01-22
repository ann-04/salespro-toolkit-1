USE [master]
GO

-- Run this on the server: ANN\SQLEXPRESS

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'salesPro')
BEGIN
    PRINT 'Creating login salesPro...'
    CREATE LOGIN [salesPro] WITH PASSWORD=N'app123', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
END
ELSE
BEGIN
    PRINT 'Login salesPro exists. Updating password...'
    ALTER LOGIN [salesPro] WITH PASSWORD=N'app123'
    ALTER LOGIN [salesPro] ENABLE
END
GO

ALTER SERVER ROLE [sysadmin] ADD MEMBER [salesPro]
GO

PRINT 'User salesPro created/updated on ' + @@SERVERNAME
