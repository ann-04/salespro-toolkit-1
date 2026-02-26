import { connectToDatabase } from '../db-postgres-compat.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

const run = async () => {
    const pool = await connectToDatabase();
    const r = await pool.request().query(
        "SELECT Module, Action FROM permissions WHERE UPPER(module) NOT LIKE 'ASSET%' ORDER BY module, action"
    );
    console.log('Non-asset permissions (Module/Action raw values):');
    r.recordset.forEach(p => {
        const m = p.Module ?? p.module;
        const a = p.Action ?? p.action;
        console.log(`  Module="${m}"  Action="${a}"  => combined: "${m}_${a}"`);
    });
    process.exit(0);
};
run().catch(e => { console.error(e.message); process.exit(1); });
