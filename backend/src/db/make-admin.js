/**
 * Promote a user to admin role
 * Usage: node --env-file=.env src/db/make-admin.js <email>
 * Example: node --env-file=.env src/db/make-admin.js admin@vidora.app
 */
import mysql from "mysql2/promise";

const email = process.argv[2];

if (!email) {
  console.error("❌ Usage: node --env-file=.env src/db/make-admin.js <email>");
  process.exit(1);
}

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "videora",
});

try {
  const [rows] = await conn.query("SELECT id, name, email, role FROM users WHERE email = ?", [email]);

  if (!rows.length) {
    console.error(`❌ User not found: ${email}`);
    process.exit(1);
  }

  if (rows[0].role === "admin") {
    console.log(`ℹ️  ${rows[0].name} (${email}) is already an admin.`);
    process.exit(0);
  }

  await conn.query("UPDATE users SET role = 'admin' WHERE email = ?", [email]);
  console.log(`✅ ${rows[0].name} (${email}) is now an admin!`);
} catch (err) {
  console.error("❌ Error:", err.message);
} finally {
  await conn.end();
}
