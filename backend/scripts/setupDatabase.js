require("dotenv").config();
const fs = require("fs"); const path = require("path"); const bcrypt = require("bcryptjs"); const { Pool } = require("pg");
if (process.env.RUN_DB_SETUP !== "true") { console.log("Налаштування бази пропущено."); process.exit(0); }
if (!process.env.DATABASE_URL) { throw new Error("DATABASE_URL не встановлено."); }
if (!process.env.ADMIN_NAME || !process.env.ADMIN_PASSWORD) { throw new Error("Додай ADMIN_NAME і ADMIN_PASSWORD у Render Environment."); }
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false, });
async function setupDatabase() { const client = await pool.connect();
try { const sql = fs.readFileSync( path.join(__dirname, "../db.sql"), "utf8" );
const adminMarker = "-- ЧАСТИНА 2: АДМІН";
const seedMarker = "-- ЧАСТИНА 3: СІДИНГ";

const adminIndex = sql.indexOf(adminMarker);
const seedIndex = sql.indexOf(seedMarker);

if (adminIndex === -1 || seedIndex === -1) {
  throw new Error("Не вдалося знайти блоки у db.sql.");
}

const schemaSql = sql.slice(0, adminIndex);
const seedSql = sql.slice(seedIndex);

await client.query(schemaSql);

const adminExists = await client.query(
  "SELECT id FROM admin WHERE name = $1",
  [process.env.ADMIN_NAME]
);

if (adminExists.rows.length === 0) {
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

  await client.query(
    "INSERT INTO admin (name, password_hash) VALUES ($1, $2)",
    [process.env.ADMIN_NAME, passwordHash]
  );

  console.log("Адміністратора створено.");
}

const categories = await client.query(
  "SELECT COUNT(*)::int AS count FROM categories"
);

if (categories.rows[0].count === 0) {
  await client.query(seedSql);
  console.log("Товари та категорії успішно додані.");
} else {
  console.log("Товари вже існують — повторний seed пропущено.");
}
} finally { client.release(); await pool.end(); } }
setupDatabase().catch((error) => { console.error("Помилка ініціалізації бази:", error); process.exit(1); });
