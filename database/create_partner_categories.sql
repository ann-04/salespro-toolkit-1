
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PartnerCategories' and xtype='U')
BEGIN
    CREATE TABLE PartnerCategories (
        Id INT IDENTITY(1,1) PRIMARY KEY,
        Name NVARCHAR(50) NOT NULL UNIQUE
    );
    INSERT INTO PartnerCategories (Name) VALUES ('Gold'), ('Silver'), ('Bronze');
END
