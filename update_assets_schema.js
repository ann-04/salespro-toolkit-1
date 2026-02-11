import { connectToDatabase, sql } from './server/db.js';

async function updateSchema() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();
        console.log('Connected.');

        // 1. Check and Add IsArchived to AssetFiles
        try {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[AssetFiles]') 
                    AND name = 'IsArchived'
                )
                BEGIN
                    ALTER TABLE AssetFiles ADD IsArchived BIT DEFAULT 0 NOT NULL;
                    PRINT 'Added IsArchived column to AssetFiles';
                END
                ELSE
                BEGIN
                    PRINT 'IsArchived column already exists in AssetFiles';
                END
            `);
        } catch (e) {
            console.error('Error adding IsArchived:', e.message);
        }

        // 2. Check and Add AudienceLevel to AssetFiles
        try {
            await pool.request().query(`
                IF NOT EXISTS (
                    SELECT * FROM sys.columns 
                    WHERE object_id = OBJECT_ID(N'[dbo].[AssetFiles]') 
                    AND name = 'AudienceLevel'
                )
                BEGIN
                    ALTER TABLE AssetFiles ADD AudienceLevel NVARCHAR(50) DEFAULT 'Internal' NOT NULL;
                    PRINT 'Added AudienceLevel column to AssetFiles';
                END
                ELSE
                BEGIN
                    PRINT 'AudienceLevel column already exists in AssetFiles';
                END
            `);
        } catch (e) {
            console.error('Error adding AudienceLevel:', e.message);
        }

        console.log('Schema update complete.');
        process.exit(0);

    } catch (err) {
        console.error('Fatal Error:', err);
        process.exit(1);
    }
}

updateSchema();
