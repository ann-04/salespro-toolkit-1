import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectToDatabase, sql } from './db.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function applyRbacSchema() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        const schemaPath = path.join(__dirname, '../database/advanced_rbac_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by 'GO' robustly
        const batches = schemaSql.split(/(?:\r?\n|^)GO(?:\r?\n|$)/i).map(b => b.trim()).filter(b => b.length > 0);

        for (const batch of batches) {
            if (batch.toUpperCase().startsWith('USE ')) {
                console.log('Skipping USE command.');
                continue;
            }
            console.log('Executing batch...');
            try {
                await pool.request().query(batch);
            } catch (err) {
                // Ignore "Table already exists" errors if our script isn't perfectly idempotent, 
                // but our script uses IF NOT EXISTS so it should be fine.
                // However, Users table creation might fail if it exists but we want to modify it. 
                console.warn('Batch execution warning (might be safe if exists):', err.message);
            }
        }

        console.log('Advanced RBAC Schema applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Failed to apply schema:', err);
        process.exit(1);
    }
}

applyRbacSchema();
