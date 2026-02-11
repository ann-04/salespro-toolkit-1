import 'dotenv/config';
import { connectToDatabase, sql } from './server/db.js';

async function verifyVersions() {
    try {
        const pool = await connectToDatabase();
        console.log("Connected. Retrieving simplified file list...");

        const result = await pool.request().query(`
            SELECT Id, Title, VersionGroupId, VersionNumber, AudienceLevel, CreatedAt 
            FROM AssetFiles 
            WHERE IsDeleted = 0
            ORDER BY Title, CreatedAt ASC
        `);

        console.log(JSON.stringify(result.recordset, null, 2));

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}

verifyVersions();
