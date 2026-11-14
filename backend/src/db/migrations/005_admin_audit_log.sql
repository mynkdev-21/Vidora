-- 005_admin_audit_log.sql
-- Append-only record of privileged admin actions (impersonation, payouts,
-- bans, settings, purges). `details` never contains secret values.
CREATE TABLE IF NOT EXISTS `admin_audit_log` (
  `id`          bigint       NOT NULL AUTO_INCREMENT,
  `admin_id`    char(36)     NOT NULL,
  `action`      varchar(50)  NOT NULL,
  `target_type` varchar(30)  DEFAULT NULL,
  `target_id`   varchar(64)  DEFAULT NULL,
  `details`     json         DEFAULT NULL,
  `ip`          varchar(45)  DEFAULT NULL,
  `user_agent`  varchar(255) DEFAULT NULL,
  `created_at`  datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_created` (`admin_id`, `created_at`),
  KEY `idx_target` (`target_type`, `target_id`),
  KEY `idx_action_created` (`action`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
