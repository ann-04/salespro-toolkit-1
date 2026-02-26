import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, sql } from './db.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function initDB() {
    try {
        // 1. Create Database if it doesn't exist (Connect to master)
        console.log('Connecting to master to check database existence...');
        const masterConfig = {
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            server: process.env.DB_SERVER,
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : undefined,
            database: 'master', // Force master
            options: {
                encrypt: true,
                trustServerCertificate: true
            }
        };

        const masterPool = await new sql.ConnectionPool(masterConfig).connect();
        const dbName = process.env.DB_DATABASE || 'SalesProDB';

        await masterPool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbName}')
            BEGIN
                CREATE DATABASE [${dbName}];
            END
        `);
        console.log(`Database '${dbName}' ensured.`);
        await masterPool.close();

        // 2. Connect to the actual database
        console.log(`Connecting to ${dbName}...`);
        const pool = await connectToDatabase();

        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by 'GO' robustly (handling start/end of file and windows/unix line endings)
        const batches = schemaSql.split(/(?:\r?\n|^)GO(?:\r?\n|$)/i).map(b => b.trim()).filter(b => b.length > 0);

        for (const batch of batches) {
            if (batch.toUpperCase().startsWith('USE ')) {
                console.log('Skipping USE command as we are already connected to DB.');
                continue;
            }
            // Skipping CREATE DATABASE as we assume it exists or we are connected
            if (batch.toUpperCase().startsWith('CREATE DATABASE ')) {
                console.log('Skipping CREATE DATABASE command.');
                continue;
            }

            console.log('Executing batch...');
            await pool.request().query(batch);
        }

        console.log('Database initialized successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to initialize database:');
        console.error('Message:', err.message);
        console.error('Code:', err.code);
        if (err.originalError) {
            console.error('Original Error:', err.originalError.message);
        }
        process.exit(1);
    }
}

initDB();
