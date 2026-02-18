import dotenv from 'dotenv';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
const envPath = path.resolve(__dirname, '.env.local');
dotenv.config({ path: envPath });

const { Pool } = pg;

console.log('Testing Database Connection...');
console.log('Database URL:', process.env.DATABASE_URL ? 'Defined' : 'Missing');

if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL is not set in .env.local');
    process.exit(1);
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    },
    connectionTimeoutMillis: 5000,
});

async function testConnection() {
    try {
        const client = await pool.connect();
        console.log('✅ Successfully connected to the database!');

        const result = await client.query('SELECT NOW() as now, current_database() as db');
        console.log('📅 Server Time:', result.rows[0].now);
        console.log('📂 Database:', result.rows[0].db);

        client.release();
        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
        if (err.code) console.error('Error Code:', err.code);
        if (err.errno) console.error('Error No:', err.errno);
        if (err.syscall) console.error('Syscall:', err.syscall);
        if (err.hostname) console.error('Hostname:', err.hostname);

        await pool.end();
        process.exit(1);
    }
}

testConnection();
