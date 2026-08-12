const fs = require('fs');
const path = require('path');

const routeFiles = fs.readdirSync('backend/routes').map(f => 'backend/routes/' + f);
routeFiles.push('backend/db.js');
routeFiles.push('backend/server.js');

let suspiciousCount = 0;
routeFiles.forEach(f => {
  if (!fs.existsSync(f)) return;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if ((l.includes('db.query') || l.includes('db.execute') || l.includes('pool.query')) && l.includes('${')) {
      suspiciousCount++;
      console.log(f + ':' + (i+1) + ': ' + l.trim());
    }
  });
});
console.log('Suspicious interpolated DB queries count:', suspiciousCount);
if (suspiciousCount === 0) console.log('SECURITY AUDIT PASS: Zero SQL string interpolations detected!');
