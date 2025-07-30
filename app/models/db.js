const mysql = require("mysql2");
const dbConfig = require("../config/db.config.js");

console.log("Database configuration:", {
  host: dbConfig.HOST,
  user: dbConfig.USER,
  database: dbConfig.DB,
  passwordSet: !!dbConfig.PASSWORD,
});

// Create a connection pool instead of single connection
const pool = mysql.createPool({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
});

// Test the pool connection
pool.getConnection((error, connection) => {
  if (error) {
    console.error("Database connection failed:", error.message);
    return;
  }
  console.log("Successfully connected to the database.");
  connection.release(); // Release connection back to pool
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Database connection lost, pool will reconnect...');
  }
});

module.exports = pool;