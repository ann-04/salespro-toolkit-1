import pg from 'pg';
const { Pool } = pg;

let pool;

/**
 * Connect to PostgreSQL database (Supabase)
 * Uses connection pooling for better performance
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
                rejectUnauthorized: false // Required for Supabase
            },
            max: 20, // Maximum number of clients in the pool
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        pool.on('error', (err) => {
            console.error('Unexpected database pool error:', err);
        });

        console.log('✅ PostgreSQL connection pool created');
    }
    return pool;
};

/**
 * Execute a parameterized query
 * @param {string} text - SQL query with $1, $2, etc. placeholders
 * @param {Array} params - Array of parameter values
 * @returns {Promise} Query result
 */
export const query = async (text, params) => {
    const pool = await connectToDatabase();
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

/**
 * Close the database pool (for graceful shutdown)
 */
export const closePool = async () => {
    if (pool) {
        await pool.end();
        console.log('Database pool closed');
    }
};

// Export for compatibility with existing code
export const sql = {
    // PostgreSQL uses $1, $2, etc. instead of @param
    // These are just placeholders for code compatibility
    NVarChar: 'VARCHAR',
    Int: 'INTEGER',
    BigInt: 'BIGINT',
    Bit: 'BOOLEAN',
    DateTime: 'TIMESTAMP',
    Text: 'TEXT',
    VarChar: 'VARCHAR'
};

export default {
    connectToDatabase,
    query,
    closePool,
    sql
};
