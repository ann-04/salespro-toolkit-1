import 'dotenv/config';
import { connectToDatabase, sql } from './server/db.js';

async function fixVersionGroups() {
    try {
        const pool = await connectToDatabase();
        console.log("Connected. Finding split groups...");

        // 1. Find inconsistencies: Files with same Title + Folder but different VersionGroupId
        // We group by FolderId, Title.
        const candidates = await pool.request().query(`
            SELECT FolderId, Title, COUNT(*) as Count, COUNT(DISTINCT ISNULL(VersionGroupId, CAST(Id AS NVARCHAR(50)))) as GroupCount
            FROM AssetFiles
            WHERE IsDeleted = 0
            GROUP BY FolderId, Title
            HAVING COUNT(DISTINCT ISNULL(VersionGroupId, CAST(Id AS NVARCHAR(50)))) > 1
        `);

        if (candidates.recordset.length === 0) {
            console.log("No split version groups found. Data seems clean.");
            return;
        }

        console.log(`Found ${candidates.recordset.length} potential split groups.`);

        for (const group of candidates.recordset) {
            console.log(`Processing split group: "${group.Title}" in Folder ${group.FolderId}`);

            // Get all files for this Title/Folder
            const filesRes = await pool.request()
                .input('FolderId', sql.Int, group.FolderId)
                .input('Title', sql.NVarChar, group.Title)
                .query(`
                    SELECT Id, CreatedAt, VersionGroupId 
                    FROM AssetFiles 
                    WHERE FolderId = @FolderId AND Title = @Title AND IsDeleted = 0
                    ORDER BY CreatedAt ASC
                `);

            const files = filesRes.recordset;
            if (files.length < 2) continue;

            // Determine the "Master" Group ID.
            // Ideally, the ID of the oldest file.
            const masterFile = files[0];
            const masterGroupId = masterFile.VersionGroupId || masterFile.Id.toString();

            console.log(`  - Master Group ID will be: ${masterGroupId} (from File ${masterFile.Id})`);

            // Update all files to this Group ID and re-index versions
            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const newVersion = i + 1;

                await pool.request()
                    .input('Id', sql.Int, f.Id)
                    .input('Gid', sql.NVarChar, masterGroupId)
                    .input('Ver', sql.Int, newVersion)
                    .query(`
                        UPDATE AssetFiles 
                        SET VersionGroupId = @Gid, VersionNumber = @Ver 
                        WHERE Id = @Id
                    `);
                console.log(`    - Updated File ${f.Id}: Version ${newVersion}, Group ${masterGroupId}`);
            }

            // Also update assignments! If an assignment pointed to a "bad" group, it might be lost or need updating.
            // Actually assignments point to specific AssetFileId AND VersionGroupId.
            // We just changed VersionGroupId for those files.
            // We should update assignments to match.
            // But assignment logic uses (UserId, VersionGroupId) as PK sometimes? 
            // Logic in Assign: `DELETE ... WHERE UserId = @UserId AND VersionGroupId = @Gid`.
            // We should update the assignments for these files to have the new MasterGroupId.

            await pool.request()
                .input('Gid', sql.NVarChar, masterGroupId)
                .input('FolderId', sql.Int, group.FolderId)
                .input('Title', sql.NVarChar, group.Title)
                .query(`
                    UPDATE AssetFileAssignments
                    SET VersionGroupId = @Gid
                    FROM AssetFileAssignments afa
                    JOIN AssetFiles af ON afa.AssetFileId = af.Id
                    WHERE af.FolderId = @FolderId AND af.Title = @Title
                 `);

            console.log("    - Updated Assignments.");
        }

        console.log("Fix complete.");

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}

fixVersionGroups();
