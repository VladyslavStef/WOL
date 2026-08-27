// FIX: removed `const { connect } = require("../routes/bookingRoutes");`
// This created a circular require chain (db.js -> bookingRoutes.js ->
// bookingController.js -> db.js) and `connect` was never even used.

const Pool = require("pg").Pool;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pool
  .query("SELECT NOW()")
  .then((result) => console.log("PostgreSQL підключений:", result.rows[0]))
  .catch((error) => console.error("Помилка PostgreSQL:", error.message));

module.exports = pool;
