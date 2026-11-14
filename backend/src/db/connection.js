import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const pool = mysql.createPool({
  host:               process.env.DB_HOST     || "localhost",
  port:               Number(process.env.DB_PORT) || 3306,
  user:               process.env.DB_USER     || "root",
  password:           process.env.DB_PASSWORD || "",
  database:           process.env.DB_NAME     || "videora",
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  charset:            "utf8mb4",
});

/**
 * Fails fast when MySQL is unreachable. Called by the server entry point
 * (index.js) — not at import time, so importing the pool (tests, scripts)
 * never has process-exiting side effects.
 */
export async function verifyConnection() {
  const conn = await pool.getConnection();
  console.log("✅ MySQL connected — database:", process.env.DB_NAME);
  conn.release();
}

export default pool;
