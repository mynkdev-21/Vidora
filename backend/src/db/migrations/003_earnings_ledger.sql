-- 003_earnings_ledger.sql
-- Money integrity (audit findings F6, F8, P2d, P2e, N5).
--
-- DATA CHANGES (explicit, reviewed — back up before applying):
--   * files.legacy_views is backfilled from view_count, freezing every view
--     counted before this migration as "legacy".
--   * app_settings.legacy_earning_rate is set to the current earning_rate.
-- Legacy views are therefore paid at the rate in force at migration time, and
-- every view counted afterwards is credited to the earnings ledger at the rate
-- in force when it happened. Changing earning_rate later no longer re-prices
-- past views. No existing balances change as a result of this migration.

-- ── Copies: who gets paid for views on a copied file ─────────────────────────
ALTER TABLE `files`
  ADD COLUMN `source_file_id` char(36) DEFAULT NULL AFTER `user_id`,
  ADD COLUMN `payee_user_id`  char(36) DEFAULT NULL AFTER `source_file_id`,
  ADD COLUMN `legacy_views`   bigint   NOT NULL DEFAULT 0 AFTER `view_count`,
  ADD KEY `idx_source_file` (`source_file_id`),
  ADD KEY `idx_stored_name` (`stored_name`);

UPDATE `files` SET `legacy_views` = `view_count`;

INSERT IGNORE INTO `app_settings` (`id`, `value`)
  SELECT 'legacy_earning_rate', COALESCE((SELECT `value` FROM `app_settings` WHERE `id` = 'earning_rate'), '5');

-- ── Earnings ledger ──────────────────────────────────────────────────────────
-- view rows: one per (payee, file, UTC day), incremented atomically per counted
--            view at the then-current rate.
-- referral rows: one per payout (payout_id unique) — a bonus can't be paid twice.
ALTER TABLE `earnings`
  MODIFY COLUMN `amount` decimal(14,6) NOT NULL DEFAULT '0.000000',
  ADD COLUMN `payout_id`  char(36) DEFAULT NULL AFTER `file_id`,
  ADD COLUMN `earn_date`  date     DEFAULT NULL AFTER `amount`,
  ADD COLUMN `view_count` int      NOT NULL DEFAULT 0 AFTER `earn_date`,
  ADD UNIQUE KEY `uq_payout_type` (`payout_id`, `type`),
  ADD UNIQUE KEY `uq_view_day` (`user_id`, `file_id`, `type`, `earn_date`);

-- ── Subscriber notifications used type 'subscription', which the enum lacked
--    (inserts failed in strict mode, so subscribers never got them).
ALTER TABLE `notifications`
  MODIFY COLUMN `type` enum('payout','ticket','system','custom','subscription') NOT NULL DEFAULT 'custom';
