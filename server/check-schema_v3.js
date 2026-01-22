
import { connectToDatabase, sql } from './db.js';

async function checkSchema() {
    try {
        const pool = await connectToDatabase();

        console.log("--- Checking Tables ---");
        const tables = await pool.request().query("SELECT * FROM sys.tables");
        tables.recordset.forEach(t => console.log(`Table: ${t.name}`));

        console.log("\n--- Checking Roles Columns ---");
        // Check if Roles table exists first
        if (tables.recordset.some(t => t.name === 'Roles')) {
            const roleCols = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Roles'");
            roleCols.recordset.forEach(c => console.log(`Column: ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
        } else {
            console.log("Roles table NOT FOUND");
        }

        const rp = tables.recordset.find(t => t.name === 'RolePermissions');
        console.log("\nRolePermissions Table Exists:", !!rp);

        const p = tables.recordset.find(t => t.name === 'Permissions');
        console.log("Permissions Table Exists:", !!p);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

checkSchema();
