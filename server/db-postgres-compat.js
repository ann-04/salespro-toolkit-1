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

        // Replace MS SQL specific functions
        pgQuery = pgQuery.replace(/GETDATE\(\)/g, 'NOW()');
        pgQuery = pgQuery.replace(/ISNULL\(/g, 'COALESCE(');

        // Handle OUTPUT INSERTED.* (MS SQL) -> RETURNING * (PostgreSQL)
        pgQuery = pgQuery.replace(/OUTPUT INSERTED\.\*/g, 'RETURNING *');
        pgQuery = pgQuery.replace(/OUTPUT INSERTED\.(\w+)/g, 'RETURNING $1');

        try {
            const result = await this.pool.query(pgQuery, this.params);

            // Convert PostgreSQL result to MS SQL format
            return {
                recordset: result.rows,
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
