-- PostgreSQL Schema for SalesPro Toolkit
-- This schema is compatible with Supabase PostgreSQL

-- Users Table
CREATE TABLE IF NOT EXISTS "Users" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Email" VARCHAR(255) UNIQUE NOT NULL,
    "PasswordHash" VARCHAR(255),
    "Status" VARCHAR(20) DEFAULT 'PENDING',
    "MustChangePassword" BOOLEAN DEFAULT TRUE,
    "UserType" VARCHAR(20) DEFAULT 'INTERNAL',
    "PartnerCategory" VARCHAR(20),
    "RoleId" INTEGER,
    "BusinessUnitId" INTEGER,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "LastLogin" TIMESTAMP
);

-- Business Units Table
CREATE TABLE IF NOT EXISTS "BusinessUnits" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table
CREATE TABLE IF NOT EXISTS "Roles" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(50) UNIQUE NOT NULL,
    "Description" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS "Permissions" (
    "Id" SERIAL PRIMARY KEY,
    "Module" VARCHAR(50) NOT NULL,
    "Action" VARCHAR(50) NOT NULL,
    "Description" TEXT,
    UNIQUE("Module", "Action")
);

-- RolePermissions Junction Table
CREATE TABLE IF NOT EXISTS "RolePermissions" (
    "Id" SERIAL PRIMARY KEY,
    "RoleId" INTEGER NOT NULL REFERENCES "Roles"("Id") ON DELETE CASCADE,
    "PermissionId" INTEGER NOT NULL REFERENCES "Permissions"("Id") ON DELETE CASCADE,
    UNIQUE("RoleId", "PermissionId")
);

-- Products Table
CREATE TABLE IF NOT EXISTS "Products" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "BusinessUnitId" INTEGER REFERENCES "BusinessUnits"("Id") ON DELETE SET NULL,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Folders Table
CREATE TABLE IF NOT EXISTS "Folders" (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "ProductId" INTEGER REFERENCES "Products"("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Assets Table
CREATE TABLE IF NOT EXISTS "SalesAssets" (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "FileName" VARCHAR(255) NOT NULL,
    "StoredFileName" VARCHAR(255) NOT NULL,
    "FileType" VARCHAR(50),
    "FileSize" BIGINT,
    "FilePath" VARCHAR(500),
    "FolderId" INTEGER REFERENCES "Folders"("Id") ON DELETE CASCADE,
    "UploadedBy" INTEGER REFERENCES "Users"("Id"),
    "UploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Version" INTEGER DEFAULT 1,
    "VersionGroupId" VARCHAR(50),
    "IsLatestVersion" BOOLEAN DEFAULT TRUE,
    "Tags" TEXT,
    "ContentType" VARCHAR(100),
    "ExtractedText" TEXT
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS "AuditLogs" (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER REFERENCES "Users"("Id"),
    "Action" VARCHAR(100) NOT NULL,
    "EntityType" VARCHAR(50),
    "EntityId" VARCHAR(100),
    "Details" JSONB,
    "Timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "IpAddress" VARCHAR(45)
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS "AppSettings" (
    "Id" SERIAL PRIMARY KEY,
    "SettingKey" VARCHAR(100) UNIQUE NOT NULL,
    "SettingValue" TEXT,
    "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER REFERENCES "Users"("Id")
);

-- Add Foreign Key Constraints for Users
ALTER TABLE "Users" 
    ADD CONSTRAINT fk_users_role 
    FOREIGN KEY ("RoleId") REFERENCES "Roles"("Id") ON DELETE SET NULL;

ALTER TABLE "Users" 
    ADD CONSTRAINT fk_users_bu 
    FOREIGN KEY ("BusinessUnitId") REFERENCES "BusinessUnits"("Id") ON DELETE SET NULL;

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON "Users"("Email");
CREATE INDEX idx_users_status ON "Users"("Status");
CREATE INDEX idx_sales_assets_folder ON "SalesAssets"("FolderId");
CREATE INDEX idx_sales_assets_version_group ON "SalesAssets"("VersionGroupId");
CREATE INDEX idx_audit_logs_user ON "AuditLogs"("UserId");
CREATE INDEX idx_audit_logs_timestamp ON "AuditLogs"("Timestamp");

-- Success message
SELECT 'Schema created successfully!' as message;
