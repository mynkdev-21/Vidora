-- 004_password_reset_hardening.sql
-- Reset codes are stored as SHA-256 hashes and limited to 5 attempts (P2a).
-- Codes issued before this migration (stored in plain text) stop working;
-- they expire after 15 minutes anyway, so affected users just request a new one.
ALTER TABLE `password_resets`
  MODIFY COLUMN `otp` char(64) NOT NULL,
  ADD COLUMN `attempts` int NOT NULL DEFAULT 0 AFTER `otp`;

-- Invalidate any outstanding plain-text codes.
UPDATE `password_resets` SET `used` = 1 WHERE `used` = 0;
