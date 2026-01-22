
import { connectToDatabase, sql } from './db.js';
import bcrypt from 'bcryptjs';

async function reproduceFK() {
    const API_URL = 'http://localhost:3000/api';
    const EMAIL = 'ghost_user@example.com';
    const PASSWORD = 'password123';

    try {
        const pool = await connectToDatabase();

        // 1. Create User
        console.log('1. Setting up Ghost User...');
        const hash = await bcrypt.hash(PASSWORD, 10);
        await pool.request().input('Email', sql.NVarChar, EMAIL).query('DELETE FROM Users WHERE Email = @Email');

        // Insert and get ID
        const insertRes = await pool.request()
            .input('Name', sql.NVarChar, 'Ghost User')
            .input('Email', sql.NVarChar, EMAIL)
            .input('Hash', sql.NVarChar, hash)
            .query(`
                INSERT INTO Users(Name, Email, PasswordHash, Status, MustChangePassword, UserType)
                OUTPUT INSERTED.Id
                VALUES(@Name, @Email, @Hash, 'APPROVED', 0, 'INTERNAL')
            `);
        const userId = insertRes.recordset[0].Id;
        console.log(`✅ Ghost User Created (ID: ${userId}).`);

        // 2. Login
        console.log('2. Logging in...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL, password: PASSWORD })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login successful.');

        // 3. DELETE User (Simulating "another account" that might have been cleaned up or ID changed)
        console.log('3. DELETING User from DB...');
        await pool.request().input('Id', sql.Int, userId).query('DELETE FROM Users WHERE Id = @Id');
        console.log('✅ User Deleted.');

        // 4. Create Product
        console.log('4. Creating Product as Ghost User...');
        const productRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'GhostProduct_' + Date.now(),
                category: 'Test',
                description: 'Repro FK',
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
        console.log('✅ Product Created (Authenticated successfully despite deleted user).');

        // 5. Verify Log
        console.log('5. Checking if Audit Log exists...');
        // Since user is deleted, UserId in AuditLogs would be... well, the INSERT would fail!
        // We look for the product name in logs.
        const logRes1 = await pool.request()
            .input('EntityId', sql.NVarChar, 'GhostProduct%') // Check detail or entity ID
            // Actually, I can search by Details if I logged Name?
            // CREATE_PRODUCT logs name as EntityId? No, 'Product' is Entity, 'name' is EntityId arg.
            .query(`
                SELECT * FROM AuditLogs 
                WHERE Action = 'CREATE_PRODUCT' AND Entity = 'Product' 
                AND EntityId LIKE 'GhostProduct%'
            `);

        if (logRes1.recordset.length > 0) {
            console.log('🎉 SUCCESS: Log found! (Unexpected if FK exists)');
        } else {
            console.error('❌ FAILURE: No audit log found. FK constraint prevented insert.');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        process.exit(0);
    }
}

reproduceFK();
