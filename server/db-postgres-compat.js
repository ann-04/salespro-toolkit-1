import pg from 'pg';
const { Pool } = pg;

let pool;

/**
 * MS SQL Server compatibility layer for PostgreSQL
 * This allows existing MS SQL code to work with PostgreSQL
 */

// SQL type mapping (MS SQL -> PostgreSQL)
export const sql = {
    NVarChar: 'VARCHAR',
    Int: 'INTEGER',
    BigInt: 'BIGINT',
    Bit: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    Text: 'TEXT',
    VarChar: 'VARCHAR'
};

/**
 * Connect to PostgreSQL database
 */
export const connectToDatabase = async () => {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;

        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err) => {
            console.error('Unexpected database pool error:', err);
        });

        console.log('✅ PostgreSQL connection pool created');
    }

    // Return a compatibility object that mimics MS SQL pool
    return {
        request: () => new PostgresRequest(pool),
        query: (text, params) => pool.query(text, params),
        _pool: pool // Internal reference
    };
};

/**
 * PostgresRequest class - mimics MS SQL Server request object
 */
class PostgresRequest {
    constructor(pool) {
        this.pool = pool;
        this.params = [];
        this.paramNames = [];
        this.queryText = '';
    }

    input(name, type, value) {
        this.paramNames.push(name);
        this.params.push(value);
        return this;
    }

    async query(queryText) {
        // Convert MS SQL query to PostgreSQL query
        let pgQuery = queryText;

        // Replace @ParamName with $1, $2, $3, etc.
        this.paramNames.forEach((name, index) => {
            const paramPlaceholder = `@${name}`;
            const pgPlaceholder = `$${index + 1}`;
            pgQuery = pgQuery.replace(new RegExp(paramPlaceholder, 'g'), pgPlaceholder);
        });

        // Convert PascalCase table names to lowercase
        const tableNameMap = {
            'Users': 'users',
            'Roles': 'roles',
            'BusinessUnits': 'businessunits',
            'Products': 'products',
            'Folders': 'folders',
            'SalesAssets': 'salesassets',
            'Permissions': 'permissions',
            'RolePermissions': 'rolepermissions',
            'AuditLogs': 'auditlogs',
            'AppSettings': 'appsettings'
        };

        Object.entries(tableNameMap).forEach(([pascalCase, lowercase]) => {
            const regex = new RegExp(`\\b${pascalCase}\\b`, 'g');
            pgQuery = pgQuery.replace(regex, lowercase);
        });

        // Remove quotes from column names and convert to lowercase
        // This handles: u."RoleId" -> u.roleid, "Name" -> name, etc.
        pgQuery = pgQuery.replace(/"([A-Za-z][A-Za-z0-9]*)"/g, (match, columnName) => {
            return columnName.toLowerCase();
        });

        // Replace MS SQL specific functions
        pgQuery = pgQuery.replace(/GETDATE\(\)/g, 'NOW()');
        pgQuery = pgQuery.replace(/ISNULL\(/g, 'COALESCE(');
        pgQuery = pgQuery.replace(/OUTPUT INSERTED\.\*/g, 'RETURNING *');
        pgQuery = pgQuery.replace(/OUTPUT INSERTED\.(\w+)/g, 'RETURNING $1');

        try {
            const result = await this.pool.query(pgQuery, this.params);

            // Convert lowercase column names to PascalCase for backend compatibility
            const convertedRows = result.rows.map(row => convertToPascalCase(row));

            return {
                recordset: convertedRows,
                rowsAffected: [result.rowCount],
                rowCount: result.rowCount
            };
        } catch (error) {
            console.error('Query error:', error);
            console.error('Original query:', queryText);
            console.error('Converted query:', pgQuery);
            console.error('Params:', this.params);
            throw error;
        }
    }
}

/**
 * Convert lowercase PostgreSQL column names to PascalCase
 * This allows existing backend code to work without changes
 */
function convertToPascalCase(row) {
    const converted = {};

    // Map of lowercase to PascalCase column names
    const columnMap = {
        'id': 'Id',
        'name': 'Name',
        'email': 'Email',
        'passwordhash': 'PasswordHash',
        'status': 'Status',
        'mustchangepassword': 'MustChangePassword',
        'usertype': 'UserType',
        'partnercategory': 'PartnerCategory',
        'roleid': 'RoleId',
        'businessunitid': 'BusinessUnitId',
        'createdat': 'CreatedAt',
        'lastlogin': 'LastLogin',
        'rolename': 'RoleName',
        'buname': 'BuName',
        'description': 'Description',
        'module': 'Module',
        'action': 'Action',
        'permissionid': 'PermissionId',
        'productid': 'ProductId',
        'folderid': 'FolderId',
        'title': 'Title',
        'filename': 'FileName',
        'storedfilename': 'StoredFileName',
        'filetype': 'FileType',
        'filesize': 'FileSize',
        'filepath': 'FilePath',
        'uploadedby': 'UploadedBy',
        'uploadedat': 'UploadedAt',
        'version': 'Version',
        'versiongroupid': 'VersionGroupId',
        'islatestversion': 'IsLatestVersion',
        'tags': 'Tags',
        'contenttype': 'ContentType',
        'extractedtext': 'ExtractedText',
        'userid': 'UserId',
        'entity': 'Entity',
        'entityid': 'EntityId',
        'details': 'Details',
        'timestamp': 'Timestamp',
        'settingkey': 'SettingKey',
        'settingvalue': 'SettingValue',
        'updatedat': 'UpdatedAt',
        'updatedby': 'UpdatedBy'
    };

    for (const [key, value] of Object.entries(row)) {
        const pascalKey = columnMap[key.toLowerCase()] || capitalizeFirst(key);
        converted[pascalKey] = value;
    }

    return converted;
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Close the database pool
 */
export const closePool = async () => {
    if (pool) {
        await pool.end();
        console.log('Database pool closed');
    }
};

export default {
    connectToDatabase,
    sql,
    closePool
};
