/**
 * Migration: Add MustChangePassword column to Users table
 * 
 * Run this ONCE against your production/Supabase database if the column
 * does not yet exist (schemas created before this PR was merged).
 *
 * Usage: node server/scripts/add-must-change-password.js
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

const run = async () => {
    console.log('🔄 Running migration: add MustChangePassword column...');
    const pool = await connectToDatabase();

    // Add column — safe to run even if it already exists (IF NOT EXISTS)
    await pool.request().query(`
        ALTER TABLE "Users"
        ADD COLUMN IF NOT EXISTS "MustChangePassword" BOOLEAN DEFAULT TRUE
    `);

    // Set all currently-approved users who self-registered (likely already have 
    // their own passwords set) to FALSE, so they are NOT forced to change.
    // Newly admin-created users will remain TRUE until they log in and change.
    const result = await pool.request().query(`
        UPDATE "Users"
        SET "MustChangePassword" = FALSE
        WHERE "Status" = 'APPROVED'
          AND "MustChangePassword" IS NULL
    `);

    console.log('✅ Migration complete.');
    console.log(`   MustChangePassword column added (or already existed).`);
    console.log(`   Existing approved users set to FALSE (won't be forced to re-change).`);
    process.exit(0);
};

run().catch((err) => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
