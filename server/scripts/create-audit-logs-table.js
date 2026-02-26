import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, sql } from './db.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function createAuditLogsTable() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        const schemaPath = path.join(__dirname, '../database/create_audit_logs.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing Audit Logs schema creation...');
        await pool.request().query(schemaSql);

        console.log('AuditLogs table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to create AuditLogs table:', err);
        process.exit(1);
    }
}

createAuditLogsTable();
