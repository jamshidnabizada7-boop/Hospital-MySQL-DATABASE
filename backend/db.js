/**
 * db.js — MySQL connection pool
 * Works for both local (persistent) and serverless (Vercel) environments
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

// Use DATABASE_URL (PlanetScale/Railway style) or individual env vars
let pool;

if (process.env.DATABASE_URL) {
  // PlanetScale / Railway connection string format
  pool = mysql.createPool({
    uri:                process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit:    10,   // Lower for serverless
    queueLimit:         0,
    decimalNumbers:     true,
    ssl:                { rejectUnauthorized: true },
  });
} else {
  // Local / traditional config
  pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306'),
    user:               process.env.DB_USER     || 'root',
    password:           process.env.DB_PASSWORD || '',
    database:           process.env.DB_NAME     || 'Hospital_Management_System',
    waitForConnections: true,
    connectionLimit:    20,
    queueLimit:         0,
    decimalNumbers:     true,
  });
}

// Test connection on startup (non-serverless only)
if (process.env.NODE_ENV !== 'production') {
  pool.getConnection()
    .then(conn => {
      console.log('✅  MySQL connected to', process.env.DB_NAME || 'database');
      conn.release();
    })
    .catch(err => {
      console.error('❌  MySQL connection failed:', err.message);
    });
}

module.exports = pool;
