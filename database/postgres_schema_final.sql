-- PostgreSQL Schema for SalesPro Toolkit
-- Lowercase table names, PascalCase column names (matching backend expectations)

-- Drop everything first
DROP TABLE IF EXISTS auditlogs CASCADE;
DROP TABLE IF EXISTS salesassets CASCADE;
DROP TABLE IF EXISTS folders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS rolepermissions CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS businessunits CASCADE;
DROP TABLE IF EXISTS appsettings CASCADE;

-- Users Table
CREATE TABLE users (
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
CREATE TABLE businessunits (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(100) NOT NULL,
    "Description" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table
CREATE TABLE roles (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(50) UNIQUE NOT NULL,
    "Description" TEXT,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE permissions (
    "Id" SERIAL PRIMARY KEY,
    "Module" VARCHAR(50) NOT NULL,
    "Action" VARCHAR(50) NOT NULL,
    "Description" TEXT,
    UNIQUE("Module", "Action")
);

-- RolePermissions Junction Table
CREATE TABLE rolepermissions (
    "Id" SERIAL PRIMARY KEY,
    "RoleId" INTEGER NOT NULL REFERENCES roles("Id") ON DELETE CASCADE,
    "PermissionId" INTEGER NOT NULL REFERENCES permissions("Id") ON DELETE CASCADE,
    UNIQUE("RoleId", "PermissionId")
);

-- Products Table
CREATE TABLE products (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "BusinessUnitId" INTEGER REFERENCES businessunits("Id") ON DELETE SET NULL,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Folders Table
CREATE TABLE folders (
    "Id" SERIAL PRIMARY KEY,
    "Name" VARCHAR(255) NOT NULL,
    "ProductId" INTEGER REFERENCES products("Id") ON DELETE CASCADE,
    "CreatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Assets Table
CREATE TABLE salesassets (
    "Id" SERIAL PRIMARY KEY,
    "Title" VARCHAR(255) NOT NULL,
    "Description" TEXT,
    "FileName" VARCHAR(255) NOT NULL,
    "StoredFileName" VARCHAR(255) NOT NULL,
    "FileType" VARCHAR(50),
    "FileSize" BIGINT,
    "FilePath" VARCHAR(500),
    "FolderId" INTEGER REFERENCES folders("Id") ON DELETE CASCADE,
    "UploadedBy" INTEGER REFERENCES users("Id"),
    "UploadedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "Version" INTEGER DEFAULT 1,
    "VersionGroupId" VARCHAR(50),
    "IsLatestVersion" BOOLEAN DEFAULT TRUE,
    "Tags" TEXT,
    "ContentType" VARCHAR(100),
    "ExtractedText" TEXT
);

-- Audit Logs Table
CREATE TABLE auditlogs (
    "Id" SERIAL PRIMARY KEY,
    "UserId" INTEGER REFERENCES users("Id"),
    "Action" VARCHAR(100) NOT NULL,
    "Entity" VARCHAR(50),
    "EntityId" VARCHAR(100),
    "Details" TEXT,
    "Timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- App Settings Table
CREATE TABLE appsettings (
    "Id" SERIAL PRIMARY KEY,
    "SettingKey" VARCHAR(100) UNIQUE NOT NULL,
    "SettingValue" TEXT,
    "UpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "UpdatedBy" INTEGER REFERENCES users("Id")
);

-- Add Foreign Key Constraints for Users
ALTER TABLE users 
    ADD CONSTRAINT fk_users_role 
    FOREIGN KEY ("RoleId") REFERENCES roles("Id") ON DELETE SET NULL;

ALTER TABLE users 
    ADD CONSTRAINT fk_users_bu 
    FOREIGN KEY ("BusinessUnitId") REFERENCES businessunits("Id") ON DELETE SET NULL;

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON users("Email");
CREATE INDEX idx_users_status ON users("Status");
CREATE INDEX idx_sales_assets_folder ON salesassets("FolderId");
CREATE INDEX idx_sales_assets_version_group ON salesassets("VersionGroupId");
CREATE INDEX idx_audit_logs_user ON auditlogs("UserId");
CREATE INDEX idx_audit_logs_timestamp ON auditlogs("Timestamp");

-- Insert Admin Role
INSERT INTO roles ("Name", "Description") 
VALUES ('Admin', 'Full system access')
ON CONFLICT ("Name") DO NOTHING;

-- Insert Permissions
INSERT INTO permissions ("Module", "Action", "Description") VALUES
('USERS', 'VIEW', 'View users'),
('USERS', 'CREATE', 'Create users'),
('USERS', 'MANAGE', 'Manage users'),
('BU', 'VIEW', 'View business units'),
('BU', 'MANAGE', 'Manage business units'),
('ROLES', 'VIEW', 'View roles'),
('ROLES', 'MANAGE', 'Manage roles'),
('PRODUCTS', 'VIEW', 'View products'),
('PRODUCTS', 'MANAGE', 'Manage products'),
('ASSETS', 'VIEW', 'View sales assets'),
('ASSETS', 'UPLOAD', 'Upload sales assets'),
('ASSETS', 'MANAGE', 'Manage sales assets'),
('DEPARTMENTS', 'VIEW', 'View departments'),
('DEPARTMENTS', 'MANAGE', 'Manage departments'),
('CATEGORIES', 'VIEW', 'View categories'),
('CATEGORIES', 'MANAGE', 'Manage categories')
ON CONFLICT ("Module", "Action") DO NOTHING;

-- Grant all permissions to Admin role
INSERT INTO rolepermissions ("RoleId", "PermissionId")
SELECT 1, "Id" FROM permissions
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- Create Admin User
-- Email: admin@salespro.com
-- Password: Admin@123
INSERT INTO users ("Name", "Email", "PasswordHash", "Status", "MustChangePassword", "RoleId", "UserType")
VALUES (
    'System Admin',
    'admin@salespro.com',
    '$2b$10$391JvKMKBOy.Hh2Q0GdY/OxooGhrR8OAieiL41qKK.1ozNdU/.6dq',
    'APPROVED',
    FALSE,
    1,
    'INTERNAL'
)
ON CONFLICT ("Email") DO UPDATE SET 
    "PasswordHash" = EXCLUDED."PasswordHash",
    "Status" = EXCLUDED."Status",
    "RoleId" = EXCLUDED."RoleId";

-- Verify
SELECT "Id", "Name", "Email", "Status", "RoleId", 
       CASE WHEN "PasswordHash" IS NULL THEN 'NO PASSWORD' ELSE 'PASSWORD SET' END as password_status
FROM users 
WHERE "Email" = 'admin@salespro.com';

SELECT 'Schema created successfully! Login with admin@salespro.com / Admin@123' as message;
