const fetch = globalThis.fetch || require('node-fetch');

(async () => {
  try {
    const base = 'http://localhost:5000';
    const loginResp = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@hospital.local', password: 'Admin@123456' }),
    });
    const loginData = await loginResp.json();
    if (!loginResp.ok) {
      console.error('Login failed', loginData);
      process.exit(1);
    }
    const token = loginData.token;

    const resp = await fetch(`${base}/api/masters/patient_type`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: 'Teleconsultation', code: 'TELE', description: 'Teleconsultation patient type' }),
    });
    const data = await resp.json();
    console.log('STATUS', resp.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
