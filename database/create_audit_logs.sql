IF EXISTS (SELECT * FROM sysobjects WHERE name='AuditLogs' and xtype='U')
    DROP TABLE AuditLogs;

BEGIN
    CREATE TABLE AuditLogs (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        UserId INT NULL,
        Action NVARCHAR(50) NOT NULL,
        Entity NVARCHAR(50) NOT NULL,
        EntityId NVARCHAR(50) NULL,
        Details NVARCHAR(MAX) NULL,
        Timestamp DATETIME DEFAULT GETUTCDate(),
        FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE SET NULL
    );
END
