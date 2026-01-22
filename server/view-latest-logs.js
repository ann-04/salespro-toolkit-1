
import { connectToDatabase, sql } from './db.js';

async function viewLogs() {
    try {
        const pool = await connectToDatabase();
        const result = await pool.request().query(`
            SELECT TOP 5 a.Id, a.Action, a.Entity, a.Timestamp, a.UserId, u.Name 
            FROM AuditLogs a
            LEFT JOIN Users u ON a.UserId = u.Id
            WHERE a.Action = 'CREATE_PRODUCT'
            ORDER BY a.Timestamp DESC
        `);

        console.log('--- LATEST 5 CREATE_PRODUCT LOGS ---');
        console.table(result.recordset);
        process.exit(0);
    } catch (err) {
        console.error('Error fetching logs:', err);
        process.exit(1);
    }
}

viewLogs();
