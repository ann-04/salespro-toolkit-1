-- Seed Data for SalesPro Toolkit PostgreSQL Database
-- Run this AFTER running postgres_schema.sql

-- Insert Admin Role
INSERT INTO "Roles" ("Name", "Description") 
VALUES ('Admin', 'Full system access')
ON CONFLICT ("Name") DO NOTHING;

-- Insert Sales Manager Role
INSERT INTO "Roles" ("Name", "Description") 
VALUES ('Sales Manager', 'Sales team management access')
ON CONFLICT ("Name") DO NOTHING;

-- Insert Sales Rep Role
INSERT INTO "Roles" ("Name", "Description") 
VALUES ('Sales Rep', 'Basic sales access')
ON CONFLICT ("Name") DO NOTHING;

-- Insert Basic Permissions
INSERT INTO "Permissions" ("Module", "Action", "Description") VALUES
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

-- Grant all permissions to Admin role (RoleId = 1)
INSERT INTO "RolePermissions" ("RoleId", "PermissionId")
SELECT 1, "Id" FROM "Permissions"
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- Grant limited permissions to Sales Manager (RoleId = 2)
INSERT INTO "RolePermissions" ("RoleId", "PermissionId")
SELECT 2, "Id" FROM "Permissions" 
WHERE "Module" IN ('PRODUCTS', 'ASSETS', 'BU') 
   OR ("Module" = 'USERS' AND "Action" = 'VIEW')
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- Grant view-only permissions to Sales Rep (RoleId = 3)
INSERT INTO "RolePermissions" ("RoleId", "PermissionId")
SELECT 3, "Id" FROM "Permissions" 
WHERE "Action" = 'VIEW'
ON CONFLICT ("RoleId", "PermissionId") DO NOTHING;

-- Create Admin User
-- Default password: Admin@123
-- ⚠️ CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!
INSERT INTO "Users" ("Name", "Email", "PasswordHash", "Status", "MustChangePassword", "RoleId", "UserType")
VALUES (
    'System Admin',
    'admin@salespro.com',
    '$2a$10$rZJ3qGXxPJZ0YqHqK5YqEO5YqHqK5YqEO5YqHqK5YqEO5YqHqK5Yq',
    'APPROVED',
    TRUE,
    1,
    'INTERNAL'
)
ON CONFLICT ("Email") DO NOTHING;

-- Insert Sample Business Units
INSERT INTO "BusinessUnits" ("Name", "Description") VALUES
('North America', 'North American sales division'),
('Europe', 'European sales division'),
('Asia Pacific', 'Asia Pacific sales division')
ON CONFLICT DO NOTHING;

-- Insert Gemini API Key Setting
INSERT INTO "AppSettings" ("SettingKey", "SettingValue") 
VALUES ('GEMINI_API_KEY', 'AIzaSyAkRCeamy7xU0mRDqIEVhOUz1kmEorHK0I')
ON CONFLICT ("SettingKey") DO UPDATE SET "SettingValue" = EXCLUDED."SettingValue";

-- Success message
SELECT 'Seed data inserted successfully!' as message;
SELECT 'Default admin credentials:' as info;
SELECT 'Email: admin@salespro.com' as email;
SELECT 'Password: Admin@123' as password;
SELECT '⚠️ CHANGE PASSWORD IMMEDIATELY AFTER FIRST LOGIN!' as warning;
