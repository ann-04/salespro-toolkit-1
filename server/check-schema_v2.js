
const { connectToDatabase, sql } = require('./db');

async function checkSchema() {
    try {
        const pool = await connectToDatabase();

        console.log("--- Checking Tables ---");
        const tables = await pool.request().query("SELECT * FROM sys.tables");
        tables.recordset.forEach(t => console.log(`Table: ${t.name}`));

        console.log("\n--- Checking Roles Columns ---");
        const roleCols = await pool.request().query("SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Roles'");
        roleCols.recordset.forEach(c => console.log(`Column: ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

        console.log("\n--- Checking if RolePermissions exists ---");
        const rp = tables.recordset.find(t => t.name === 'RolePermissions');
        console.log("RolePermissions Table Exists:", !!rp);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        // process.exit(0); 
        // Don't exit formatted for tool
    }
}

checkSchema();
