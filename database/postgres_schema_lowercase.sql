-- PostgreSQL Schema for SalesPro Toolkit (Lowercase table names for compatibility)

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    passwordhash VARCHAR(255),
    status VARCHAR(20) DEFAULT 'PENDING',
    mustchangepassword BOOLEAN DEFAULT TRUE,
    usertype VARCHAR(20) DEFAULT 'INTERNAL',
    partnercategory VARCHAR(20),
    roleid INTEGER,
    businessunitid INTEGER,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastlogin TIMESTAMP
);

-- Business Units Table
CREATE TABLE IF NOT EXISTS businessunits (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    description TEXT,
    UNIQUE(module, action)
);

-- RolePermissions Junction Table
CREATE TABLE IF NOT EXISTS rolepermissions (
    id SERIAL PRIMARY KEY,
    roleid INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permissionid INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(roleid, permissionid)
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    businessunitid INTEGER REFERENCES businessunits(id) ON DELETE SET NULL,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Folders Table
CREATE TABLE IF NOT EXISTS folders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    productid INTEGER REFERENCES products(id) ON DELETE CASCADE,
    createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Assets Table
CREATE TABLE IF NOT EXISTS salesassets (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    filename VARCHAR(255) NOT NULL,
    storedfilename VARCHAR(255) NOT NULL,
    filetype VARCHAR(50),
    filesize BIGINT,
    filepath VARCHAR(500),
    folderid INTEGER REFERENCES folders(id) ON DELETE CASCADE,
    uploadedby INTEGER REFERENCES users(id),
    uploadedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    versiongroupid VARCHAR(50),
    islatestversion BOOLEAN DEFAULT TRUE,
    tags TEXT,
    contenttype VARCHAR(100),
    extractedtext TEXT
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS auditlogs (
    id SERIAL PRIMARY KEY,
    userid INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entitytype VARCHAR(50),
    entityid VARCHAR(100),
    details JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ipaddress VARCHAR(45)
);

-- App Settings Table
CREATE TABLE IF NOT EXISTS appsettings (
    id SERIAL PRIMARY KEY,
    settingkey VARCHAR(100) UNIQUE NOT NULL,
    settingvalue TEXT,
    updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedby INTEGER REFERENCES users(id)
);

-- Add Foreign Key Constraints for Users
ALTER TABLE users 
    ADD CONSTRAINT fk_users_role 
    FOREIGN KEY (roleid) REFERENCES roles(id) ON DELETE SET NULL;

ALTER TABLE users 
    ADD CONSTRAINT fk_users_bu 
    FOREIGN KEY (businessunitid) REFERENCES businessunits(id) ON DELETE SET NULL;

-- Create Indexes for Performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_sales_assets_folder ON salesassets(folderid);
CREATE INDEX idx_sales_assets_version_group ON salesassets(versiongroupid);
CREATE INDEX idx_audit_logs_user ON auditlogs(userid);
CREATE INDEX idx_audit_logs_timestamp ON auditlogs(timestamp);

-- Insert Admin Role
INSERT INTO roles (name, description) 
VALUES ('Admin', 'Full system access')
ON CONFLICT (name) DO NOTHING;

-- Insert Permissions
INSERT INTO permissions (module, action, description) VALUES
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
ON CONFLICT (module, action) DO NOTHING;

-- Grant all permissions to Admin role
INSERT INTO rolepermissions (roleid, permissionid)
SELECT 1, id FROM permissions
ON CONFLICT (roleid, permissionid) DO NOTHING;

-- Create Admin User
-- Email: admin@salespro.com
-- Password: Admin@123
INSERT INTO users (name, email, passwordhash, status, mustchangepassword, roleid, usertype)
VALUES (
    'System Admin',
    'admin@salespro.com',
    '$2b$10$391JvKMKBOy.Hh2Q0GdY/OxooGhrR8OAieiL41qKK.1ozNdU/.6dq',
    'APPROVED',
    FALSE,
    1,
    'INTERNAL'
)
ON CONFLICT (email) DO UPDATE SET 
    passwordhash = EXCLUDED.passwordhash,
    status = EXCLUDED.status,
    roleid = EXCLUDED.roleid;

-- Success message
SELECT 'Schema created and admin user added successfully!' as message;
SELECT 'Login with: admin@salespro.com / Admin@123' as credentials;
