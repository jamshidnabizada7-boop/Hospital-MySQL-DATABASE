const http = require('http');

const BASE_URL = 'http://localhost:5000';

function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(body);
        } catch (e) {}
        resolve({ statusCode: res.statusCode, body: parsed || body });
      });
    });
    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function login(username, password = 'admin123') {
  const res = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, password });

  if (res.statusCode === 200 && res.body && res.body.token) {
    return res.body.token;
  }
  throw new Error(`Login failed for user ${username}: status ${res.statusCode}, body: ${JSON.stringify(res.body)}`);
}

async function runTests() {
  console.log('====================================================');
  console.log(' EMPIRICAL RBAC VERIFICATION FOR /api/employees');
  console.log('====================================================\n');

  const results = [];
  let allPassed = true;

  function record(testName, expected, actual, body) {
    const passed = expected.includes(actual);
    if (!passed) allPassed = false;
    const statusStr = passed ? 'PASS' : 'FAIL';
    console.log(`[${statusStr}] ${testName} -> Expected: ${expected.join('/')}, Got: ${actual}`);
    results.push({ testName, expected, actual, passed, body });
  }

  // 1. Unauthenticated Requests
  console.log('--- 1. Testing Unauthenticated Access ---');
  const verbs = [
    { method: 'GET', path: '/api/employees' },
    { method: 'POST', path: '/api/employees', data: { first_name: 'Test' } },
    { method: 'PUT', path: '/api/employees/1', data: { first_name: 'Test' } },
    { method: 'DELETE', path: '/api/employees/1' }
  ];

  for (const v of verbs) {
    const res = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: v.path,
      method: v.method
    }, v.data);
    record(`Unauthenticated ${v.method} ${v.path}`, [401], res.statusCode, res.body);
  }

  // 2. Non-Admin Roles
  const nonAdminUsers = [
    { username: 'dr_kamal', role: 'Doctor' },
    { username: 'receptionist1', role: 'Receptionist' },
    { username: 'labtech1', role: 'Lab Tech' },
    { username: 'pharmacist1', role: 'Pharmacist' },
    { username: 'accountant1', role: 'Accountant' }
  ];

  console.log('\n--- 2. Testing Non-Admin Roles (Expected 403 Forbidden) ---');
  for (const userObj of nonAdminUsers) {
    console.log(`\nTesting user: ${userObj.username} (${userObj.role})`);
    let token;
    try {
      token = await login(userObj.username);
    } catch (e) {
      console.error(`Failed to login ${userObj.username}:`, e.message);
      allPassed = false;
      continue;
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const roleVerbs = [
      { method: 'GET', path: '/api/employees' },
      { method: 'POST', path: '/api/employees', data: { first_name: 'Test', last_name: 'User', job_title: 'Receptionist', phone: '0700000000', email: 'test@test.com', dept_id: 1 } },
      { method: 'PUT', path: '/api/employees/1', data: { first_name: 'Updated' } },
      { method: 'DELETE', path: '/api/employees/1' }
    ];

    for (const v of roleVerbs) {
      const res = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: v.path,
        method: v.method,
        headers
      }, v.data);
      record(`Role [${userObj.role}] ${v.method} ${v.path}`, [403], res.statusCode, res.body);
    }
  }

  // 3. Admin Role
  console.log('\n--- 3. Testing Admin Role (Expected 200/201 Success) ---');
  let adminToken;
  try {
    adminToken = await login('admin');
  } catch (e) {
    console.error('Failed to login admin:', e.message);
    allPassed = false;
    return;
  }

  const adminHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  };

  // GET
  const getRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/employees',
    method: 'GET',
    headers: adminHeaders
  });
  record('Admin GET /api/employees', [200], getRes.statusCode, getRes.body);

  // POST
  const testEmp = {
    first_name: 'Empirical',
    last_name: 'TestUser',
    gender: 'Female',
    date_of_birth: '1995-05-15',
    job_title: 'Receptionist',
    phone: '0788776655',
    email: 'empirical.testuser@hospital.com',
    dept_id: 1,
    salary: 30000,
    hire_date: '2026-08-12'
  };

  const postRes = await makeRequest({
    hostname: 'localhost',
    port: 5000,
    path: '/api/employees',
    method: 'POST',
    headers: adminHeaders
  }, testEmp);

  record('Admin POST /api/employees', [201], postRes.statusCode, postRes.body);

  let createdEmpId = null;
  if (postRes.statusCode === 201 && postRes.body && postRes.body.emp_id) {
    createdEmpId = postRes.body.emp_id;
  }

  if (createdEmpId) {
    // PUT
    const putRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/employees/${createdEmpId}`,
      method: 'PUT',
      headers: adminHeaders
    }, {
      ...testEmp,
      first_name: 'EmpiricalUpdated',
      phone: '0788776699'
    });
    record(`Admin PUT /api/employees/${createdEmpId}`, [200], putRes.statusCode, putRes.body);

    // DELETE
    const deleteRes = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/employees/${createdEmpId}`,
      method: 'DELETE',
      headers: adminHeaders
    });
    record(`Admin DELETE /api/employees/${createdEmpId}`, [200], deleteRes.statusCode, deleteRes.body);
  } else {
    console.error('Skipping PUT and DELETE for Admin because POST failed to return emp_id');
    allPassed = false;
  }

  console.log('\n====================================================');
  console.log(` FINAL VERDICT: ${allPassed ? 'ALL TESTS PASSED - APPROVE' : 'SOME TESTS FAILED - REQUEST_CHANGES'}`);
  console.log('====================================================');
  process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
  console.error('Unhandled error in test runner:', err);
  process.exit(1);
});
