/**
 * Database migration — creates all tables for Videora
 * Run: npm run db:migrate
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const conn = await mysql.createConnection({
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME     || "videora",
  multipleStatements: true,
});

const schema = `
-- ── Users ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('creator','admin') NOT NULL DEFAULT 'creator',
  is_verified   TINYINT(1)    NOT NULL DEFAULT 0,
  is_active     TINYINT(1)    NOT NULL DEFAULT 1,
  avatar_url    VARCHAR(500)  NULL,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role  (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Refresh Tokens ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         CHAR(36)    NOT NULL PRIMARY KEY,
  user_id    CHAR(36)    NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME    NOT NULL,
  created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Files ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS files (
  id           CHAR(36)      NOT NULL PRIMARY KEY,
  user_id      CHAR(36)      NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name  VARCHAR(255)  NOT NULL,
  mime_type    VARCHAR(100)  NOT NULL,
  size_bytes   BIGINT        NOT NULL DEFAULT 0,
  storage_path VARCHAR(500)  NOT NULL,
  public_url   VARCHAR(500)  NULL,
  status       ENUM('processing','active','deleted') NOT NULL DEFAULT 'processing',
  view_count   BIGINT        NOT NULL DEFAULT 0,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id  (user_id),
  INDEX idx_status   (status),
  INDEX idx_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Earnings ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS earnings (
  id         CHAR(36)       NOT NULL PRIMARY KEY,
  user_id    CHAR(36)       NOT NULL,
  file_id    CHAR(36)       NULL,
  type       ENUM('view','referral','bonus') NOT NULL DEFAULT 'view',
  amount     DECIMAL(10,4)  NOT NULL DEFAULT 0.0000,
  currency   CHAR(3)        NOT NULL DEFAULT 'USD',
  created_at DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL,
  INDEX idx_user_id  (user_id),
  INDEX idx_file_id  (file_id),
  INDEX idx_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Payouts ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payouts (
  id             CHAR(36)      NOT NULL PRIMARY KEY,
  user_id        CHAR(36)      NOT NULL,
  amount         DECIMAL(10,2) NOT NULL,
  currency       CHAR(3)       NOT NULL DEFAULT 'USD',
  method         VARCHAR(50)   NOT NULL,
  status         ENUM('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
  transaction_id VARCHAR(255)  NULL,
  notes          TEXT          NULL,
  requested_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at   DATETIME      NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Referrals ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id              CHAR(36)  NOT NULL PRIMARY KEY,
  referrer_id     CHAR(36)  NOT NULL,
  referred_id     CHAR(36)  NOT NULL,
  original_file_id CHAR(36) NULL,
  bonus_pct       DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  created_at      DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_referrer (referrer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
-- ── User API Keys ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_api_keys (
  id         CHAR(36)     NOT NULL PRIMARY KEY,
  user_id    CHAR(36)     NOT NULL UNIQUE,
  api_key    VARCHAR(64)  NOT NULL UNIQUE,
  telegram_chat_id BIGINT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_api_key (api_key),
  INDEX idx_telegram_chat_id (telegram_chat_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

try {
  await conn.query(schema);

  // Add columns that may not exist yet (safe — ignores if already present)
  const alterStatements = [
    "ALTER TABLE users ADD COLUMN referred_by CHAR(36) NULL AFTER avatar_url",
    "ALTER TABLE files ADD COLUMN thumbnail_url VARCHAR(500) NULL AFTER public_url",
    "ALTER TABLE payment_methods ADD COLUMN ifsc_code VARCHAR(20) NULL AFTER account_id",
  ];

  for (const sql of alterStatements) {
    try { await conn.query(sql); } catch { /* column already exists */ }
  }

  // Create admins table (separate from users)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS admins (
      id            CHAR(36)      NOT NULL PRIMARY KEY,
      name          VARCHAR(100)  NOT NULL,
      email         VARCHAR(255)  NOT NULL UNIQUE,
      password_hash VARCHAR(255)  NOT NULL,
      is_active     TINYINT(1)    NOT NULL DEFAULT 1,
      last_login    DATETIME      NULL,
      created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("✅ All tables created successfully in database:", process.env.DB_NAME);
} catch (err) {
  console.error("❌ Migration failed:", err.message);
} finally {
  await conn.end();
}
