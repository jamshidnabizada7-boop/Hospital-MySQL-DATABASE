const dotenv = require('../../backend/node_modules/dotenv');
dotenv.config({ path: './backend/.env' });
const db = require('../../backend/db');

async function runTests() {
  console.log('--- STARTING REVIEWER M1 EMPIRICAL VERIFICATION (FETCH) ---');

  // 0. Login as admin
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });

  const loginBody = await loginRes.json();
  if (loginRes.status !== 200 || !loginBody.token) {
    console.error('Failed to log in as admin:', loginRes.status, loginBody);
    process.exit(1);
  }
  const token = loginBody.token;
  const adminUserId = loginBody.user.id;
  const adminEmpId = loginBody.user.employeeId;
  const authHeader = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  console.log(`[PASS] Admin logged in. User_ID=${adminUserId}, Emp_ID=${adminEmpId}`);

  // Test 1: POST /api/employees with Admin role & no dept_id
  const postAdminRes = await fetch('http://localhost:5000/api/employees', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      first_name: 'TestAdmin',
      last_name: 'Reviewer',
      job_title: 'Hospital_Admin',
      phone: '555-999-0001',
      email: `testadmin.reviewer.${Date.now()}@hospital.com`,
      gender: 'Male',
      salary: 85000
    })
  });

  const postAdminBody = await postAdminRes.json();
  console.log('POST Admin result:', postAdminRes.status, JSON.stringify(postAdminBody));
  if (postAdminRes.status !== 201 || !postAdminBody.emp_id) {
    throw new Error('Test 1 failed: POST employee with Admin role failed');
  }
  const adminEmpIdCreated = postAdminBody.emp_id;
  const adminUserIdCreated = postAdminBody.user_id;

  // Verify Role_ID = 1 in DB for created admin
  const [userDbRows] = await db.query('SELECT Role_ID, Username FROM App_User WHERE User_ID = ?', [adminUserIdCreated]);
  if (!userDbRows.length || userDbRows[0].Role_ID !== 1) {
    throw new Error(`Test 1 failed: Role_ID is not 1 for created Admin (got ${userDbRows[0]?.Role_ID})`);
  }
  console.log(`[PASS] Test 1: POST Admin created account with Role_ID = 1, Username = ${userDbRows[0].Username}`);

  // Verify Dept_ID is NULL in Employee table
  const [empDbRows] = await db.query('SELECT Dept_ID FROM Employee WHERE Emp_ID = ?', [adminEmpIdCreated]);
  if (empDbRows[0].Dept_ID !== null) {
    throw new Error(`Test 1 failed: Dept_ID is not NULL for non-doctor Admin (got ${empDbRows[0].Dept_ID})`);
  }
  console.log('[PASS] Test 1: Dept_ID is NULL for non-doctor Admin');

  // Test 2: Verify Doctor creation REQUIRES dept_id
  const postDocFailRes = await fetch('http://localhost:5000/api/employees', {
    method: 'POST',
    headers: authHeader,
    body: JSON.stringify({
      first_name: 'TestDoc',
      last_name: 'Reviewer',
      job_title: 'Doctor',
      phone: '555-999-0002',
      email: `testdoc.reviewer.${Date.now()}@hospital.com`,
      gender: 'Female',
      salary: 120000
    })
  });

  const postDocFailBody = await postDocFailRes.json();
  if (postDocFailRes.status !== 400) {
    throw new Error(`Test 2 failed: POST Doctor without dept_id should return 400, got ${postDocFailRes.status}`);
  }
  console.log('[PASS] Test 2: POST Doctor without dept_id correctly returned 400 Bad Request:', postDocFailBody.message);

  // Test 3: PUT /api/employees/:id with custom password hashing
  const newPassword = 'CustomNewPassword123!';
  const putRes = await fetch(`http://localhost:5000/api/employees/${adminEmpIdCreated}`, {
    method: 'PUT',
    headers: authHeader,
    body: JSON.stringify({
      first_name: 'TestAdminUpdated',
      last_name: 'ReviewerUpdated',
      job_title: 'Hospital_Admin',
      phone: '555-999-0001',
      email: `updated.${Date.now()}@hospital.com`,
      new_password: newPassword
    })
  });

  const putBody = await putRes.json();
  if (putRes.status !== 200 || !putBody.success) {
    throw new Error(`Test 3 failed: PUT employee failed with status ${putRes.status}: ${JSON.stringify(putBody)}`);
  }
  console.log('[PASS] Test 3: PUT employee updated successfully with new_password');

  // Test 3b: Test login with new password
  const newLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: postAdminBody.username, password: newPassword })
  });

  const newLoginBody = await newLoginRes.json();
  if (newLoginRes.status !== 200 || !newLoginBody.token) {
    throw new Error(`Test 3b failed: Login with custom new_password failed (status ${newLoginRes.status}): ${JSON.stringify(newLoginBody)}`);
  }
  console.log('[PASS] Test 3b: Successfully logged in with updated custom password');

  // Test 4: DELETE self-deletion lockout protection
  let selfDeleteRes;
  if (adminEmpId) {
    selfDeleteRes = await fetch(`http://localhost:5000/api/employees/${adminEmpId}`, {
      method: 'DELETE',
      headers: authHeader
    });
  } else {
    // Admin user has User_ID=1. Find employee record with User_ID=1 if any, or create a mock attempt
    const [adminEmpRows] = await db.query('SELECT Emp_ID FROM Employee WHERE User_ID = ?', [adminUserId]);
    if (adminEmpRows.length) {
      selfDeleteRes = await fetch(`http://localhost:5000/api/employees/${adminEmpRows[0].Emp_ID}`, {
        method: 'DELETE',
        headers: authHeader
      });
    } else {
      console.log('Logged in admin (User_ID 1) does not have an Employee row, creating temporary employee for User_ID 1 self-delete test...');
      const [ins] = await db.query(`
        INSERT INTO Employee (User_ID, First_Name, Last_Name, Gender, Date_Of_Birth, Job_Title, Phone, Email, Salary, Hire_Date)
        VALUES (?, 'Admin', 'User', 'Male', '1985-01-01', 'Hospital_Admin', '555-000-0000', 'tempadmin@hospital.com', 100000, '2020-01-01')`,
        [adminUserId]
      );
      const tempEmpId = ins.insertId;
      selfDeleteRes = await fetch(`http://localhost:5000/api/employees/${tempEmpId}`, {
        method: 'DELETE',
        headers: authHeader
      });
      await db.query('DELETE FROM Employee WHERE Emp_ID = ?', [tempEmpId]);
    }
  }

  const selfDeleteBody = await selfDeleteRes.json();
  if (selfDeleteRes.status !== 400 || !selfDeleteBody.message.includes('prohibited')) {
    throw new Error(`Test 4 failed: Self deletion should return 400, got status ${selfDeleteRes.status}: ${JSON.stringify(selfDeleteBody)}`);
  }
  console.log(`[PASS] Test 4: Self deletion lockout protection blocked self-delete with 400 Bad Request`);

  // Test 5: Normal deletion of created staff member
  const deleteRes = await fetch(`http://localhost:5000/api/employees/${adminEmpIdCreated}`, {
    method: 'DELETE',
    headers: authHeader
  });

  const deleteBody = await deleteRes.json();
  if (deleteRes.status !== 200 || !deleteBody.success) {
    throw new Error(`Test 5 failed: Delete created employee failed with status ${deleteRes.status}: ${JSON.stringify(deleteBody)}`);
  }
  console.log('[PASS] Test 5: Delete non-self employee succeeded');

  // Verify DB cleanup for deleted employee and linked user
  const [deletedEmpRows] = await db.query('SELECT Emp_ID FROM Employee WHERE Emp_ID = ?', [adminEmpIdCreated]);
  const [deletedUserRows] = await db.query('SELECT User_ID FROM App_User WHERE User_ID = ?', [adminUserIdCreated]);
  if (deletedEmpRows.length || deletedUserRows.length) {
    throw new Error('Test 5 failed: DB record for Employee or App_User still exists after deletion');
  }
  console.log('[PASS] Test 5: Verified Employee and App_User records removed from DB in transaction');

  console.log('--- ALL REVIEWER M1 EMPIRICAL VERIFICATIONS PASSED ---');
  process.exit(0);
}

runTests().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
