import { connectToDatabase, sql } from './db.js';

async function restrictPermissions() {
    try {
        console.log('Connecting to database...');
        const pool = await connectToDatabase();

        const roleRes = await pool.request().query("SELECT Id FROM Roles WHERE Name = 'Sales Manager'");
        const roleId = roleRes.recordset[0]?.Id;

        const modRes = await pool.request().query("SELECT Id FROM Modules WHERE Name = 'Products'");
        const modId = modRes.recordset[0]?.Id;

        if (!roleId || !modId) {
            console.error('Available Roles:', (await pool.request().query('SELECT Name FROM Roles')).recordset);
            console.error('Available Modules:', (await pool.request().query('SELECT Name FROM Modules')).recordset);
            throw new Error(`Could not find Role ID for 'Sales Manager' or Module ID for 'Products'`);
        }

        console.log(`Revoking CREATE and DELETE permissions for Role ${roleId} on Module ${modId}...`);

        const actions = ['CREATE', 'DELETE'];
        for (const action of actions) {
            const result = await pool.request()
                .input('RoleId', sql.Int, roleId)
                .input('ModId', sql.Int, modId)
                .input('Action', sql.NVarChar, action)
                .query(`
                    DELETE rp 
                    FROM RolePermissions rp
                    JOIN Permissions p ON rp.PermissionId = p.Id
                    WHERE rp.RoleId = @RoleId 
                      AND p.ModuleId = @ModId 
                      AND p.Action = @Action
                `);
            console.log(`Revoked ${action}: ${result.rowsAffected[0]} rows deleted.`);
        }

        console.log('Permissions updated successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

restrictPermissions();
