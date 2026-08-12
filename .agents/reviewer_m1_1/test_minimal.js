async function testPost() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  const res1 = await fetch('http://localhost:5000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Admin1',
      job_title: 'Hospital_Admin',
      phone: '1234567890',
      email: `admin1.${Date.now()}@test.com`
    })
  });
  console.log('Hospital_Admin status:', res1.status, await res1.json());

  const res2 = await fetch('http://localhost:5000/api/employees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'Admin2',
      job_title: 'Admin',
      phone: '1234567890',
      email: `admin2.${Date.now()}@test.com`
    })
  });
  console.log('Admin status:', res2.status, await res2.json());
}
testPost();
