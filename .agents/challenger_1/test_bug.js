const http = require('http');

async function test() {
  // Login
  const loginData = JSON.stringify({ username: 'admin', password: 'x' });
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: loginData
  }).then(r => r.json());

  const token = loginRes.token;
  console.log('Login token acquired.');

  // Test GET /api/pharmacy/inventory?search=aspirin
  const searchRes = await fetch('http://localhost:5000/api/pharmacy/inventory?search=aspirin', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const status = searchRes.status;
  const body = await searchRes.text();

  console.log('GET /pharmacy/inventory?search=aspirin Status:', status);
  console.log('Body:', body);

  // Test GET /api/pharmacy/inventory?category_id=1
  const catRes = await fetch('http://localhost:5000/api/pharmacy/inventory?category_id=1', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('GET /pharmacy/inventory?category_id=1 Status:', catRes.status);
  console.log('Body:', await catRes.text());
}

test();
