const { Pool } = require("pg");

const ssl =
  process.env.DB_SSL === "true"
    ? { rejectUnauthorized: false }
    : false;

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl,
    }
  : {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl,
    };

const pool = new Pool(poolConfig);

pool
  .query("SELECT NOW()")
  .then((result) => console.log("PostgreSQL підключений:", result.rows[0]))
  .catch((error) => console.error("Помилка PostgreSQL:", error.message));

module.exports = pool;
