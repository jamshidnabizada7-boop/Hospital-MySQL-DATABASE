const path = require('path');
require('../../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../../backend/.env') });
const db = require('../../backend/db');

async function debug() {
  console.log('Testing DB connection...');
  const conn = await db.getConnection();
  console.log('Connection acquired.');

  try {
    console.log('Beginning transaction...');
    await conn.beginTransaction();

    console.log('Querying SELECT Emp_ID, User_ID FROM Employee WHERE Emp_ID = 999999...');
    const [empRows] = await conn.query('SELECT Emp_ID, User_ID FROM Employee WHERE Emp_ID = ?', [999999]);
    console.log('Result:', empRows);

    if (!empRows.length) {
      console.log('empRows is empty! Calling conn.rollback()...');
      await conn.rollback();
      console.log('Rollback successful.');
    }
  } catch (err) {
    console.error('CATCH ERROR:', err);
  } finally {
    conn.release();
    console.log('Released connection.');
    process.exit(0);
  }
}

debug();
