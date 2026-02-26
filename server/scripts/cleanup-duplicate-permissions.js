/**
 * Cleanup script: Remove old generic permission entries that were replaced
 * by the new granular asset permissions (ASSET_BU_CREATE, ASSET_FILE_CREATE, etc.)
 *
 * Run: node server/scripts/cleanup-duplicate-permissions.js
 */

import { connectToDatabase } from '../db-postgres-compat.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
}

const run = async () => {
    console.log('Checking existing permissions...\n');
    const pool = await connectToDatabase();

    // Show what exists first
    const existing = await pool.request().query(
        'SELECT id, module, action FROM permissions ORDER BY module, action'
    );
    console.log('Current permissions:');
    existing.recordset.forEach(p => console.log(`  [${p.id}] ${p.module} / ${p.action}`));

    console.log('\nRemoving old generic asset permission entries...');

    // Delete old uppercase ASSETS module entries (MANAGE, UPLOAD, VIEW)
    const del1 = await pool.request().query(`
        DELETE FROM permissions
        WHERE UPPER(module) = 'ASSETS'
          AND UPPER(action) IN ('MANAGE', 'UPLOAD', 'VIEW')
    `);
    console.log('  Deleted ASSETS > MANAGE/UPLOAD/VIEW entries.');

    // Delete any standalone BU module entries
    const del2 = await pool.request().query(`
        DELETE FROM permissions
        WHERE UPPER(module) = 'BU'
    `);
    console.log('  Deleted BU module entries.');

    // Show final state
    const final = await pool.request().query(
        'SELECT module, action FROM permissions ORDER BY module, action'
    );
    console.log('\nFinal permissions in table:');
    final.recordset.forEach(p => console.log(`  ${p.module} / ${p.action}`));

    console.log('\nDone!');
    process.exit(0);
};

run().catch((err) => {
    console.error('Cleanup failed:', err);
    process.exit(1);
});
