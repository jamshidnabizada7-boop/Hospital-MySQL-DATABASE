const readline = require('readline');
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(resolve => rl.question(q, resolve));

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   🏥 Hospital Management System — Setup Wizard       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  console.log('Please enter your MySQL connection details.');
  console.log('Leave blank to use the [default] values.\n');

  const host = (await ask('MySQL Host      [localhost]: ')).trim() || 'localhost';
  const port = (await ask('MySQL Port      [3306]: ')).trim() || '3306';
  const user = (await ask('MySQL User      [root]: ')).trim() || 'root';
  const password = (await ask('MySQL Password  : ')).trim();
  const dbName = (await ask('Database Name   [Hospital_Management_System]: ')).trim() || 'Hospital_Management_System';
  rl.close();

  console.log('\n📡 Testing MySQL connection…');
  let conn;
  try {
    conn = await mysql.createConnection({ host, port: parseInt(port), user, password });
    console.log('✅ Connection successful!\n');
  } catch (err) {
    console.error('❌ Cannot connect to MySQL:', err.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Ensure MySQL Server is running.');
    console.log('  2. Verify your password in MySQL Workbench.');
    console.log('  3. Re-run: node setup.js');
    process.exit(1);
  }

  // Write .env file
  const envPath = path.join(__dirname, '.env');
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  const envContent = `DB_HOST=${host}\nDB_PORT=${port}\nDB_USER=${user}\nDB_PASSWORD=${password}\nDB_NAME=${dbName}\nJWT_SECRET=${jwtSecret}\nJWT_EXPIRES_IN=8h\nPORT=5000\nNODE_ENV=development\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file successfully created in backend/\n');

  // Import SQL file
  const sqlFile = path.join(__dirname, '..', 'Hospital_Management_System.sql');
  if (fs.existsSync(sqlFile)) {
    console.log('🗄️  Importing database (this may take a moment)…');
    try {
      const mysqlBin = 'mysql'; // Assumes mysql is in PATH. If not, it will fallback.
      const pwFlag = password ? `--password=${password}` : '--password=';
      
      try {
        execSync(`"${mysqlBin}" -u ${user} ${pwFlag} < "${sqlFile}"`, { shell: 'cmd.exe', stdio: 'pipe' });
      } catch (e) {
        // Fallback for Windows if mysql isn't natively in PATH
        const fallbackBin = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
        if (fs.existsSync(fallbackBin)) {
          execSync(`"${fallbackBin}" -u ${user} ${pwFlag} < "${sqlFile}"`, { shell: 'cmd.exe', stdio: 'pipe' });
        } else {
          throw new Error('MySQL CLI tool not found in PATH or standard location.');
        }
      }
      console.log('✅ Database imported successfully!\n');
    } catch (err) {
      console.error('⚠️  Auto-import failed:', err.message);
      console.log('\nPlease import manually in MySQL Workbench:');
      console.log('  File → Run SQL Script → Hospital_Management_System.sql\n');
    }
  } else {
    console.error('⚠️  SQL file not found at:', sqlFile);
  }

  await conn.end();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  ✅  Setup Complete!                                  ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log('║  Start server:   npm start                            ║');
  console.log('║  Open browser:   http://localhost:5000                ║');
  console.log('║                                                        ║');
  console.log('║  Demo logins:                                          ║');
  console.log('║    admin        / admin123                             ║');
  console.log('║    dr_kamal     / admin123                             ║');
  console.log('║    receptionist1/ admin123                             ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
