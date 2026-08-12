const express = require('express');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';

const app = express();
app.use(express.json());

app.use('/api/employees', require('../../backend/routes/employees'));

const adminToken = jwt.sign({ userId: 1, role: 'Hospital_Admin' }, process.env.JWT_SECRET);
const doctorToken = jwt.sign({ userId: 2, role: 'Doctor' }, process.env.JWT_SECRET);
const receptionistToken = jwt.sign({ userId: 3, role: 'Receptionist' }, process.env.JWT_SECRET);

const server = app.listen(0, async () => {
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api/employees`;

  console.log('Testing authentication & authorization on', baseUrl);

  let passed = true;

  // Test 1: No token (401)
  const res1 = await fetch(baseUrl);
  console.log('Test 1 (No token GET): Status =', res1.status, res1.status === 401 ? 'PASS' : 'FAIL');
  if (res1.status !== 401) passed = false;

  // Test 2: Invalid token (401)
  const res2 = await fetch(baseUrl, { headers: { Authorization: 'Bearer invalid_token' } });
  console.log('Test 2 (Invalid token GET): Status =', res2.status, res2.status === 401 ? 'PASS' : 'FAIL');
  if (res2.status !== 401) passed = false;

  // Test 3: Doctor role token GET (403)
  const res3 = await fetch(baseUrl, { headers: { Authorization: `Bearer ${doctorToken}` } });
  console.log('Test 3 (Doctor token GET): Status =', res3.status, res3.status === 403 ? 'PASS' : 'FAIL');
  if (res3.status !== 403) passed = false;

  // Test 4: Receptionist role token GET (403)
  const res4 = await fetch(baseUrl, { headers: { Authorization: `Bearer ${receptionistToken}` } });
  console.log('Test 4 (Receptionist token GET): Status =', res4.status, res4.status === 403 ? 'PASS' : 'FAIL');
  if (res4.status !== 403) passed = false;

  // Test 5: Doctor POST /api/employees (403)
  const res5 = await fetch(baseUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
  });
  console.log('Test 5 (Doctor POST): Status =', res5.status, res5.status === 403 ? 'PASS' : 'FAIL');
  if (res5.status !== 403) passed = false;

  // Test 6: Doctor PUT /api/employees/1 (403)
  const res6 = await fetch(`${baseUrl}/1`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ first_name: 'Test', last_name: 'User' })
  });
  console.log('Test 6 (Doctor PUT): Status =', res6.status, res6.status === 403 ? 'PASS' : 'FAIL');
  if (res6.status !== 403) passed = false;

  // Test 7: Doctor DELETE /api/employees/1 (403)
  const res7 = await fetch(`${baseUrl}/1`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  console.log('Test 7 (Doctor DELETE): Status =', res7.status, res7.status === 403 ? 'PASS' : 'FAIL');
  if (res7.status !== 403) passed = false;

  // Test 8: Doctor GET /api/employees/meta/departments (403)
  const res8 = await fetch(`${baseUrl}/meta/departments`, {
    headers: { Authorization: `Bearer ${doctorToken}` }
  });
  console.log('Test 8 (Doctor GET meta/departments): Status =', res8.status, res8.status === 403 ? 'PASS' : 'FAIL');
  if (res8.status !== 403) passed = false;

  server.close();
  console.log('\nOVERALL AUTH TEST RESULT:', passed ? 'ALL TESTS PASSED' : 'TESTS FAILED');
  process.exit(passed ? 0 : 1);
});
