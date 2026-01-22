USE [master]
GO

/* 
   Run this script in SQL Server Management Studio (SSMS) 
   Log in using "Windows Authentication" (your default admin account)
*/

-- 1. Create or Reset the Login 'sales_root' with password 'app@123'
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = N'sales_root')
BEGIN
    PRINT 'Creating login sales_root...'
    CREATE LOGIN [sales_root] WITH PASSWORD=N'app@123', DEFAULT_DATABASE=[master], CHECK_EXPIRATION=OFF, CHECK_POLICY=OFF
END
ELSE
BEGIN
    PRINT 'Resetting password for sales_root...'
    ALTER LOGIN [sales_root] WITH PASSWORD=N'app@123'
    ALTER LOGIN [sales_root] ENABLE
END
GO

-- 2. Grant System Administrator rights (Simplest for local development)
-- This ensures the user can create databases and tables without permission errors.
ALTER SERVER ROLE [sysadmin] ADD MEMBER [sales_root]
GO

PRINT 'Success! User sales_root is ready. You can now connect with password app@123'
