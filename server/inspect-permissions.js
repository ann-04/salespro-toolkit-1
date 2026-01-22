
import { connectToDatabase } from './db.js';

async function checkPermissionsSchema() {
    try {
        const pool = await connectToDatabase();
        console.log("--- Permissions Table Columns ---");
        const cols = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Permissions'");
        if (cols.recordset.length === 0) {
            console.log("Permissions table does NOT exist.");
        } else {
            cols.recordset.forEach(c => console.log(`${c.COLUMN_NAME} (${c.DATA_TYPE})`));
        }

        console.log("\n--- RolePermissions Table Columns ---");
        const rpCols = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'RolePermissions'");
        rpCols.recordset.forEach(c => console.log(`${c.COLUMN_NAME} (${c.DATA_TYPE})`));

    } catch (err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

checkPermissionsSchema();
