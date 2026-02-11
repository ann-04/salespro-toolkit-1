import 'dotenv/config';
import { connectToDatabase, sql } from './server/db.js';

async function debugAssignments() {
    try {
        const pool = await connectToDatabase();

        console.log("--- ASSIGNMENTS ---");
        const assigns = await pool.request().query(`
            SELECT 
                afa.UserId, 
                u.Name as UserName, 
                afa.AssetFileId, 
                af.Title, 
                af.VersionNumber, 
                af.VersionGroupId 
            FROM AssetFileAssignments afa
            JOIN Users u ON afa.UserId = u.Id
            JOIN AssetFiles af ON afa.AssetFileId = af.Id
        `);
        console.log("ASSIGN_JSON_START");
        console.log(JSON.stringify(assigns.recordset, null, 2));
        console.log("ASSIGN_JSON_END");

        const files = await pool.request().query(`
            SELECT Id, Title, VersionGroupId, VersionNumber, AudienceLevel
            FROM AssetFiles 
            WHERE Title LIKE '%Syllabus%' AND IsDeleted=0
            ORDER BY VersionNumber
        `);

        console.log("FILES_JSON_START");
        console.log(JSON.stringify(files.recordset, null, 2));
        console.log("FILES_JSON_END");

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}

debugAssignments();
