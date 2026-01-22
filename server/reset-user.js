import { connectToDatabase, sql } from './db.js';
import bcrypt from 'bcryptjs';

async function resetUser() {
    try {
        const pool = await connectToDatabase();

        // Find first non-admin user
        const result = await pool.request().query("SELECT TOP 1 * FROM Users WHERE Email != 'admin@technobind.com'");
        const user = result.recordset[0];

        if (!user) {
            console.log('❌ No non-admin user found.');
            process.exit(0);
        }

        const password = 'welcome123';
        const hash = await bcrypt.hash(password, 10);

        console.log(`Resetting password for: ${user.Email}`);

        await pool.request()
            .input('Id', sql.Int, user.Id)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                UPDATE Users 
                SET PasswordHash = @Hash, Status = 'APPROVED', MustChangePassword = 1
                WHERE Id = @Id
            `);

        console.log(`✅ Password reset successfully for ${user.Email}`);
        console.log(`Temporary Password: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error resetting user:', err);
        process.exit(1);
    }
}

resetUser();
