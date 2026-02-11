import 'dotenv/config';
import { connectToDatabase, sql } from './server/db.js';

async function revertV2toV1() {
    try {
        const pool = await connectToDatabase();

        // Target: File 21 (Title: Syllabus)
        // If it is the ONLY file in its group, it should be V1.
        // My previous script might have made it V2 if it thought it was the second file in a group.

        const files = await pool.request()
            .input('Title', sql.NVarChar, 'Syllabus')
            .query('SELECT * FROM AssetFiles WHERE Title = @Title AND IsDeleted=0 ORDER BY CreatedAt');

        const fileList = files.recordset;
        console.log(`Found ${fileList.length} files for 'Syllabus'`);

        for (let i = 0; i < fileList.length; i++) {
            const f = fileList[i];
            const correctVersion = i + 1;

            if (f.VersionNumber !== correctVersion) {
                console.log(`Fixing File ${f.Id}: V${f.VersionNumber} -> V${correctVersion}`);
                await pool.request()
                    .input('Id', sql.Int, f.Id)
                    .input('Ver', sql.Int, correctVersion)
                    .query('UPDATE AssetFiles SET VersionNumber = @Ver WHERE Id = @Id');
            } else {
                console.log(`File ${f.Id} is correctly V${f.VersionNumber}`);
            }
        }

    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}

revertV2toV1();
