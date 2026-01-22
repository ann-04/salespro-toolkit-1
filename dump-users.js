import { connectToDatabase } from './server/db.js';
import fs from 'fs';

async function dumpUsers() {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query('SELECT Id, Name, Email, Status FROM Users');
        fs.writeFileSync('users_dump.json', JSON.stringify(result.recordset, null, 2));
        console.log('Users dumped to users_dump.json');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

dumpUsers();
