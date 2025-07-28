const mysql = require("mysql2");
const dbConfig = require("../config/db.config.js");

// Debugging desu
console.log("Database configuration:", {
  host: dbConfig.HOST,
  user: dbConfig.USER,
  database: dbConfig.DB,
  passwordSet: !!dbConfig.PASSWORD,
});

// Create a connection to the database
const connection = mysql.createConnection({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
});

// Open the MySQL connection
connection.connect((error) => {
  if (error) {
    console.error("Error connecting to the database:", error.message);
    return;
  }
  console.log("Successfully connected to the database.");
});

module.exports = connection;
