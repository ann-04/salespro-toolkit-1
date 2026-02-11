import 'dotenv/config';
import { connectToDatabase, sql } from './server/db.js';

async function checkSpecificAssignment() {
    try {
        const pool = await connectToDatabase();

        const result = await pool.request().query(`
            SELECT 
                afa.UserId, 
                u.Name as UserName, 
                afa.AssetFileId, 
                af.Title, 
                af.VersionNumber as AssignedVersionNumber,
                af.VersionGroupId
            FROM AssetFileAssignments afa
            JOIN Users u ON afa.UserId = u.Id
            JOIN AssetFiles af ON afa.AssetFileId = af.Id
        `);

        console.log("Current Assignments:");
        console.log(JSON.stringify(result.recordset, null, 2));

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}

checkSpecificAssignment();
