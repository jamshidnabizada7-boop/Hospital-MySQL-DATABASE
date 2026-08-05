const db = require('./db');
const fs = require('fs');

async function fix() {
  try {
    const hash = '$2b$10$CUU1P4PmnHHjb/Ce16x7W.bFq.l.SnWj47bR4vRHqAeIbk5egC98O'; // admin123
    
    // Fix live DB
    await db.query('UPDATE App_User SET Password_Hash = ?', [hash]);
    console.log('Live DB passwords fixed.');

    // Fix SQL dump
    let sqlPath = '../Hospital_Management_System.sql';
    let sql = fs.readFileSync(sqlPath, 'utf8');
    
    // We will do a generic replacement for the insert block.
    const startIdx = sql.indexOf('INSERT INTO App_User(Role_ID, Username, Password_Hash');
    if (startIdx !== -1) {
        const endIdx = sql.indexOf(';', startIdx);
        let block = sql.substring(startIdx, endIdx);
        // Replace the 3rd value in each tuple (which is the password hash)
        // Tuple format: (1, 'admin', 'CORRUPTED_HASH', ... )
        block = block.replace(/(\d+,\s*'.+?',\s*)'.+?'(,\s*'.+?')/g, `$1'${hash}'$2`);
        sql = sql.substring(0, startIdx) + block + sql.substring(endIdx);
        fs.writeFileSync(sqlPath, sql);
        console.log('SQL dump passwords fixed.');
    } else {
        console.log('Could not find App_User insert block in SQL dump.');
    }
    
  } catch (err) {
    console.error('Error fixing passwords:', err);
  } finally {
    process.exit(0);
  }
}
fix();
