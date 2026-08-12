const path = require('path');
const http = require('http');
const mysql = require(path.join(__dirname, '../../backend/node_modules/mysql2/promise'));
require(path.join(__dirname, '../../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../../backend/.env') });

const API_BASE = 'http://localhost:5000/api';

async function httpRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING EMPIRICAL BACKEND ENDPOINT TESTS ---');
  let passCount = 0;
  let totalCount = 4;
  const testResults = [];

  // Database Connection Pool for direct verification
  const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'Hospital_Management_System',
  });

  try {
    // 0. Login as initial admin user to perform admin operations
    console.log('\n[Setup] Logging in as initial admin (admin / admin123)...');
    const adminLoginRes = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: 'admin123' });

    if (adminLoginRes.statusCode !== 200 || !adminLoginRes.body.token) {
      throw new Error(`Failed to login as initial admin: ${JSON.stringify(adminLoginRes.body)}`);
    }
    const mainAdminToken = adminLoginRes.body.token;
    console.log('✅ Initial admin login successful.');

    // Cleanup any leftover test data from previous runs
    await db.query(`DELETE FROM Employee WHERE Email IN ('testadminemp@example.com', 'testrecepemp@example.com')`);
    await db.query(`DELETE FROM App_User WHERE Email IN ('testadminemp@example.com', 'testrecepemp@example.com')`);

    // -------------------------------------------------------------
    // TEST 1: Create staff member with job title "Admin", verify Role_ID=1 in DB, and verify Admin login
    // -------------------------------------------------------------
    console.log('\n--- TEST 1: Create staff member with job_title="Admin" ---');
    const t1Payload = {
      first_name: 'TestAdminEmp',
      last_name: 'Challenger',
      gender: 'Male',
      date_of_birth: '1985-05-15',
      job_title: 'Admin',
      phone: '555-0101',
      email: 'testadminemp@example.com',
      salary: 80000
    };

    const t1Res = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employees',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainAdminToken}`
      }
    }, t1Payload);

    console.log('POST /api/employees Response Status:', t1Res.statusCode);
    console.log('POST /api/employees Response Body:', JSON.stringify(t1Res.body));

    if (t1Res.statusCode === 201 && t1Res.body.success) {
      const { emp_id, user_id, username } = t1Res.body;

      // DB check
      const [userRows] = await db.query('SELECT User_ID, Role_ID, Username FROM App_User WHERE User_ID = ?', [user_id]);
      console.log('DB Query App_User:', userRows);

      // Login check
      const newAdminLogin = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { username: username, password: 'admin123' });

      console.log('Login response for new Admin:', newAdminLogin.statusCode, JSON.stringify(newAdminLogin.body));

      const roleIdValid = userRows.length > 0 && userRows[0].Role_ID === 1;
      const loginValid = newAdminLogin.statusCode === 200 && newAdminLogin.body.user && newAdminLogin.body.user.role === 'Hospital_Admin';

      if (roleIdValid && loginValid) {
        console.log('✅ TEST 1 PASSED: Role_ID is 1 in DB and login works as Admin.');
        passCount++;
        testResults.push({ name: 'Test 1: Admin Role Provisioning & Login', status: 'PASS', details: `User_ID: ${user_id}, Role_ID: ${userRows[0].Role_ID}, Login Role: ${newAdminLogin.body.user.role}` });
      } else {
        console.error('❌ TEST 1 FAILED: DB Role_ID or Login failed.', { roleIdValid, loginValid });
        testResults.push({ name: 'Test 1: Admin Role Provisioning & Login', status: 'FAIL', details: `roleIdValid: ${roleIdValid}, loginValid: ${loginValid}` });
      }
    } else {
      console.error('❌ TEST 1 FAILED: Employee creation failed.');
      testResults.push({ name: 'Test 1: Admin Role Provisioning & Login', status: 'FAIL', details: JSON.stringify(t1Res.body) });
    }

    // -------------------------------------------------------------
    // TEST 2: Create staff member with job title "Receptionist" and dept_id = null, verify Dept_ID IS NULL in DB
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Create Receptionist with dept_id = null ---');
    const t2Payload = {
      first_name: 'TestRecepEmp',
      last_name: 'Challenger',
      gender: 'Female',
      date_of_birth: '1992-08-20',
      job_title: 'Receptionist',
      phone: '555-0102',
      email: 'testrecepemp@example.com',
      dept_id: null,
      salary: 45000
    };

    const t2Res = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/employees',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mainAdminToken}`
      }
    }, t2Payload);

    console.log('POST /api/employees Response Status:', t2Res.statusCode);
    console.log('POST /api/employees Response Body:', JSON.stringify(t2Res.body));

    let recepEmpId = null;
    let recepUserId = null;
    let recepUsername = null;

    if (t2Res.statusCode === 201 && t2Res.body.success) {
      recepEmpId = t2Res.body.emp_id;
      recepUserId = t2Res.body.user_id;
      recepUsername = t2Res.body.username;

      // DB check
      const [empRows] = await db.query('SELECT Emp_ID, User_ID, Dept_ID, Job_Title FROM Employee WHERE Emp_ID = ?', [recepEmpId]);
      console.log('DB Query Employee:', empRows);

      const deptIsNull = empRows.length > 0 && empRows[0].Dept_ID === null;

      if (deptIsNull) {
        console.log('✅ TEST 2 PASSED: Row inserted with Dept_ID IS NULL.');
        passCount++;
        testResults.push({ name: 'Test 2: Receptionist dept_id=null', status: 'PASS', details: `Emp_ID: ${recepEmpId}, Dept_ID: ${empRows[0].Dept_ID}` });
      } else {
        console.error('❌ TEST 2 FAILED: Dept_ID is not NULL in DB.');
        testResults.push({ name: 'Test 2: Receptionist dept_id=null', status: 'FAIL', details: `Dept_ID: ${empRows[0]?.Dept_ID}` });
      }
    } else {
      console.error('❌ TEST 2 FAILED: Employee creation failed.');
      testResults.push({ name: 'Test 2: Receptionist dept_id=null', status: 'FAIL', details: JSON.stringify(t2Res.body) });
    }

    // -------------------------------------------------------------
    // TEST 3: PUT /api/employees/:id with custom password, prove bcrypt update works by logging in
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: PUT /api/employees/:id with new custom password ---');
    if (recepEmpId) {
      const customPassword = 'CustomSecretPass999!';
      const t3Payload = {
        first_name: 'TestRecepEmp',
        last_name: 'Challenger',
        gender: 'Female',
        date_of_birth: '1992-08-20',
        job_title: 'Receptionist',
        phone: '555-0102',
        email: 'testrecepemp@example.com',
        dept_id: null,
        salary: 45000,
        new_password: customPassword
      };

      const t3Res = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: `/api/employees/${recepEmpId}`,
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mainAdminToken}`
        }
      }, t3Payload);

      console.log('PUT /api/employees/:id Response Status:', t3Res.statusCode);
      console.log('PUT /api/employees/:id Response Body:', JSON.stringify(t3Res.body));

      // Test login with old default password (should fail 401)
      const oldPassLogin = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { username: recepUsername, password: 'admin123' });
      console.log('Login attempt with old password status:', oldPassLogin.statusCode);

      // Test login with new custom password (should succeed 200)
      const newPassLogin = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { username: recepUsername, password: customPassword });
      console.log('Login attempt with new password status:', newPassLogin.statusCode, JSON.stringify(newPassLogin.body));

      if (t3Res.statusCode === 200 && oldPassLogin.statusCode === 401 && newPassLogin.statusCode === 200 && newPassLogin.body.success) {
        console.log('✅ TEST 3 PASSED: Custom password updated via PUT and authenticated via bcrypt login.');
        passCount++;
        testResults.push({ name: 'Test 3: Custom Password Update & Auth', status: 'PASS', details: `Old password rejected (401), New password accepted (200)` });
      } else {
        console.error('❌ TEST 3 FAILED: Password update or authentication check failed.');
        testResults.push({ name: 'Test 3: Custom Password Update & Auth', status: 'FAIL', details: `PUT Status: ${t3Res.statusCode}, Old Login Status: ${oldPassLogin.statusCode}, New Login Status: ${newPassLogin.statusCode}` });
      }
    } else {
      console.error('❌ TEST 3 SKIPPED/FAILED: No receptionist employee available from Test 2.');
      testResults.push({ name: 'Test 3: Custom Password Update & Auth', status: 'FAIL', details: 'Prerequisite Test 2 failed' });
    }

    // -------------------------------------------------------------
    // EXTRA STRESS CHECK: Verify normal non-self deletion works
    // -------------------------------------------------------------
    console.log('\n--- EXTRA STRESS CHECK: Delete non-self receptionist employee from Admin ---');
    const extraDelRes = await httpRequest({
      hostname: 'localhost',
      port: 5000,
      path: `/api/employees/${recepEmpId}`,
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${mainAdminToken}`
      }
    });
    console.log('DELETE non-self employee response:', extraDelRes.statusCode, JSON.stringify(extraDelRes.body));
    const [delCheck] = await db.query('SELECT Emp_ID FROM Employee WHERE Emp_ID = ?', [recepEmpId]);
    if (extraDelRes.statusCode === 200 && delCheck.length === 0) {
      console.log('✅ EXTRA STRESS CHECK PASSED: Non-self deletion correctly removes record.');
    } else {
      console.error('❌ EXTRA STRESS CHECK FAILED.');
    }

    // -------------------------------------------------------------
    // TEST 4: Attempt DELETE /api/employees/:id passing currently logged-in Admin's ID
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Attempt DELETE /api/employees/:id passing logged-in Admin ID ---');
    // First, log in as the new admin created in Test 1 to get a JWT token for that admin user
    const [adminEmpRows] = await db.query(`
      SELECT e.Emp_ID, e.User_ID, u.Username 
      FROM Employee e JOIN App_User u ON e.User_ID = u.User_ID 
      WHERE u.Email = 'testadminemp@example.com'
    `);

    if (adminEmpRows.length > 0) {
      const targetAdmin = adminEmpRows[0];
      console.log('Target Admin for self-deletion test:', targetAdmin);

      const targetAdminLogin = await httpRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, { username: targetAdmin.Username, password: 'admin123' });

      if (targetAdminLogin.statusCode === 200 && targetAdminLogin.body.token) {
        const targetAdminToken = targetAdminLogin.body.token;

        // Attempt self deletion passing targetAdmin.Emp_ID with targetAdminToken
        const deleteRes = await httpRequest({
          hostname: 'localhost',
          port: 5000,
          path: `/api/employees/${targetAdmin.Emp_ID}`,
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${targetAdminToken}`
          }
        });

        console.log('DELETE /api/employees/:id Response Status:', deleteRes.statusCode);
        console.log('DELETE /api/employees/:id Response Body:', JSON.stringify(deleteRes.body));

        // DB Check: Verify record still exists
        const [stillExists] = await db.query('SELECT Emp_ID FROM Employee WHERE Emp_ID = ?', [targetAdmin.Emp_ID]);

        const rejectedProperly = deleteRes.statusCode === 400 && 
          deleteRes.body.success === false && 
          deleteRes.body.message.includes('Action prohibited');
        const dbIntact = stillExists.length > 0;

        if (rejectedProperly && dbIntact) {
          console.log('✅ TEST 4 PASSED: HTTP 400 rejection and lockout error message verified.');
          passCount++;
          testResults.push({ name: 'Test 4: Admin Self-Deletion Lockout Rejection', status: 'PASS', details: `Status: 400, Message: "${deleteRes.body.message}", DB Record Preserved: true` });
        } else {
          console.error('❌ TEST 4 FAILED: Self deletion was not rejected properly.', { rejectedProperly, dbIntact });
          testResults.push({ name: 'Test 4: Admin Self-Deletion Lockout Rejection', status: 'FAIL', details: `Status: ${deleteRes.statusCode}, Body: ${JSON.stringify(deleteRes.body)}, DB Intact: ${dbIntact}` });
        }
      } else {
        console.error('❌ TEST 4 FAILED: Could not log in as test admin.');
        testResults.push({ name: 'Test 4: Admin Self-Deletion Lockout Rejection', status: 'FAIL', details: 'Login as target admin failed' });
      }
    } else {
      console.error('❌ TEST 4 SKIPPED/FAILED: No test admin employee found.');
      testResults.push({ name: 'Test 4: Admin Self-Deletion Lockout Rejection', status: 'FAIL', details: 'Prerequisite Test 1 failed' });
    }

    // Clean up created test records after testing
    console.log('\n[Cleanup] Cleaning up test records...');
    await db.query(`DELETE FROM Employee WHERE Email IN ('testadminemp@example.com', 'testrecepemp@example.com')`);
    await db.query(`DELETE FROM App_User WHERE Email IN ('testadminemp@example.com', 'testrecepemp@example.com')`);
    console.log('✅ Cleanup completed.');

  } catch (err) {
    console.error('Execution error during empirical tests:', err);
  } finally {
    await db.end();
  }

  console.log(`\n========================================`);
  console.log(`SUMMARY: ${passCount} / ${totalCount} TESTS PASSED`);
  console.log(`VERDICT: ${passCount === totalCount ? 'APPROVE' : 'REJECT'}`);
  console.log(`========================================`);
  return { passCount, totalCount, testResults, verdict: passCount === totalCount ? 'APPROVE' : 'REJECT' };
}

runTests();
