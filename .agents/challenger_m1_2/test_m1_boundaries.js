/**
 * test_m1_boundaries.js
 * Empirical stress test for M1 backend endpoints:
 * 1. PUT /api/employees/:id edge cases (invalid ID 404, blank password vs non-empty password update & login verify)
 * 2. POST /api/employees edge cases (dept_id omitted for doctor vs non-doctor roles, missing fields)
 * 3. Self-deletion lockout boundary conditions (attempting to delete logged-in admin's own employee ID)
 */

const BASE_URL = 'http://localhost:5000/api';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const { headers, ...otherOptions } = options;
  const res = await fetch(url, {
    ...otherOptions,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    json = { rawText: text };
  }
  if (res.status >= 500) {
    console.log(`[DEBUG 500] ${options.method || 'GET'} ${path} -> HTTP ${res.status}:`, json);
  }
  return { status: res.status, data: json };
}

async function runTests() {
  console.log('=== STRESS-TESTING M1 BACKEND ENDPOINTS ===\n');

  let passed = 0;
  let failed = 0;
  const failures = [];

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
      failures.push(testName);
    }
  }

  // 0. Login as default Admin
  console.log('--- Step 0: Admin Authentication ---');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });

  assert(adminLogin.status === 200 && adminLogin.data.token, '0.1 Default Admin Login', `HTTP ${adminLogin.status}`);
  if (!adminLogin.data.token) {
    console.error('Failed to log in as admin. Aborting tests.');
    process.exit(1);
  }

  const adminToken = adminLogin.data.token;
  const adminHeaders = { Authorization: `Bearer ${adminToken}` };

  // ==========================================
  // Category 1: PUT /api/employees/:id Edge Cases
  // ==========================================
  console.log('\n--- Category 1: PUT /api/employees/:id Edge Cases ---');

  // Test 1.1: Invalid Employee ID -> 404
  const put404 = await request('/employees/999999', {
    method: 'PUT',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Nobody',
      job_title: 'Receptionist',
      phone: '0700000000',
      email: 'nobody999999@hospital.com',
    }),
  });
  assert(put404.status === 404, '1.1 PUT /api/employees/999999 returns 404 Not Found', `HTTP ${put404.status}`);

  // Test 1.2: Create test employee for password update tests
  const randNum1 = Math.floor(1000 + Math.random() * 9000);
  const testEmp1Body = {
    first_name: 'Pass',
    last_name: `Test${randNum1}`,
    gender: 'Female',
    date_of_birth: '1992-05-15',
    job_title: 'Receptionist',
    phone: `0711${randNum1}`,
    email: `pass.test${randNum1}@hospital.com`,
    salary: 25000,
  };

  const createEmp1 = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify(testEmp1Body),
  });

  assert(createEmp1.status === 201 && createEmp1.data.emp_id, '1.2 Create Employee for Password Tests', `Emp_ID: ${createEmp1.data?.emp_id}`);
  const emp1Id = createEmp1.data?.emp_id;
  const emp1Username = createEmp1.data?.username;

  if (emp1Id && emp1Username) {
    // Test 1.3: PUT with blank password (new_password: "") -> password unchanged
    const putBlank = await request(`/employees/${emp1Id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...testEmp1Body,
        last_name: `Test${randNum1}-Blank`,
        new_password: '',
      }),
    });
    assert(putBlank.status === 200, '1.3a PUT /api/employees/:id with blank new_password returns 200', `HTTP ${putBlank.status}`);

    // Verify login with original default password 'admin123' still succeeds
    const loginDefault = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: emp1Username, password: 'admin123' }),
    });
    assert(loginDefault.status === 200 && loginDefault.data.token, '1.3b Login with original password after blank password PUT succeeds', `HTTP ${loginDefault.status}`);

    // Test 1.4: PUT with whitespace-only password (password: "   ") -> password unchanged
    const putWhitespace = await request(`/employees/${emp1Id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...testEmp1Body,
        last_name: `Test${randNum1}-Space`,
        password: '   ',
      }),
    });
    assert(putWhitespace.status === 200, '1.4a PUT /api/employees/:id with whitespace password returns 200', `HTTP ${putWhitespace.status}`);

    const loginWhitespaceCheck = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: emp1Username, password: 'admin123' }),
    });
    assert(loginWhitespaceCheck.status === 200, '1.4b Login with original password after whitespace PUT succeeds', `HTTP ${loginWhitespaceCheck.status}`);

    // Test 1.5: PUT with non-empty custom password (new_password: "NewPass#123")
    const putNewPass = await request(`/employees/${emp1Id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...testEmp1Body,
        last_name: `Test${randNum1}-UpdatedPass`,
        new_password: 'NewPass#123',
      }),
    });
    assert(putNewPass.status === 200, '1.5a PUT /api/employees/:id with non-empty new_password returns 200', `HTTP ${putNewPass.status}`);

    // Verify old password fails
    const loginOldFailed = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: emp1Username, password: 'admin123' }),
    });
    assert(loginOldFailed.status === 401, '1.5b Login with OLD password returns 401 Unauthorized', `HTTP ${loginOldFailed.status}`);

    // Verify new password succeeds
    const loginNewSuccess = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: emp1Username, password: 'NewPass#123' }),
    });
    assert(loginNewSuccess.status === 200 && loginNewSuccess.data.token, '1.5c Login with NEW password returns 200 OK', `HTTP ${loginNewSuccess.status}`);

    // Test 1.6: PUT using 'password' field instead of 'new_password'
    const putPassField = await request(`/employees/${emp1Id}`, {
      method: 'PUT',
      headers: adminHeaders,
      body: JSON.stringify({
        ...testEmp1Body,
        password: 'AnotherPass#456',
      }),
    });
    assert(putPassField.status === 200, '1.6a PUT /api/employees/:id using password field returns 200', `HTTP ${putPassField.status}`);

    const loginPassFieldSuccess = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: emp1Username, password: 'AnotherPass#456' }),
    });
    assert(loginPassFieldSuccess.status === 200, '1.6b Login with updated password (via password field) succeeds', `HTTP ${loginPassFieldSuccess.status}`);

    // Cleanup Employee 1
    const delEmp1 = await request(`/employees/${emp1Id}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(delEmp1.status === 200, '1.7 Cleanup test employee 1', `HTTP ${delEmp1.status}`);
  }

  // ==========================================
  // Category 2: POST /api/employees Edge Cases
  // ==========================================
  console.log('\n--- Category 2: POST /api/employees Edge Cases ---');

  // Test 2.1: Doctor role with dept_id omitted -> 400 Bad Request
  const randNum2 = Math.floor(1000 + Math.random() * 9000);
  const postDocNoDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'DrNo',
      last_name: `Dept${randNum2}`,
      gender: 'Male',
      date_of_birth: '1985-01-01',
      job_title: 'Doctor',
      phone: `0722${randNum2}`,
      email: `dr.nodept${randNum2}@hospital.com`,
      salary: 80000,
      // dept_id intentionally omitted
    }),
  });
  assert(postDocNoDept.status === 400, '2.1 POST /api/employees Doctor with omitted dept_id returns 400', `HTTP ${postDocNoDept.status}, Msg: ${postDocNoDept.data?.message}`);

  // Test 2.2: Doctor role with dept_id set to null -> 400 Bad Request
  const postDocNullDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'DrNull',
      last_name: `Dept${randNum2}`,
      gender: 'Male',
      date_of_birth: '1985-01-01',
      job_title: 'doctor', // lowercase
      phone: `0723${randNum2}`,
      email: `dr.nulldept${randNum2}@hospital.com`,
      dept_id: null,
      salary: 80000,
    }),
  });
  assert(postDocNullDept.status === 400, '2.2 POST /api/employees Doctor (lowercase) with dept_id=null returns 400', `HTTP ${postDocNullDept.status}`);

  // Test 2.3: Physician title (maps to doctor) with dept_id omitted -> Test boundary behavior
  const postPhysicianNoDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Physician',
      last_name: `Test${randNum2}`,
      gender: 'Male',
      date_of_birth: '1985-01-01',
      job_title: 'Physician',
      phone: `0724${randNum2}`,
      email: `physician${randNum2}@hospital.com`,
      dept_id: null,
      salary: 85000,
    }),
  });
  console.log(`[INFO] 2.3 POST Physician with dept_id=null returned HTTP ${postPhysicianNoDept.status}: ${JSON.stringify(postPhysicianNoDept.data)}`);
  if (postPhysicianNoDept.data?.emp_id) {
    await request(`/employees/${postPhysicianNoDept.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.4: Doctor role WITH valid dept_id -> 201 Created
  const postDocValid = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'DrValid',
      last_name: `Dept${randNum2}`,
      gender: 'Male',
      date_of_birth: '1985-01-01',
      job_title: 'Doctor',
      phone: `0725${randNum2}`,
      email: `dr.valid${randNum2}@hospital.com`,
      dept_id: 1,
      salary: 80000,
    }),
  });
  assert(postDocValid.status === 201 && postDocValid.data.emp_id, '2.4 POST /api/employees Doctor WITH dept_id=1 returns 201 Created', `Emp_ID: ${postDocValid.data?.emp_id}`);
  if (postDocValid.data?.emp_id) {
    await request(`/employees/${postDocValid.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.5: Non-Doctor role (Receptionist) WITH dept_id omitted -> 201 Created & Dept_ID is null
  const postRecepNoDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Recep',
      last_name: `NoDept${randNum2}`,
      gender: 'Female',
      date_of_birth: '1994-03-20',
      job_title: 'Receptionist',
      phone: `0726${randNum2}`,
      email: `recep.nodept${randNum2}@hospital.com`,
      salary: 28000,
      // dept_id omitted
    }),
  });
  assert(postRecepNoDept.status === 201 && postRecepNoDept.data.emp_id, '2.5a POST /api/employees Receptionist WITHOUT dept_id returns 201 Created', `Emp_ID: ${postRecepNoDept.data?.emp_id}`);
  if (postRecepNoDept.data?.emp_id) {
    const getEmpDetail = await request(`/employees/${postRecepNoDept.data.emp_id}`, { headers: adminHeaders });
    assert(getEmpDetail.status === 200 && getEmpDetail.data.data.Dept_ID === null, '2.5b Created Receptionist has Dept_ID === null in DB', `Dept_ID: ${getEmpDetail.data?.data?.Dept_ID}`);
    await request(`/employees/${postRecepNoDept.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.6: Non-Doctor role (Pharmacist) WITHOUT dept_id -> 201 Created
  const postPharmNoDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Pharm',
      last_name: `NoDept${randNum2}`,
      gender: 'Male',
      date_of_birth: '1991-08-10',
      job_title: 'Pharmacist',
      phone: `0727${randNum2}`,
      email: `pharm.nodept${randNum2}@hospital.com`,
      salary: 35000,
    }),
  });
  assert(postPharmNoDept.status === 201, '2.6 POST /api/employees Pharmacist WITHOUT dept_id returns 201 Created', `HTTP ${postPharmNoDept.status}`);
  if (postPharmNoDept.data?.emp_id) {
    await request(`/employees/${postPharmNoDept.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.7: Non-Doctor role (Lab Technician) WITHOUT dept_id -> 201 Created
  const postLabNoDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Lab',
      last_name: `Tech${randNum2}`,
      gender: 'Female',
      date_of_birth: '1993-11-05',
      job_title: 'Lab Technician',
      phone: `0728${randNum2}`,
      email: `lab.tech${randNum2}@hospital.com`,
      salary: 32000,
    }),
  });
  assert(postLabNoDept.status === 201, '2.7 POST /api/employees Lab Technician WITHOUT dept_id returns 201 Created', `HTTP ${postLabNoDept.status}`);
  if (postLabNoDept.data?.emp_id) {
    await request(`/employees/${postLabNoDept.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.8: Non-Doctor role (Accountant) WITHOUT dept_id -> 201 Created
  const postAccNoDept = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Account',
      last_name: `NoDept${randNum2}`,
      gender: 'Male',
      date_of_birth: '1989-02-28',
      job_title: 'Accountant',
      phone: `0729${randNum2}`,
      email: `acc.nodept${randNum2}@hospital.com`,
      salary: 40000,
    }),
  });
  assert(postAccNoDept.status === 201, '2.8 POST /api/employees Accountant WITHOUT dept_id returns 201 Created', `HTTP ${postAccNoDept.status}`);
  if (postAccNoDept.data?.emp_id) {
    await request(`/employees/${postAccNoDept.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.9: Admin Role Provisioning WITHOUT dept_id -> 201 Created & maps to Role_ID 1
  const postAdminRole = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Admin',
      last_name: `New${randNum2}`,
      gender: 'Male',
      date_of_birth: '1988-06-12',
      job_title: 'Hospital_Admin',
      phone: `0730${randNum2}`,
      email: `admin.new${randNum2}@hospital.com`,
      salary: 90000,
    }),
  });
  assert(postAdminRole.status === 201 && postAdminRole.data.emp_id, '2.9a POST /api/employees Admin role returns 201 Created', `Emp_ID: ${postAdminRole.data?.emp_id}`);
  if (postAdminRole.data?.emp_id) {
    const adminEmpDetail = await request(`/employees/${postAdminRole.data.emp_id}`, { headers: adminHeaders });
    assert(adminEmpDetail.status === 200 && adminEmpDetail.data.data.Role_ID === 1, '2.9b Provisioned Admin account has Role_ID === 1', `Role_ID: ${adminEmpDetail.data?.data?.Role_ID}`);
    await request(`/employees/${postAdminRole.data.emp_id}`, { method: 'DELETE', headers: adminHeaders });
  }

  // Test 2.10: Missing required fields (first_name, email, phone, job_title) -> 400
  const postMissingFirst = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      last_name: 'NoFirst',
      job_title: 'Receptionist',
      phone: `0731${randNum2}`,
      email: `nofirst${randNum2}@hospital.com`,
    }),
  });
  assert(postMissingFirst.status === 400, '2.10 Missing first_name returns 400 Bad Request', `HTTP ${postMissingFirst.status}`);

  const postMissingEmail = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'NoEmail',
      last_name: 'Test',
      job_title: 'Receptionist',
      phone: `0732${randNum2}`,
    }),
  });
  assert(postMissingEmail.status === 400, '2.11 Missing email returns 400 Bad Request', `HTTP ${postMissingEmail.status}`);

  // ==========================================
  // Category 3: Self-Deletion Lockout Boundary Conditions
  // ==========================================
  console.log('\n--- Category 3: Self-Deletion Lockout Boundary Conditions ---');

  // Test 3.1: Create a new Admin employee account
  const randNum3 = Math.floor(1000 + Math.random() * 9000);
  const createSelfAdmin = await request('/employees', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      first_name: 'Lockout',
      last_name: `Admin${randNum3}`,
      gender: 'Male',
      date_of_birth: '1987-04-10',
      job_title: 'Admin',
      phone: `0740${randNum3}`,
      email: `lockout.admin${randNum3}@hospital.com`,
      salary: 95000,
    }),
  });

  assert(createSelfAdmin.status === 201 && createSelfAdmin.data.emp_id, '3.1 Create Admin Employee for Lockout Testing', `Emp_ID: ${createSelfAdmin.data?.emp_id}, Username: ${createSelfAdmin.data?.username}`);
  const selfEmpId = createSelfAdmin.data?.emp_id;
  const selfUsername = createSelfAdmin.data?.username;

  if (selfEmpId && selfUsername) {
    // Test 3.2: Log in as the newly created Admin employee
    const selfAdminLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: selfUsername, password: 'admin123' }),
    });

    assert(selfAdminLogin.status === 200 && selfAdminLogin.data.token, '3.2 Log in as newly created Admin employee', `User_ID: ${selfAdminLogin.data?.user?.id}`);
    const selfAdminToken = selfAdminLogin.data?.token;
    const selfAdminHeaders = { Authorization: `Bearer ${selfAdminToken}` };

    // Test 3.3: Attempt self-deletion using selfAdminToken (deleting selfEmpId) -> Must be blocked (400 Bad Request)
    const attemptSelfDelete = await request(`/employees/${selfEmpId}`, {
      method: 'DELETE',
      headers: selfAdminHeaders,
    });
    assert(attemptSelfDelete.status === 400, '3.3 Attempting self-deletion returns 400 Bad Request', `HTTP ${attemptSelfDelete.status}, Msg: ${attemptSelfDelete.data?.message}`);
    assert(attemptSelfDelete.data?.message?.includes('prohibited') || attemptSelfDelete.data?.message?.includes('logged-in administrator'),
      '3.3 Self-deletion error message explains admin lockout restriction', `Msg: ${attemptSelfDelete.data?.message}`);

    // Verify account still exists after blocked deletion attempt
    const getSelfAfterBlocked = await request(`/employees/${selfEmpId}`, { headers: adminHeaders });
    assert(getSelfAfterBlocked.status === 200, '3.3c Employee account still exists after self-deletion attempt blocked', `HTTP ${getSelfAfterBlocked.status}`);

    // Test 3.4: Another Admin (default admin) CAN delete this Admin employee account -> 200 OK
    const otherAdminDelete = await request(`/employees/${selfEmpId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
    assert(otherAdminDelete.status === 200, '3.4 Another Admin deleting target Admin employee returns 200 OK', `HTTP ${otherAdminDelete.status}`);

    // Verify account is deleted
    const getSelfAfterDeleted = await request(`/employees/${selfEmpId}`, { headers: adminHeaders });
    assert(getSelfAfterDeleted.status === 404, '3.4b Account successfully deleted by peer admin', `HTTP ${getSelfAfterDeleted.status}`);
  }

  // Test 3.5: DELETE on invalid employee ID 999999 -> 404 Not Found
  const del404 = await request('/employees/999999', {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(del404.status === 404, '3.5 DELETE /api/employees/999999 returns 404 Not Found', `HTTP ${del404.status}`);

  // Summary
  console.log('\n===========================================');
  console.log(` SUMMARY: ${passed} PASSED  |  ${failed} FAILED  |  ${passed + failed} TOTAL`);
  if (failures.length > 0) {
    console.log(` FAILURES: ${failures.join(', ')}`);
  }
  console.log('===========================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error running stress tests:', err);
  process.exit(1);
});
