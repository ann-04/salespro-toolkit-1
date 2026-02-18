import fs from 'fs';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const dbUrlMatch = envContent.match(/DATABASE_URL=(.*)/);
if (!dbUrlMatch) {
    console.error('DATABASE_URL not found in .env.local');
    process.exit(1);
}

const connectionString = dbUrlMatch[1].trim();
console.log('Testing Connection String:', connectionString.replace(/:([^:@]+)@/, ':***@'));

const { Pool } = pg;
const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
});

pool.connect().then(client => {
    console.log('✅ CONNECTED SUCCESSFULLY!');
    client.query('SELECT NOW()').then(res => {
        console.log('📅 DB Time:', res.rows[0].now);
        client.release();
        pool.end();
        process.exit(0);
    });
}).catch(err => {
    console.error('❌ CONNECTION FAILED:', err.message);
    if (err.code) console.error('Code:', err.code);
    pool.end();
    process.exit(1);
});
