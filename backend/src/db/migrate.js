/**
 * Versioned SQL migration runner.
 *
 *   npm run db:migrate            apply pending migrations
 *   npm run db:migrate -- --status  list applied / pending, change nothing
 *
 * Migrations live in src/db/migrations/NNN_name.sql and run in filename order.
 * Each applied file is recorded in `schema_migrations` with a SHA-256 checksum;
 * editing an already-applied file is reported as an error instead of silently
 * re-running or ignoring it. MySQL auto-commits DDL, so a failed migration can
 * be partially applied — always back up production before migrating.
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import "dotenv/config";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export function listMigrationFiles(dir = MIGRATIONS_DIR) {
  return fs.readdirSync(dir)
    .filter((f) => /^\d{3}_[\w-]+\.sql$/.test(f))
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(dir, name), "utf8");
      return { name, sql, checksum: crypto.createHash("sha256").update(sql).digest("hex") };
    });
}

export async function runMigrations({ database = process.env.DB_NAME || "videora", statusOnly = false, log = console.log } = {}) {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database,
    multipleStatements: true,
    charset: "utf8mb4",
  });

  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name       VARCHAR(255) NOT NULL PRIMARY KEY,
        checksum   CHAR(64)     NOT NULL,
        applied_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const [rows] = await conn.query("SELECT name, checksum FROM schema_migrations");
    const applied = new Map(rows.map((r) => [r.name, r.checksum]));
    const files = listMigrationFiles();

    const changed = files.filter((f) => applied.has(f.name) && applied.get(f.name) !== f.checksum);
    if (changed.length) {
      throw new Error(`Already-applied migrations were modified: ${changed.map((f) => f.name).join(", ")}. Add a new migration instead of editing old ones.`);
    }

    const pending = files.filter((f) => !applied.has(f.name));
    log(`Database: ${database} — ${applied.size} applied, ${pending.length} pending`);
    for (const f of files) log(`  ${applied.has(f.name) ? "✔" : "…"} ${f.name}`);
    if (statusOnly) return { applied: [...applied.keys()], pending: pending.map((f) => f.name) };

    for (const f of pending) {
      log(`→ applying ${f.name}`);
      await conn.query(f.sql);
      await conn.query("INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)", [f.name, f.checksum]);
    }
    log(pending.length ? "✅ Migrations complete." : "✅ Nothing to apply.");
    return { applied: [...applied.keys(), ...pending.map((f) => f.name)], pending: [] };
  } finally {
    await conn.end();
  }
}

// CLI entry point
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runMigrations({ statusOnly: process.argv.includes("--status") })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Migration failed:", err.message);
      process.exit(1);
    });
}
