
const API_URL = 'http://localhost:3000/api';

async function testPartnerCats() {
    try {
        console.log('Testing Partner Categories API...');

        // Login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            body: JSON.stringify({ email: 'admin@technobind.com', password: 'admin123' }),
            headers: { 'Content-Type': 'application/json' }
        });
        const { token } = await loginRes.json();
        const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // GET
        console.log('GET...');
        const getRes = await fetch(`${API_URL}/admin/partner-categories`, { headers });
        console.log('GET Status:', getRes.status);
        const cats = await getRes.json();
        console.log('Categories:', cats);

        // POST
        console.log('POST...');
        const postRes = await fetch(`${API_URL}/admin/partner-categories`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: 'Platinum_' + Date.now() })
        });
        console.log('POST Status:', postRes.status);

        // GET Again
        const getRes2 = await fetch(`${API_URL}/admin/partner-categories`, { headers });
        const cats2 = await getRes2.json();
        console.log('Categories After Add:', cats2.map(c => c.name));

    } catch (err) {
        console.error('TEST FAILED:', err);
    }
}

testPartnerCats();
