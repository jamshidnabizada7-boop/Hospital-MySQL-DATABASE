const fs = require('fs');
const path = require('path');

console.log('=== FORENSIC INTEGRITY CHECKS ===');

const projectRoot = path.resolve(__dirname, '../..');
const backendDir = path.join(projectRoot, 'backend');

const backendFiles = [];
function walk(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f !== 'node_modules' && f !== '.git' && f !== '.agents') walk(full);
    } else if (f.endsWith('.js')) {
      backendFiles.push(full);
    }
  });
}
walk(backendDir);

let hardcodedMatches = [];
let facadeMatches = [];

backendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('PASS') && content.includes('FAIL')) {
    hardcodedMatches.push(file);
  }
  const lines = content.split('\n');
  lines.forEach((l, i) => {
    if (l.trim().startsWith('return ') && (l.includes('"PASS"') || (l.includes('true') && lines.length < 10))) {
      facadeMatches.push(`${path.basename(file)}:${i+1}: ${l.trim()}`);
    }
  });
});

console.log(`1. Hardcoded test result strings in backend code: ${hardcodedMatches.length}`);
console.log(`2. Facade returns found: ${facadeMatches.length}`);

// Check package.json dependencies
const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const backendPkg = JSON.parse(fs.readFileSync(path.join(backendDir, 'package.json'), 'utf8'));
console.log('3. Root dependencies:', pkg.dependencies || {});
console.log('4. Backend dependencies:', backendPkg.dependencies || {});

const allowed = ['express', 'mysql2', 'bcryptjs', 'jsonwebtoken', 'dotenv', 'cors'];
const actualDeps = Object.keys(backendPkg.dependencies || {});
const prohibited = actualDeps.filter(d => !allowed.includes(d));

console.log(`5. Prohibited core delegation libraries: ${prohibited.length}`);
if (prohibited.length > 0) {
  console.log('PROHIBITED DEPS:', prohibited);
} else {
  console.log('DEPENDENCY AUDIT: CLEAN (Only standard auxiliary packages used: express, mysql2, bcryptjs, jsonwebtoken, dotenv, cors)');
}
