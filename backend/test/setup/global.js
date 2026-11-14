/**
 * Runs once before the whole suite: recreates the test database from the
 * migrations (which also proves a clean install works) and an empty uploads dir.
 */
// Must be the first import: Node loads this module before applying --import,
// and everything below reads the environment at import time.
import "./env.js";
import fs from "fs";
import mysql from "mysql2/promise";
import { runMigrations } from "../../src/db/migrate.js";

function assertTestTarget() {
  const db = process.env.DB_NAME;
  const uploads = process.env.UPLOADS_DIR || "";
  if (process.env.NODE_ENV !== "test" || !/_test$/.test(db)) {
    throw new Error(`Global setup refused: NODE_ENV=${process.env.NODE_ENV}, DB_NAME=${db}`);
  }
  if (!uploads.includes("vidora-test-uploads")) throw new Error(`Unexpected UPLOADS_DIR: ${uploads}`);
  return { db, uploads };
}

export async function globalSetup() {
  const { db, uploads } = assertTestTarget();

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
  });
  await conn.query(`DROP DATABASE IF EXISTS \`${db}\``);
  await conn.query(`CREATE DATABASE \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  await runMigrations({ database: db, log: () => {} });

  fs.rmSync(uploads, { recursive: true, force: true });
  for (const sub of ["", "thumbnails", "avatars", "receipts"]) {
    fs.mkdirSync(`${uploads}/${sub}`, { recursive: true });
  }
}

export async function globalTeardown() {
  const { uploads } = assertTestTarget();
  fs.rmSync(uploads, { recursive: true, force: true });
}
