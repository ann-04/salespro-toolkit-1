import sql from 'mssql';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local from project root or resources path in prod
const isProd = process.env.NODE_ENV === 'production' || process.resourcesPath;
const envPath = isProd
    ? path.join(process.resourcesPath, '.env.local')
    : path.resolve(__dirname, '../.env.local');

dotenv.config({ path: envPath });

// Configuration matching user provided details
const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
    database: process.env.DB_DATABASE,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

export async function connectToDatabase() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to MS SQL Server');
        return pool;
    } catch (err) {
        console.error('Database connection failed:', err);
        throw err;
    }
}

export { sql };
