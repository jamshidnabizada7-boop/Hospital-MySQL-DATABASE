const db = require('./db');
const h = '$2b$10$T2yV99L3CkWYEHB4AvcED.UsNAvUcG4kjoJPDeDKL1h/f6J9ibS5K';
db.query('UPDATE App_User SET Password_Hash = ?', [h]).then(() => { console.log('Updated passwords'); process.exit(0); });
