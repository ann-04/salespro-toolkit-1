
import { connectToDatabase, sql } from './db.js';
import { logAudit } from './audit.js';

async function testFix() {
    try {
        const pool = await connectToDatabase();
        const badId = 999999;
        console.log('Testing logAudit with invalid UserId:', badId);

        await logAudit(pool, badId, 'TEST_AUDIT_FIX', 'TestEntity', '123', { test: true });

        // Check DB
        const res = await pool.request().query("SELECT * FROM AuditLogs WHERE Action = 'TEST_AUDIT_FIX'");
        if (res.recordset.length > 0) {
            console.log('✅ Fix Verified: Log created despite invalid UserID.');
            console.log('Logged UserID:', res.recordset[0].UserId); // Should be null
            console.log('Details:', res.recordset[0].Details);

            // Cleanup
            await pool.request().query("DELETE FROM AuditLogs WHERE Action = 'TEST_AUDIT_FIX'");
        } else {
            console.error('❌ Fix Failed: No log created.');
        }
    } catch (err) {
        console.error('Test Error:', err);
    } finally {
        process.exit(0);
    }
}
testFix();
