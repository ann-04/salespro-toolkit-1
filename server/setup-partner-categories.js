
import { connectToDatabase, sql } from './db.js';
import fs from 'fs';
import path from 'path';

async function setup() {
    try {
        const pool = await connectToDatabase();
        const sqlContent = fs.readFileSync(path.join(process.cwd(), 'database', 'create_partner_categories.sql'), 'utf8');
        await pool.request().query(sqlContent);
        console.log('✅ PartnerCategories table created/verified.');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

setup();
