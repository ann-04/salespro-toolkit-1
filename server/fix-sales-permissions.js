
import { connectToDatabase, sql } from './db.js';

async function fixPermissions() {
    try {
        const pool = await connectToDatabase();

        console.log('Fixing Sales Manager Permissions...');

        // 1. Get IDs
        const roleRes = await pool.request().query("SELECT Id FROM Roles WHERE Name = 'Sales Manager'");
        const roleId = roleRes.recordset[0]?.Id;

        if (!roleId) throw new Error('Sales Manager Role not found');

        const productsModRes = await pool.request().query("SELECT Id FROM Modules WHERE Name = 'Products'");
        const productsModId = productsModRes.recordset[0]?.Id;

        // 2. Define Permissions to SET
        // We want: PRODUCTS_CREATE, PRODUCTS_READ
        // We do NOT want: PRODUCTS_UPDATE, PRODUCTS_DELETE

        const actionsToAdd = ['CREATE', 'READ'];
        const actionsToRemove = ['UPDATE', 'DELETE'];

        for (const action of actionsToAdd) {
            const permRes = await pool.request().query(`SELECT Id FROM Permissions WHERE ModuleId = ${productsModId} AND Action = '${action}'`);
            const permId = permRes.recordset[0]?.Id;

            // Insert if not exists
            try {
                await pool.request().query(`INSERT INTO RolePermissions (RoleId, PermissionId) VALUES (${roleId}, ${permId})`);
                console.log(`+ Added PRODUCTS_${action}`);
            } catch (err) {
                // Ignore duplicate key errors
                if (err.number !== 2627) console.error(err);
                else console.log(`= PRODUCTS_${action} already exists`);
            }
        }

        for (const action of actionsToRemove) {
            const permRes = await pool.request().query(`SELECT Id FROM Permissions WHERE ModuleId = ${productsModId} AND Action = '${action}'`);
            const permId = permRes.recordset[0]?.Id;

            await pool.request().query(`DELETE FROM RolePermissions WHERE RoleId = ${roleId} AND PermissionId = ${permId}`);
            console.log(`- Removed PRODUCTS_${action}`);
        }

        console.log('✅ Sales Manager Permissions Updated.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit(0);
    }
}

fixPermissions();
