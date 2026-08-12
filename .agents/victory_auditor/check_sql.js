const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../../backend/routes');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).map(f => path.join(dir, f));

let dangerous = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Look for unsafe patterns like `req.body` or `req.query` or `req.params` inside string templates inside query calls
    if ((line.includes('db.query') || line.includes('conn.query') || line.includes('pool.query')) && line.includes('${')) {
      if (line.includes('req.body') || line.includes('req.query') || line.includes('req.params') || line.includes('search') || line.includes('id') || line.includes('name')) {
        // Exclude safe parameters like ${where} when params is passed
        dangerous.push({ file: path.basename(file), lineNum: idx + 1, code: line.trim() });
      }
    }
  });
});

console.log(`Dangerous query candidates found: ${dangerous.length}`);
if (dangerous.length > 0) {
  console.log(JSON.stringify(dangerous, null, 2));
} else {
  console.log('No direct user inputs interpolated into SQL strings found.');
}
