/**
 * Create an admin account in the admins table
 * Usage: node --env-file=.env src/db/create-admin.js <name> <email> <password>
 * Example: node --env-file=.env src/db/create-admin.js "Mayank" "admin@vidora.app" "admin123"
 */
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";

const [name, email, password] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error("❌ Usage: node --env-file=.env src/db/create-admin.js <name> <email> <password>");
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
  // Check if admin already exists
  const [existing] = await conn.query("SELECT id FROM admins WHERE email = ?", [email.toLowerCase()]);
  if (existing.length) {
    console.log(`ℹ️  Admin with email ${email} already exists.`);
    process.exit(0);
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 12);

  await conn.query(
    "INSERT INTO admins (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
    [id, name.trim(), email.toLowerCase().trim(), passwordHash]
  );

  console.log(`✅ Admin created successfully!`);
  console.log(`   Name:  ${name}`);
  console.log(`   Email: ${email}`);
  console.log(`   Login: /main/admin`);
} catch (err) {
  console.error("❌ Error:", err.message);
} finally {
  await conn.end();
}
