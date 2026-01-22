import { connectToDatabase, sql } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        const pool = await connectToDatabase();
        const sqlPath = path.resolve(__dirname, '../database/create_categories.sql');
        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running SQL from:', sqlPath);
        await pool.request().query(sqlContent);
        console.log('Categories table created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error running SQL:', err);
        process.exit(1);
    }
}

run();
