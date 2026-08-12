const dotenv = require('../../backend/node_modules/dotenv');
dotenv.config({ path: './backend/.env' });
const db = require('../../backend/db');

async function test() {
  console.log('--- M1 DB Verification ---');
  const [rows] = await db.query('DESCRIBE Employee');
  const deptCol = rows.find(r => r.Field === 'Dept_ID');
  console.log('Dept_ID column:', deptCol);
  if (deptCol.Null === 'YES') {
    console.log('VERIFICATION SUCCESS: Dept_ID is NULLABLE in Employee table.');
  } else {
    console.error('VERIFICATION FAIL: Dept_ID is NOT nullable.');
    process.exit(1);
  }
  process.exit(0);
}

test();
