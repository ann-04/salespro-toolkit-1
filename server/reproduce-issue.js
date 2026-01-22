
import { connectToDatabase, sql } from './db.js';
import bcrypt from 'bcryptjs';

async function reproduce() {
    const API_URL = 'http://localhost:3000/api';
    const EMAIL = 'testuser_repro@example.com';
    const PASSWORD = 'password123';

    try {
        const pool = await connectToDatabase();

        // 1. Create/Reset Test User
        console.log('1. Setting up Test User...');
        const hash = await bcrypt.hash(PASSWORD, 10);

        // Delete if exists
        await pool.request().input('Email', sql.NVarChar, EMAIL).query('DELETE FROM Users WHERE Email = @Email');

        // Insert
        await pool.request()
            .input('Name', sql.NVarChar, 'Test User Repro')
            .input('Email', sql.NVarChar, EMAIL)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                INSERT INTO Users(Name, Email, PasswordHash, Status, MustChangePassword, UserType, PartnerCategory)
                VALUES(@Name, @Email, @Hash, 'APPROVED', 0, 'PARTNER', 'Gold')
            `);
        console.log('✅ Test User Created.');

        // 2. Login
        console.log('2. Logging in as Test User...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error('Login failed: ' + await loginRes.text());
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login successful. User ID:', loginData.user.id);

        // 3. Create Product
        console.log('3. Creating Product as Test User...');
        const productRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'ReproProduct_' + Date.now(),
                category: 'Test',
                description: 'Repro',
                problemSolved: 'None',
                itLandscape: [],
                deploymentModels: [],
                licensing: 'Free',
                pricingBand: 'Low',
                notToSell: [],
                capabilities: []
            })
        });

        if (!productRes.ok) throw new Error('Create Product failed: ' + await productRes.text());
        console.log('✅ Product Created.');

        // 4. Verify Log
        console.log('4. Checking Audit Logs...');
        // Need to check specific log for this user
        const logRes1 = await pool.request()
            .input('Email', sql.NVarChar, EMAIL)
            .query(`
                SELECT TOP 1 * FROM AuditLogs a
                JOIN Users u ON a.UserId = u.Id
                WHERE u.Email = @Email AND a.Action = 'CREATE_PRODUCT'
                ORDER BY a.Timestamp DESC
            `);

        if (logRes1.recordset.length > 0) {
            console.log('🎉 SUCCESS: Log found!');
            console.log(logRes1.recordset[0]);
        } else {
            console.error('❌ FAILURE: No audit log found for this action.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        process.exit(0);
    }
}

reproduce();
