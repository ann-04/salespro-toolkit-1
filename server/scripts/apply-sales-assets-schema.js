import { connectToDatabase, sql } from './db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applySchema() {
    try {
        console.log('🔄 Applying Sales Assets Repository Schema...\n');

        const pool = await connectToDatabase();

        // Read the SQL file
        const schemaPath = path.join(__dirname, '../database/sales_assets_schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by GO statements and execute each batch
        const batches = schemaSql
            .split(/\r?\nGO\r?\n/)
            .filter(batch => batch.trim().length > 0);

        console.log(`📝 Found ${batches.length} SQL batches to execute\n`);

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i].trim();
            if (batch) {
                try {
                    await pool.request().query(batch);
                    console.log(`✅ Batch ${i + 1}/${batches.length} executed successfully`);
                } catch (err) {
                    console.error(`❌ Error in batch ${i + 1}:`, err.message);
                    throw err;
                }
            }
        }

        console.log('\n✅ Schema applied successfully!');
        console.log('\n📊 Verifying tables...\n');

        // Verify tables were created
        const tables = [
            'AssetBusinessUnits',
            'AssetProducts',
            'AssetFolders',
            'AssetFiles',
            'AssetFileTags',
            'AssetFileMetadata',
            'AssetPermissions',
            'UserAssetPermissions'
        ];

        for (const table of tables) {
            const result = await pool.request().query(`
                SELECT COUNT(*) as count 
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_NAME = '${table}'
            `);

            if (result.recordset[0].count > 0) {
                console.log(`✅ ${table} - Created`);
            } else {
                console.log(`❌ ${table} - NOT FOUND`);
            }
        }

        // Check permissions count
        const permCount = await pool.request().query('SELECT COUNT(*) as count FROM AssetPermissions');
        console.log(`\n📋 Asset Permissions: ${permCount.recordset[0].count} permissions created`);

        // Check sample BUs
        const buCount = await pool.request().query('SELECT COUNT(*) as count FROM AssetBusinessUnits');
        console.log(`📁 Business Units: ${buCount.recordset[0].count} sample BUs created`);

        console.log('\n🎉 Sales Assets Repository is ready to use!');

        process.exit(0);

    } catch (err) {
        console.error('❌ Schema application failed:', err);
        process.exit(1);
    }
}

applySchema();
