import 'dotenv/config'; // Automatically loads .env or .env.local if present
import { connectToDatabase, sql } from './server/db.js';

async function debugVersions() {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT Id, Title, VersionGroupId, VersionNumber, AudienceLevel, CreatedAt 
            FROM AssetFiles 
            WHERE IsDeleted = 0
            ORDER BY Title, CreatedAt DESC
        `);

        console.log("FILES_JSON_START");
        console.log(JSON.stringify(result.recordset, null, 2));
        console.log("FILES_JSON_END");

        const assignments = await pool.request().query('SELECT * FROM AssetFileAssignments');
        console.log('Assignments:');
        console.log("ASSIGNMENTS_JSON_START");
        console.log(JSON.stringify(assignments.recordset, null, 2));
        console.log("ASSIGNMENTS_JSON_END");

    } catch (err) {
        console.error(err);
    }
    process.exit();
}

debugVersions();
