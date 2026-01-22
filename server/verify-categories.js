
const API_URL = 'http://localhost:3000/api';

async function verifyCategories() {
    try {
        // 1. Login
        console.log('1. Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@technobind.com', password: 'admin123' })
        });
        const { token } = await loginRes.json();
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

        // 2. Create Category
        console.log('2. Create Category...');
        const createRes = await fetch(`${API_URL}/categories`, {
            method: 'POST', headers, body: JSON.stringify({ name: 'TestCat_' + Date.now() })
        });
        const created = await createRes.json();
        console.log('Created: ', created);
        // Note: Create endpoint usually returns the object or ID. IF not, we fetch all.

        // 3. Fetch to find ID
        const listRes = await fetch(`${API_URL}/categories`, { headers });
        const categories = await listRes.json();
        const testCat = categories.find(c => c.name.startsWith('TestCat_'));

        if (!testCat) throw new Error('Category creation failed');
        console.log('Found ID:', testCat.id);

        // 4. Update
        console.log('4. Update Category...');
        const updateRes = await fetch(`${API_URL}/categories/${testCat.id}`, {
            method: 'PUT', headers, body: JSON.stringify({ name: testCat.name + '_UPDATED' })
        });
        if (updateRes.ok) console.log('✅ Update Success');
        else console.error('❌ Update Failed', await updateRes.text());

        // 5. Delete
        console.log('5. Delete Category...');
        const delRes = await fetch(`${API_URL}/categories/${testCat.id}`, { method: 'DELETE', headers });
        if (delRes.ok) console.log('✅ Delete Success');
        else console.error('❌ Delete Failed', await delRes.text());

    } catch (err) {
        console.error(err);
    }
}

verifyCategories();
