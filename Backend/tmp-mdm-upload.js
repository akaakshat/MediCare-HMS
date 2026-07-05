const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

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

    const uploadFile = path.join(__dirname, 'tmp-mdm-upload.xlsx');
    const workbook = xlsx.utils.book_new();
    const sheetData = [
      ['name', 'code', 'description'],
      ['Geriatrics', 'GERI', 'Geriatrics department for elderly care'],
      ['Pulmonology', 'PULM', 'Lung and respiratory care department'],
    ];
    const worksheet = xlsx.utils.aoa_to_sheet(sheetData);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
    xlsx.writeFile(workbook, uploadFile);
    console.log('Created upload file:', uploadFile);

    const formData = new FormData();
    const fileBuffer = fs.readFileSync(uploadFile);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    formData.append('file', blob, 'tmp-mdm-upload.xlsx');

    const resp = await fetch(`${base}/api/masters/upload/department`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    const data = await resp.json();
    console.log('STATUS', resp.status);
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
