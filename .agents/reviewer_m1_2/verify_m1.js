const http = require('http');
require('../../backend/node_modules/dotenv').config({ path: './backend/.env' });
const db = require('../../backend/db');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const payload = postData ? (typeof postData === 'string' ? postData : JSON.stringify(postData)) : null;
    const reqOptions = {
      ...options,
      headers: {
        ...options.headers,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTests() {
  console.log('==========================================');
  console.log(' REVIEWER M1-2 INDEPENDENT VERIFICATION ');
  console.log('==========================================');

  // 1. Admin login to get token
  const loginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });

  if (loginRes.status !== 200 || !loginRes.data.token) {
    console.error('FAIL: Admin login failed', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.token;
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
  console.log('PASS 1: Admin authenticated successfully.');

  // 2. POST /api/employees with Admin role (Hospital_Admin) and NO dept_id
  const timestamp = Date.now();
  const adminEmpData = {
    first_name: `RevAdmin`,
    last_name: `Test${timestamp}`,
    gender: 'Male',
    date_of_birth: '1990-01-01',
    job_title: 'Admin', // should map to Role_ID 1 (Hospital_Admin)
    phone: `07${timestamp.toString().slice(-8)}`,
    email: `revadmin.${timestamp}@test.com`,
    salary: 50000.00
  };

  const createAdminRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/employees',
    method: 'POST',
    headers: authHeaders
  }, adminEmpData);

  if (createAdminRes.status !== 201 || !createAdminRes.data.success) {
    console.error('FAIL 2: POST /api/employees for Admin role failed', createAdminRes);
    process.exit(1);
  }
  const newAdminEmpId = createAdminRes.data.emp_id;
  const newAdminUserId = createAdminRes.data.user_id;
  const newAdminUsername = createAdminRes.data.username;
  console.log(`PASS 2: Created Admin Employee (emp_id=${newAdminEmpId}, user_id=${newAdminUserId}, username=${newAdminUsername})`);

  // Verify DB state for new Admin: Role_ID must be 1 and Dept_ID must be NULL
  const [empRows] = await db.query('SELECT Dept_ID, User_ID FROM Employee WHERE Emp_ID = ?', [newAdminEmpId]);
  const [userRows] = await db.query('SELECT Role_ID FROM App_User WHERE User_ID = ?', [newAdminUserId]);

  if (empRows[0].Dept_ID !== null) {
    console.error(`FAIL 2b: Dept_ID is ${empRows[0].Dept_ID}, expected NULL for non-doctor Admin`);
    process.exit(1);
  }
  if (userRows[0].Role_ID !== 1) {
    console.error(`FAIL 2c: Role_ID is ${userRows[0].Role_ID}, expected 1 (Hospital_Admin) for Admin role`);
    process.exit(1);
  }
  console.log('PASS 2d: Verified DB: Role_ID = 1 (Hospital_Admin) and Dept_ID = NULL.');

  // Verify instant login for newly created Admin account
  const newAdminLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: newAdminUsername, password: 'admin123' });

  if (newAdminLoginRes.status !== 200 || newAdminLoginRes.data.user.role !== 'Hospital_Admin') {
    console.error('FAIL 2e: Login with auto-provisioned Admin failed', newAdminLoginRes);
    process.exit(1);
  }
  const newAdminToken = newAdminLoginRes.data.token;
  console.log('PASS 2f: Auto-provisioned Admin successfully logged in with Hospital_Admin role.');

  // 3. PUT /api/employees/:id with custom password
  const customPass = 'NewSecurePass99!';
  const putRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/employees/${newAdminEmpId}`,
    method: 'PUT',
    headers: authHeaders
  }, {
    first_name: `RevAdmin`,
    last_name: `Test${timestamp}-Updated`,
    gender: 'Male',
    date_of_birth: '1990-01-01',
    job_title: 'Hospital_Admin',
    phone: `07${timestamp.toString().slice(-8)}`,
    email: `revadmin.${timestamp}@test.com`,
    salary: 55000.00,
    new_password: customPass
  });

  if (putRes.status !== 200 || !putRes.data.success) {
    console.error('FAIL 3: PUT /api/employees/:id failed', putRes);
    process.exit(1);
  }
  console.log('PASS 3: PUT /api/employees/:id updated record with custom password.');

  // Verify login with OLD password fails (401)
  const oldLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: newAdminUsername, password: 'admin123' });

  if (oldLoginRes.status !== 401) {
    console.error('FAIL 3b: Expected 401 login failure with old password, got', oldLoginRes.status);
    process.exit(1);
  }

  // Verify login with NEW custom password succeeds (200)
  const newPassLoginRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: newAdminUsername, password: customPass });

  if (newPassLoginRes.status !== 200 || !newPassLoginRes.data.token) {
    console.error('FAIL 3c: Login with custom new password failed', newPassLoginRes);
    process.exit(1);
  }
  console.log('PASS 3d: Password hash updated cleanly; old password rejected, new password accepted.');

  // 4. DELETE /api/employees/:id lockout protection check (attempt self-deletion as logged-in admin)
  // New admin token attempts to delete itself (newAdminEmpId)
  const selfDelRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/employees/${newAdminEmpId}`,
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${newAdminToken}`
    }
  });

  if (selfDelRes.status !== 400 || selfDelRes.data.success !== false) {
    console.error('FAIL 4: Expected 400 Bad Request on self-deletion attempt, got', selfDelRes);
    process.exit(1);
  }
  console.log(`PASS 4: Self-deletion lockout protection active (HTTP 400 returned: "${selfDelRes.data.message}").`);

  // 5. Delete newly created Admin using original admin token (normal deletion)
  const deleteRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/employees/${newAdminEmpId}`,
    method: 'DELETE',
    headers: authHeaders
  });

  if (deleteRes.status !== 200 || !deleteRes.data.success) {
    console.error('FAIL 5: Admin deleting test employee failed', deleteRes);
    process.exit(1);
  }
  console.log('PASS 5: Test Admin employee successfully deleted by primary admin token.');

  // Verify record and linked user are completely purged from DB
  const [empAfter] = await db.query('SELECT * FROM Employee WHERE Emp_ID = ?', [newAdminEmpId]);
  const [userAfter] = await db.query('SELECT * FROM App_User WHERE User_ID = ?', [newAdminUserId]);
  if (empAfter.length > 0 || userAfter.length > 0) {
    console.error('FAIL 5b: Employee or App_User record still exists in DB after deletion!');
    process.exit(1);
  }
  console.log('PASS 5c: Employee and App_User database records purged cleanly.');

  console.log('==========================================');
  console.log(' ALL VERIFICATION CHECKS PASSED PERFECTLY ');
  console.log('==========================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('ERROR in test run:', err);
  process.exit(1);
});
