import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Mock a token - we need a real one. 
// Login as admin first.
async function testRevert() {
    try {
        const authRes = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'admin@salespro.com',
            password: 'admin123'
        });
        const token = authRes.data.token;
        console.log('Got Token');

        // Get Assignment info from previous debug output or hardcode
        // We know UserId=2, VersionGroupId='395DAA2F-761D-4750-B211-ACF0202B892B' (from previous step 556)
        // AssetFileId = -1 (Revert)

        const payload = {
            userId: 2,
            assetFileId: -1,
            versionGroupId: '395DAA2F-761D-4750-B211-ACF0202B892B'
        };

        console.log('Sending Revert Request:', payload);

        const res = await axios.post('http://localhost:3000/api/assets/admin/assign-version', payload, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Response:', res.data);

    } catch (err) {
        console.error('Error:', err.response ? err.response.data : err.message);
    }
}

testRevert();
