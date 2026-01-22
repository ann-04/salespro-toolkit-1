
async function verifyAudit() {
    const API_URL = 'http://localhost:3000/api';
    console.log('--- STARTING AUDIT LOG VERIFICATION ---');

    try {
        // 1. Login
        console.log('1. Attempting Login...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@technobind.com', password: 'admin123' })
        });

        if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.statusText}`);
        const loginData = await loginRes.json();
        const token = loginData.token;
        console.log('✅ Login successful. Token received.');

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        // 2. Create Product
        console.log('2. Creating Test Product...');
        const productRes = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                name: 'AuditTestProduct',
                category: 'Test',
                description: 'Testing Audit Logs',
                problemSolved: 'None',
                itLandscape: [],
                deploymentModels: [],
                licensing: 'Free',
                pricingBand: 'Low',
                notToSell: [],
                capabilities: []
            })
        });
        if (!productRes.ok) throw new Error(`Create Product failed: ${productRes.statusText}`);
        console.log('✅ Product Created.');

        // 3. Update Product - We need ID. Since create doesn't return ID (it returns message), 
        // we either fetch all products or rely on the fact that audit log captures details.
        // Let's fetch products to find the ID.
        const productsRes = await fetch(`${API_URL}/products`, { headers });
        const products = await productsRes.json();
        const createdProduct = products.find(p => p.name === 'AuditTestProduct');

        if (!createdProduct) throw new Error('Created product not found in list');
        const pid = createdProduct.id;

        console.log('3. Updating Test Product...');
        const updateRes = await fetch(`${API_URL}/products/${pid}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                ...createdProduct,
                name: 'AuditTestProduct_Updated'
            })
        });
        if (!updateRes.ok) throw new Error(`Update Product failed`);
        console.log('✅ Product Updated.');

        // 4. Delete Product
        console.log('4. Deleting Test Product...');
        const deleteRes = await fetch(`${API_URL}/products/${pid}`, {
            method: 'DELETE',
            headers
        });
        if (!deleteRes.ok) throw new Error(`Delete Product failed`);
        console.log('✅ Product Deleted.');

        // 5. Verify Audit Logs
        console.log('5. Fetching Audit Logs...');
        const auditRes = await fetch(`${API_URL}/admin/audit-logs`, { headers });
        if (!auditRes.ok) {
            const errText = await auditRes.text();
            throw new Error(`Fetch Audit Logs failed: ${auditRes.status} ${auditRes.statusText} - ${errText}`);
        }

        const logs = await auditRes.json();
        console.log(`✅ Fetched ${logs.length} logs.`);

        // Check for specific actions
        const actions = logs.map(l => l.Action);
        const hasLogin = actions.includes('LOGIN');
        const hasCreate = actions.includes('CREATE_PRODUCT');
        const hasUpdate = actions.includes('UPDATE_PRODUCT');
        const hasDelete = actions.includes('DELETE_PRODUCT');

        if (hasLogin && hasCreate && hasUpdate && hasDelete) {
            console.log('🎉 SUCCESS: All expected actions were logged!');
            // Print recent logs
            console.log('Recent Logs:', logs.slice(0, 5).map(l => `${l.Action} on ${l.Entity} by ${l.UserEmail}`));
        } else {
            console.error('❌ FAILURE: Missing expected logs.');
            console.log('Found Actions:', actions.slice(0, 10));
            console.log('Expected: LOGIN, CREATE_PRODUCT, UPDATE_PRODUCT, DELETE_PRODUCT');
        }

    } catch (err) {
        console.error('❌ VERIFICATION FAILED:', err.message);
        if (err.cause) console.error(err.cause);
    }
}

verifyAudit();
