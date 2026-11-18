-- Browser-only, revocable sessions. Mobile refresh_tokens remain unchanged.
CREATE TABLE user_browser_sessions (
  id char(36) NOT NULL PRIMARY KEY,
  principal_id char(36) NOT NULL,
  imp_admin_id char(36) DEFAULT NULL,
  refresh_hash char(64) NOT NULL,
  expires_at datetime NOT NULL,
  revoked_at datetime DEFAULT NULL,
  UNIQUE KEY uq_user_browser_refresh (refresh_hash),
  KEY idx_user_browser_principal (principal_id),
  KEY idx_user_browser_expiry (expires_at),
  CONSTRAINT fk_user_browser_principal FOREIGN KEY (principal_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admin_browser_sessions (
  id char(36) NOT NULL PRIMARY KEY,
  principal_id char(36) NOT NULL,
  refresh_hash char(64) NOT NULL,
  expires_at datetime NOT NULL,
  revoked_at datetime DEFAULT NULL,
  UNIQUE KEY uq_admin_browser_refresh (refresh_hash),
  KEY idx_admin_browser_principal (principal_id),
  KEY idx_admin_browser_expiry (expires_at),
  CONSTRAINT fk_admin_browser_principal FOREIGN KEY (principal_id) REFERENCES admins(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
