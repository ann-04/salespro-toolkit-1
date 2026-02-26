/**
 * Migration: Seed asset CRUD permissions into the Permissions table
 * so they appear in the role-permission modal under Org > Roles & Positions.
 *
 * Run ONCE: node server/scripts/seed-asset-permissions-in-roles.js
 * Safe to re-run (uses INSERT ... WHERE NOT EXISTS pattern).
 */

import { connectToDatabase, sql } from '../db-postgres-compat.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
}

const ASSET_PERMISSIONS = [
    // Asset Files
    { module: 'Assets', action: 'ASSET_FILE_CREATE', description: 'Upload new asset files' },
    { module: 'Assets', action: 'ASSET_FILE_UPDATE', description: 'Edit/update asset files and metadata' },
    { module: 'Assets', action: 'ASSET_FILE_DELETE', description: 'Delete asset files' },
    // Business Units (in asset repository)
    { module: 'Assets', action: 'ASSET_BU_CREATE', description: 'Create asset business units' },
    { module: 'Assets', action: 'ASSET_BU_UPDATE', description: 'Edit asset business units' },
    { module: 'Assets', action: 'ASSET_BU_DELETE', description: 'Delete asset business units' },
    // Products (in asset repository)
    { module: 'Assets', action: 'ASSET_PRODUCT_CREATE', description: 'Create asset products' },
    { module: 'Assets', action: 'ASSET_PRODUCT_UPDATE', description: 'Edit asset products' },
    { module: 'Assets', action: 'ASSET_PRODUCT_DELETE', description: 'Delete asset products' },
    // Folders
    { module: 'Assets', action: 'ASSET_FOLDER_CREATE', description: 'Create asset folders' },
    { module: 'Assets', action: 'ASSET_FOLDER_UPDATE', description: 'Edit asset folders' },
    { module: 'Assets', action: 'ASSET_FOLDER_DELETE', description: 'Delete asset folders' },
];

const run = async () => {
    console.log('🔄 Seeding asset permissions into Permissions table...');
    const pool = await connectToDatabase();
    let inserted = 0;
    let skipped = 0;

    for (const perm of ASSET_PERMISSIONS) {
        // Check if already exists
        const check = await pool.request()
            .input('Module', sql.NVarChar, perm.module)
            .input('Action', sql.NVarChar, perm.action)
            .query(`SELECT Id FROM permissions WHERE module = @Module AND action = @Action`);

        if (check.recordset.length > 0) {
            console.log(`  ⏭️  Skipping (exists): ${perm.module} / ${perm.action}`);
            skipped++;
        } else {
            await pool.request()
                .input('Module', sql.NVarChar, perm.module)
                .input('Action', sql.NVarChar, perm.action)
                .input('Description', sql.NVarChar, perm.description)
                .query(`INSERT INTO permissions (module, action, description) VALUES (@Module, @Action, @Description)`);
            console.log(`  ✅ Inserted: ${perm.module} / ${perm.action}`);
            inserted++;
        }
    }

    console.log(`\n✅ Done. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
    process.exit(0);
};

run().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
