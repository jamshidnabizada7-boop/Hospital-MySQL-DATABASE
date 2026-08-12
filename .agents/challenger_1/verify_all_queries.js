const fs = require('fs');
const path = require('path');

const routeFiles = fs.readdirSync('backend/routes').map(f => 'backend/routes/' + f);

console.log('--- DB Query Audit Across All Routes ---');
let totalQueries = 0;
let safeQueries = 0;

routeFiles.forEach(file => {
  const code = fs.readFileSync(file, 'utf8');
  // Match db.query(...) calls
  const matches = code.match(/db\.(query|execute)\s*\([^;]+;/g) || [];
  totalQueries += matches.length;
  console.log(`${file}: found ${matches.length} DB calls`);
});

console.log(`Total DB Calls: ${totalQueries}`);
