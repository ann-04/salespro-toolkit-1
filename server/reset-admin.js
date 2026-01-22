import { connectToDatabase, sql } from './db.js';
import bcrypt from 'bcryptjs';

async function resetAdmin() {
    try {
        const pool = await connectToDatabase();
        const password = 'admin123';
        const hash = await bcrypt.hash(password, 10);

        console.log(`Resetting admin password to: ${password}`);

        await pool.request()
            .input('Hash', sql.NVarChar, hash)
            .query(`
                UPDATE Users 
                SET PasswordHash = @Hash, Status = 'APPROVED', MustChangePassword = 0
                WHERE Email = 'admin@technobind.com'
            `);

        console.log('✅ Admin password reset successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error resetting admin:', err);
        process.exit(1);
    }
}

resetAdmin();
