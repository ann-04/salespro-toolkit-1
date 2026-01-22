
async function checkTimezone() {
    const API_URL = 'http://localhost:3000/api';
    const localTime = new Date().toISOString();
    console.log(`Local Client Time (UTC): ${localTime}`);

    try {
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@technobind.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token;

        // Perform an action to generate a fresh log
        await fetch(`${API_URL}/admin/business-units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ name: 'TimeTestBU_' + Date.now() })
        });

        // Fetch logs
        const auditRes = await fetch(`${API_URL}/admin/audit-logs`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const logs = await auditRes.json();

        if (logs.length > 0) {
            const latestLog = logs[0];
            console.log('Latest Log Timestamp from API (Raw):', latestLog.Timestamp);

            const dateObj = new Date(latestLog.Timestamp);
            const now = new Date();
            const diffMins = (now - dateObj) / 1000 / 60;

            console.log('Parsed as JS Date object:', dateObj.toString());
            console.log('Parsed as ISO string:', dateObj.toISOString());
            console.log('Time difference (min):', diffMins.toFixed(4));

            if (Math.abs(diffMins) < 5) {
                console.log('✅ PASS: Time difference is negligible (within 5 mins). UTC storage confirmed.');
            } else {
                console.log('❌ FAIL: Significant time discrepancy detected.');
            }

        } else {
            console.log('No logs found.');
        }

    } catch (err) {
        console.error(err);
    }
}

checkTimezone();
