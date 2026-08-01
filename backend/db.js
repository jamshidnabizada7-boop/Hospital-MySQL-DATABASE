/**
 * db.js — MySQL connection pool
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306'),
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',
  database:           process.env.DB_NAME     || 'Hospital_Management_System',
  waitForConnections: true,
  connectionLimit:    20,
  queueLimit:         0,
  timezone:           '+00:00',
  decimalNumbers:     true,
});

// Test connection on startup
pool.getConnection()
  .then(conn => {
    console.log('✅  MySQL connected to', process.env.DB_NAME);
    conn.release();
  })
  .catch(err => {
    console.error('❌  MySQL connection failed:', err.message);
  });

module.exports = pool;
