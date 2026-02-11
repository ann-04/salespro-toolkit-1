import { connectToDatabase, sql } from './server/db.js';

async function updateSchema() {
    try {
        const pool = await connectToDatabase();
        console.log('Connected to database...');

        // 1. Add Versioning columns to AssetFiles if they don't exist
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AssetFiles' AND COLUMN_NAME = 'VersionGroupId')
                BEGIN
                    ALTER TABLE AssetFiles ADD VersionGroupId NVARCHAR(36) NULL;
                END

                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'AssetFiles' AND COLUMN_NAME = 'VersionNumber')
                BEGIN
                    ALTER TABLE AssetFiles ADD VersionNumber INT DEFAULT 1;
                END
            `);
            console.log('Added VersionGroupId and VersionNumber columns.');
        } catch (e) {
            console.error('Error adding columns:', e.message);
        }

        // 2. Backfill VersionGroupId for existing files
        // We will just generate a new GUID for each existing file, assuming they are all independent V1s.
        try {
            await pool.request().query(`
                UPDATE AssetFiles 
                SET VersionGroupId = NEWID(), VersionNumber = 1 
                WHERE VersionGroupId IS NULL
            `);
            console.log('Backfilled VersionGroupId for existing files.');
        } catch (e) {
            console.error('Error backfilling versions:', e.message);
        }

        // 3. Create AssetFileAssignments table for "Pinning" versions to users
        try {
            await pool.request().query(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AssetFileAssignments')
                BEGIN
                    CREATE TABLE AssetFileAssignments (
                        Id INT IDENTITY(1,1) PRIMARY KEY,
                        UserId INT NOT NULL,
                        AssetFileId INT NOT NULL,
                        VersionGroupId NVARCHAR(36) NOT NULL,
                        AssignedBy INT NULL,
                        AssignedAt DATETIME DEFAULT GETDATE(),
                        FOREIGN KEY (UserId) REFERENCES Users(Id),
                        FOREIGN KEY (AssetFileId) REFERENCES AssetFiles(Id)
                    );
                END
            `);
            console.log('Created AssetFileAssignments table.');
        } catch (e) {
            console.error('Error creating table:', e.message);
        }

        console.log('Schema update complete.');
        process.exit(0);
    } catch (err) {
        console.error('Fatal error:', err);
        process.exit(1);
    }
}

updateSchema();
