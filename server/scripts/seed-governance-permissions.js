/**
 * Ensures core governance permissions exist in the Permissions table.
 * Safe to re-run — uses INSERT WHERE NOT EXISTS pattern.
 * Run: node server/scripts/seed-governance-permissions.js
 */
import { connectToDatabase, sql } from '../db-postgres-compat.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// These are the exact strings requirePermission() checks against (Module_Action uppercased)
const GOVERNANCE_PERMISSIONS = [
    { module: 'ROLES', action: 'MANAGE', description: 'Create, edit, and delete roles' },
    { module: 'DEPARTMENTS', action: 'MANAGE', description: 'Create, edit, and delete departments' },
    { module: 'CATEGORIES', action: 'MANAGE', description: 'Create, edit, and delete partner categories' },
    { module: 'USERS', action: 'VIEW', description: 'View users list' },
    { module: 'USERS', action: 'CREATE', description: 'Create new users' },
    { module: 'USERS', action: 'MANAGE', description: 'Edit and delete users' },
    { module: 'PRODUCTS', action: 'VIEW', description: 'View products' },
    { module: 'PRODUCTS', action: 'MANAGE', description: 'Create, edit, and delete products' },
];

const run = async () => {
    const pool = await connectToDatabase();
    let inserted = 0, skipped = 0;

    // Show current state first
    const existing = await pool.request().query(
        "SELECT Module, Action FROM permissions WHERE module NOT LIKE 'Asset%' ORDER BY module, action"
    );
    console.log('Current non-asset permissions:');
    existing.recordset.forEach(p => {
        const m = p.Module ?? p.module;
        const a = p.Action ?? p.action;
        console.log(`  ${m}_${a}`);
    });
    console.log('');

    for (const perm of GOVERNANCE_PERMISSIONS) {
        const check = await pool.request()
            .input('Module', sql.NVarChar, perm.module)
            .input('Action', sql.NVarChar, perm.action)
            .query('SELECT Id FROM permissions WHERE UPPER(module) = @Module AND UPPER(action) = @Action');

        if (check.recordset.length > 0) {
            console.log(`  Skipping (exists): ${perm.module}_${perm.action}`);
            skipped++;
        } else {
            await pool.request()
                .input('Module', sql.NVarChar, perm.module)
                .input('Action', sql.NVarChar, perm.action)
                .input('Description', sql.NVarChar, perm.description)
                .query('INSERT INTO permissions (module, action, description) VALUES (@Module, @Action, @Description)');
            console.log(`  Inserted: ${perm.module}_${perm.action}`);
            inserted++;
        }
    }

    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
    process.exit(0);
};

run().catch(e => { console.error(e.message); process.exit(1); });
