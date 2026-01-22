import { connectToDatabase } from './server/db.js';

async function checkUsers() {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT Id, Name, Email, UserType, PartnerCategory, RoleId FROM Users');
        console.log(JSON.stringify(result.recordset, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkUsers();
