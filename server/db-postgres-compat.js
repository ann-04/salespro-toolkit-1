import pg from 'pg';

const { Pool } = pg;

// Connection pool reference
let pool = null;

/**
 * Initialize the PostgreSQL connection pool
 */
const initPool = () => {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is not set');
        }

        console.log('Initializing PostgreSQL Pool...');
        pool = new Pool({
            connectionString,
            ssl: {
                rejectUnauthorized: false
            },
            connectionTimeoutMillis: 10000,
            idleTimeoutMillis: 30000,
            max: 10
        });

        pool.on('error', (err) => {
            console.error('Unexpected error on idle client', err);
        });

        console.log('✅ PostgreSQL connection pool created');
    }
    return pool;
};

/**
 * SQL type constants (for compatibility with mssql-style code)
 */
export const sql = {
    NVarChar: 'VARCHAR',
    Int: 'INTEGER',
    BigInt: 'BIGINT',
    Bit: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    Text: 'TEXT',
    VarChar: 'VARCHAR',
    MAX: 'MAX'
};

/**
 * Convert PascalCase table names to lowercase
 */
const tableNameMap = {
    'Users': 'users',
    'Roles': 'roles',
    'BusinessUnits': 'businessunits',
    'Products': 'products',
    'Categories': 'categories',
    'PartnerCategories': 'partnercategories',
    'Folders': 'folders',
    'SalesAssets': 'salesassets',
    'Permissions': 'permissions',
    'RolePermissions': 'rolepermissions',
    'AuditLogs': 'auditlogs',
    'AppSettings': 'appsettings',
    'SystemSettings': 'appsettings'  // Map old name to new
};

/**
 * Convert MS SQL query syntax to PostgreSQL
 */
function convertQuery(queryText, paramNames, params) {
    let pgQuery = queryText;

    // Convert table names (PascalCase -> lowercase)
    Object.entries(tableNameMap).forEach(([pascalCase, lowercase]) => {
        const regex = new RegExp(`\\b${pascalCase}\\b`, 'g');
        pgQuery = pgQuery.replace(regex, lowercase);
    });

    // Remove double-quotes around identifiers (MS SQL style)
    pgQuery = pgQuery.replace(/"([A-Za-z0-9_]+)"/g, '$1');

    // Remove square brackets around identifiers (MS SQL style)
    pgQuery = pgQuery.replace(/\[([A-Za-z0-9_\s]+)\]/g, '$1');

    // Replace MS SQL specific functions
    pgQuery = pgQuery.replace(/GETDATE\(\)/gi, 'NOW()');
    pgQuery = pgQuery.replace(/ISNULL\(/gi, 'COALESCE(');
    pgQuery = pgQuery.replace(/\bTOP\s+(\d+)\b/gi, 'LIMIT $1');

    // Handle IF EXISTS ... UPDATE ... ELSE ... INSERT (MS SQL UPSERT pattern)
    // Convert to PostgreSQL INSERT ... ON CONFLICT DO UPDATE
    // For SystemSettings / AppSettings: Key -> settingkey, Value -> settingvalue
    pgQuery = pgQuery.replace(/settingkey/gi, 'settingkey');
    pgQuery = pgQuery.replace(/settingvalue/gi, 'settingvalue');

    // Handle IF EXISTS pattern for appsettings upsert
    const ifExistsPattern = /IF\s+EXISTS\s*\(SELECT\s+\*\s+FROM\s+appsettings\s+WHERE\s+settingkey\s*=\s*@(\w+)\)\s*UPDATE\s+appsettings\s+SET\s+settingvalue\s*=\s*@(\w+)(?:,\s*UpdatedAt\s*=\s*NOW\(\))?\s+WHERE\s+settingkey\s*=\s*@\1\s*ELSE\s+INSERT\s+INTO\s+appsettings\s*\(settingkey,\s*settingvalue\)\s*VALUES\s*\(@\1,\s*@\2\)/gi;
    pgQuery = pgQuery.replace(ifExistsPattern, (match, keyParam, valParam) => {
        return `INSERT INTO appsettings (settingkey, settingvalue) VALUES (@${keyParam}, @${valParam}) ON CONFLICT (settingkey) DO UPDATE SET settingvalue = EXCLUDED.settingvalue, updatedat = NOW()`;
    });

    // Handle OUTPUT INSERTED clause -> RETURNING
    if (/OUTPUT\s+INSERTED\./i.test(pgQuery)) {
        // Remove the OUTPUT INSERTED.* or OUTPUT INSERTED.col1, INSERTED.col2 and add RETURNING at end
        pgQuery = pgQuery.replace(/OUTPUT\s+INSERTED\.\*/gi, '');
        pgQuery = pgQuery.replace(/OUTPUT\s+(INSERTED\.\w+(?:,\s*INSERTED\.\w+)*)/gi, (match, cols) => {
            return ''; // Remove from INSERT position
        });
        // Add RETURNING * at end of INSERT statement (before VALUES or at end)
        if (/INSERT\s+INTO/i.test(pgQuery) && !/RETURNING/i.test(pgQuery)) {
            pgQuery = pgQuery.trimEnd();
            if (pgQuery.endsWith(')')) {
                pgQuery += ' RETURNING *';
            }
        }
    }

    // Handle MustChangePassword boolean: MS SQL uses 0/1, PostgreSQL uses true/false
    // The compat layer handles this via parameter passing

    // Replace @ParamName with $N placeholders
    // Sort by length descending to avoid replacing @Name before @NameLong
    const paramIndices = paramNames.map((name, i) => ({ name, index: i }));
    paramIndices.sort((a, b) => b.name.length - a.name.length);

    paramIndices.forEach(p => {
        const paramPlaceholder = `@${p.name}`;
        const pgPlaceholder = `$${p.index + 1}`;
        pgQuery = pgQuery.split(paramPlaceholder).join(pgPlaceholder);
    });

    return pgQuery;
}

/**
 * Convert lowercase PostgreSQL column names to PascalCase
 */
function convertToPascalCase(row) {
    const columnMap = {
        'id': 'Id',
        'name': 'Name',
        'email': 'Email',
        'passwordhash': 'PasswordHash',
        'roleid': 'RoleId',
        'departmentid': 'DepartmentId',
        'businessunitid': 'BusinessUnitId',
        'title': 'Title',
        'status': 'Status',
        'createdat': 'CreatedAt',
        'updatedat': 'UpdatedAt',
        'lastlogin': 'LastLogin',
        'description': 'Description',
        'category': 'Category',
        'problemsolved': 'ProblemSolved',
        'itlandscape': 'ItLandscape',
        'deploymentmodels': 'DeploymentModels',
        'licensing': 'Licensing',
        'pricingband': 'PricingBand',
        'nottosell': 'NotToSell',
        'capabilities': 'Capabilities',
        'folderpath': 'FolderPath',
        'parentfolderid': 'ParentFolderId',
        'ispublic': 'IsPublic',
        'filetype': 'FileType',
        'filesize': 'FileSize',
        'storagepath': 'StoragePath',
        'uploadedby': 'UploadedBy',
        'permission': 'Permission',
        'action': 'Action',
        'entity': 'Entity',
        'entityid': 'EntityId',
        'details': 'Details',
        'userid': 'UserId',
        'settingkey': 'Key',
        'settingvalue': 'Value',
        'isencrypted': 'IsEncrypted',
        'partnercategoryid': 'PartnerCategoryId',
        'usertype': 'UserType',
        'partnercategory': 'PartnerCategory',
        'mustchangepassword': 'MustChangePassword',
        'rolename': 'RoleName',
        'buname': 'BuName',
        'module': 'Module',
        'permissionid': 'PermissionId',
        'timestamp': 'Timestamp',
        'username': 'UserName',
        'useremail': 'UserEmail',
        'updatedby': 'UpdatedBy',
        'productid': 'ProductId',
        'folderid': 'FolderId',
        'storedfilename': 'StoredFileName',
        'filename': 'FileName',
        'filepath': 'FilePath',
        'uploadedat': 'UploadedAt',
        'version': 'Version',
        'versiongroupid': 'VersionGroupId',
        'islatestversion': 'IsLatestVersion',
        'tags': 'Tags',
        'contenttype': 'ContentType',
        'extractedtext': 'ExtractedText',
        'count': 'count'  // keep lowercase for aggregate functions
    };

    const converted = {};
    Object.keys(row).forEach(key => {
        const lowerKey = key.toLowerCase();
        const mappedKey = columnMap[lowerKey] || (key.charAt(0).toUpperCase() + key.slice(1));
        converted[mappedKey] = row[key];
    });

    return converted;
}

/**
 * PostgresRequest class - mimics mssql Request object
 */
class PostgresRequest {
    constructor(poolInstance) {
        this.pool = poolInstance;
        this.params = [];
        this.paramNames = [];
    }

    input(name, type, value) {
        // Handle sql.NVarChar(100) style calls where type is a function result
        // Just ignore the type, we only need name and value
        if (arguments.length === 2) {
            // Called as .input(name, value) - no type
            value = type;
        }
        this.paramNames.push(name);
        this.params.push(value);
        return this;
    }

    async query(queryText) {
        const pgQuery = convertQuery(queryText, this.paramNames, this.params);

        try {
            console.log('--- DB QUERY ---');
            console.log('Original:', queryText.trim().substring(0, 200));
            console.log('Converted:', pgQuery.trim().substring(0, 200));
            console.log('Params:', this.params);

            const result = await this.pool.query(pgQuery, this.params);

            const convertedRows = result.rows.map(row => convertToPascalCase(row));

            return {
                recordset: convertedRows,
                rowsAffected: [result.rowCount],
                rowCount: result.rowCount
            };
        } catch (error) {
            console.error('Query error:', error.message);
            console.error('Converted query:', pgQuery);
            console.error('Params:', this.params);
            throw error;
        }
    }

    // Alias for stored procedures (not really supported, but prevents crashes)
    async execute(procedureName) {
        return this.query(procedureName || '');
    }
}

/**
 * PostgresTransaction class - mimics mssql Transaction object
 * Uses a single client from the pool for transaction isolation
 */
class PostgresTransaction {
    constructor(poolInstance) {
        this.pool = poolInstance;
        this.client = null;
    }

    async begin() {
        this.client = await this.pool.connect();
        await this.client.query('BEGIN');
    }

    request() {
        return new PostgresTransactionRequest(this.client);
    }

    async commit() {
        await this.client.query('COMMIT');
        this.client.release();
        this.client = null;
    }

    async rollback() {
        if (this.client) {
            await this.client.query('ROLLBACK');
            this.client.release();
            this.client = null;
        }
    }
}

/**
 * PostgresTransactionRequest - like PostgresRequest but uses a transaction client
 */
class PostgresTransactionRequest {
    constructor(client) {
        this.client = client;
        this.params = [];
        this.paramNames = [];
    }

    input(name, type, value) {
        if (arguments.length === 2) {
            value = type;
        }
        this.paramNames.push(name);
        this.params.push(value);
        return this;
    }

    async query(queryText) {
        const pgQuery = convertQuery(queryText, this.paramNames, this.params);

        try {
            const result = await this.client.query(pgQuery, this.params);
            const convertedRows = result.rows.map(row => convertToPascalCase(row));
            return {
                recordset: convertedRows,
                rowsAffected: [result.rowCount],
                rowCount: result.rowCount
            };
        } catch (error) {
            console.error('Transaction query error:', error.message);
            console.error('Converted query:', pgQuery);
            throw error;
        }
    }
}

/**
 * Pool wrapper that provides .request() method
 */
class PoolWrapper {
    constructor(pgPool) {
        this.pgPool = pgPool;
    }

    request() {
        return new PostgresRequest(this.pgPool);
    }

    // Allow creating transactions
    createTransaction() {
        return new PostgresTransaction(this.pgPool);
    }

    // Direct query access
    async query(text, params) {
        return this.pgPool.query(text, params);
    }

    // Allow connecting a client
    async connect() {
        return this.pgPool.connect();
    }
}

/**
 * Connect to database - returns a pool wrapper
 */
export const connectToDatabase = async () => {
    const pgPool = initPool();
    return new PoolWrapper(pgPool);
};

// Legacy alias
export const connect = connectToDatabase;

/**
 * Configure global database connection (legacy compat)
 */
export const configCallback = async (config) => {
    return initPool();
};

// Attach Transaction to sql object for compatibility
sql.Transaction = PostgresTransaction;

export default {
    connect: connectToDatabase,
    connectToDatabase,
    config: configCallback,
    sql,
    Request: PostgresRequest
};
