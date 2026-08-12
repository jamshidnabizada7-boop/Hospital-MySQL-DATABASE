const http = require('http');

function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

(async () => {
  console.log('=== VERIFYING /api/employees ===');
  
  // 1. Login as Admin
  const adminLogin = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'admin', password: 'admin123' });
  
  console.log('1. Admin login status:', adminLogin.status, 'token received:', !!adminLogin.data.token);
  const adminToken = adminLogin.data.token;
  const adminHeaders = { 'Authorization': 'Bearer ' + adminToken, 'Content-Type': 'application/json' };

  // 2. GET /api/employees as Admin
  const getEmp = await request({
    host: 'localhost', port: 5000, path: '/api/employees', method: 'GET',
    headers: adminHeaders
  });
  console.log('2. GET /api/employees status:', getEmp.status, 'total:', getEmp.data.total, 'is array:', Array.isArray(getEmp.data.data));

  // 3. Test non-admin access (denied)
  const docLogin = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'dr_kamal', password: 'admin123' });
  const docHeaders = { 'Authorization': 'Bearer ' + docLogin.data.token };

  const getEmpDoc = await request({
    host: 'localhost', port: 5000, path: '/api/employees', method: 'GET',
    headers: docHeaders
  });
  console.log('3. GET /api/employees as Doctor status:', getEmpDoc.status, '(expected 403)');

  // 4. POST /api/employees (Create Receptionist)
  const empData1 = {
    first_name: 'AuditTest', last_name: 'UserOne', gender: 'Female', date_of_birth: '1996-05-15',
    job_title: 'Receptionist', phone: '0779990001', email: 'audittest1@hospital.com', dept_id: 1,
    salary: 22000.00, hire_date: '2026-08-12'
  };
  const postEmp1 = await request({
    host: 'localhost', port: 5000, path: '/api/employees', method: 'POST',
    headers: adminHeaders
  }, empData1);
  console.log('4. POST Receptionist status:', postEmp1.status, 'res:', JSON.stringify(postEmp1.data));

  // 5. Test login with newly provisioned credentials
  const newLogin1 = await request({
    host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: postEmp1.data.username, password: 'admin123' });
  console.log('5. Login provisioned Receptionist status:', newLogin1.status, 'role:', newLogin1.data.user ? newLogin1.data.user.role : null);

  // 6. Collision Test: Create second employee with same first/last name
  const empData2 = { ...empData1, email: 'audittest2@hospital.com', phone: '0779990002' };
  const postEmp2 = await request({
    host: 'localhost', port: 5000, path: '/api/employees', method: 'POST',
    headers: adminHeaders
  }, empData2);
  console.log('6. Collision test POST status:', postEmp2.status, 'username:', postEmp2.data.username);

  // 7. GET /api/employees/:id
  const getSingle = await request({
    host: 'localhost', port: 5000, path: '/api/employees/' + postEmp1.data.emp_id, method: 'GET',
    headers: adminHeaders
  });
  console.log('7. GET single employee status:', getSingle.status, 'name:', getSingle.data.data ? getSingle.data.data.First_Name : null);

  // 8. PUT /api/employees/:id
  const putEmp = await request({
    host: 'localhost', port: 5000, path: '/api/employees/' + postEmp1.data.emp_id, method: 'PUT',
    headers: adminHeaders
  }, { ...empData1, salary: 25000.00, job_title: 'Lead Receptionist' });
  console.log('8. PUT update status:', putEmp.status, 'msg:', putEmp.data.message);

  // 9. Role mapping test for all job titles
  const rolesToTest = [
    { title: 'Pharmacist', expectedRole: 'Pharmacist' },
    { title: 'Lab Technician', expectedRole: 'Lab_Technician' },
    { title: 'Accountant', expectedRole: 'Accountant' },
    { title: 'Doctor', expectedRole: 'Doctor' }
  ];
  const createdEmps = [postEmp1.data.emp_id, postEmp2.data.emp_id];
  for (let idx = 0; idx < rolesToTest.length; idx++) {
    const item = rolesToTest[idx];
    const res = await request({
      host: 'localhost', port: 5000, path: '/api/employees', method: 'POST',
      headers: adminHeaders
    }, {
      first_name: 'RoleTest', last_name: 'User' + idx, gender: 'Male', date_of_birth: '1990-01-01',
      job_title: item.title, phone: '077999001' + idx, email: 'roletest' + idx + '@hospital.com',
      dept_id: 1, salary: 30000, hire_date: '2026-08-12'
    });
    createdEmps.push(res.data.emp_id);
    const loginRes = await request({
      host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { username: res.data.username, password: 'admin123' });
    console.log(`9. Role map test '${item.title}': created user '${res.data.username}', login role: ${loginRes.data.user ? loginRes.data.user.role : null}`);
  }

  // 10. Clean up created employees
  for (const empId of createdEmps) {
    if (empId) {
      const delRes = await request({
        host: 'localhost', port: 5000, path: '/api/employees/' + empId, method: 'DELETE',
        headers: adminHeaders
      });
      console.log(`10. DELETE employee ${empId} status: ${delRes.status}`);
    }
  }

  console.log('=== VERIFICATION COMPLETED SUCCESSFULLY ===');
  process.exit(0);
})();
