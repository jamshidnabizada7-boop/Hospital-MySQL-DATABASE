/**
 * setup.js — Interactive first-run setup for HMS
 * Usage: node setup.js
 */
const readline = require('readline');
const mysql    = require('mysql2/promise');
const fs       = require('fs');
const path     = require('path');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(r => rl.question(q, r));

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   🏥 Hospital Management System — Setup Wizard       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const host     = (await ask('MySQL Host      [localhost]: ')).trim() || 'localhost';
  const port     = (await ask('MySQL Port      [3306]: ')).trim()      || '3306';
  const user     = (await ask('MySQL User      [root]: ')).trim()      || 'root';
  const password = (await ask('MySQL Password  : ')).trim();
  const dbName   = (await ask('Database Name   [Hospital_Management_System]: ')).trim() || 'Hospital_Management_System';
  const jwtSec   = (await ask('JWT Secret      [auto-generate]: ')).trim() ||
                   require('crypto').randomBytes(32).toString('hex');
  rl.close();

  console.log('\n📡 Testing MySQL connection…');
  let conn;
  try {
    conn = await mysql.createConnection({ host, port: parseInt(port), user, password });
    console.log('✅ Connection successful!\n');
  } catch (err) {
    console.error('❌ Cannot connect to MySQL:', err.message);
    console.log('\nTroubleshooting:');
    console.log('  1. Make sure MySQL Server 8.0 is running');
    console.log('  2. Check your password in MySQL Workbench → Users and Privileges');
    console.log('  3. Re-run:  node setup.js');
    process.exit(1);
  }

  // Write .env
  const envPath = path.join(__dirname, 'backend', '.env');
  const envContent = `DB_HOST=${host}\nDB_PORT=${port}\nDB_USER=${user}\nDB_PASSWORD=${password}\nDB_NAME=${dbName}\nJWT_SECRET=${jwtSec}\nJWT_EXPIRES_IN=8h\nPORT=5000\nNODE_ENV=development\n`;
  fs.writeFileSync(envPath, envContent);
  console.log('✅ .env file written\n');

  // Run SQL script
  const sqlFile = path.join(__dirname, 'Hospital_Management_System.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found:', sqlFile);
    await conn.end();
    process.exit(1);
  }

  console.log('🗄️  Importing database (this may take 10–30 seconds)…');
  try {
    // Split on DELIMITER changes to handle stored procedures
    let sql = fs.readFileSync(sqlFile, 'utf8');

    // Execute via mysql CLI for full compatibility
    const { execSync } = require('child_process');
    const mysqlBin = 'C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe';
    const pwFlag   = password ? `--password=${password}` : '--password=';

    try {
      execSync(
        `"${mysqlBin}" -u ${user} ${pwFlag} < "${sqlFile}"`,
        { shell: 'cmd.exe', stdio: 'pipe' }
      );
      console.log('✅ Database imported successfully!\n');
    } catch (execErr) {
      // Try with PowerShell pipe
      execSync(
        `Get-Content "${sqlFile}" | & "${mysqlBin}" -u ${user} ${pwFlag}`,
        { shell: 'powershell.exe', stdio: 'pipe' }
      );
      console.log('✅ Database imported successfully!\n');
    }
  } catch (err) {
    console.error('⚠️  Auto-import failed:', err.message);
    console.log('\nPlease import manually in MySQL Workbench:');
    console.log('  File → Run SQL Script → Hospital_Management_System.sql\n');
  }

  await conn.end();

  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  ✅  Setup Complete!                                  ║');
  console.log('╠══════════════════════════════════════════════════════╣');
  console.log(`║  Start server:   cd backend && node server.js         ║`);
  console.log(`║  Open browser:   http://localhost:5000                ║`);
  console.log('║                                                        ║');
  console.log('║  Demo logins:                                          ║');
  console.log('║    admin        / (any password)                       ║');
  console.log('║    dr_kamal     / (any password)                       ║');
  console.log('║    receptionist1/ (any password)                       ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

main().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
