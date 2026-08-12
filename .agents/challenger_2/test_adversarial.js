const http = require('http');

function request(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: 'GET',
      headers: headers
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function runAdversarialTests() {
  const loginRes = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.write(JSON.stringify({ username: 'admin', password: 'x' }));
    req.end();
  });

  const authHeader = { Authorization: 'Bearer ' + loginRes.token };

  console.log('--- 3. SQLi search details ---');
  const sqliSearch = await request('/api/patients?search=' + encodeURIComponent("' OR '1'='1"), authHeader);
  console.log('Status:', sqliSearch.status);
  console.log('Body:', sqliSearch.body);

  console.log('\n--- 4. SQLi path details ---');
  const sqliPath = await request('/api/patients/' + encodeURIComponent("1 OR 1=1"), authHeader);
  console.log('Status:', sqliPath.status);
  console.log('Body:', sqliPath.body);
}

runAdversarialTests().catch(console.error);
