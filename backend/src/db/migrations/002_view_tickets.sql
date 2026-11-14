-- 002_view_tickets.sql
-- Server-side validation for paid views (audit finding F5).
-- Additive only: new tables, no changes to existing rows.

-- One-time tickets issued when playback starts and redeemed after the minimum
-- watch time. Only the SHA-256 of the ticket is stored.
CREATE TABLE IF NOT EXISTS `view_tickets` (
  `id`          char(36)     NOT NULL,
  `ticket_hash` char(64)     NOT NULL,
  `file_id`     char(36)     NOT NULL,
  `share_token` varchar(32)  DEFAULT NULL,
  `viewer_key`  varchar(80)  NOT NULL,
  `issued_at`   datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at`  datetime     NOT NULL,
  `redeemed_at` datetime     DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ticket_hash` (`ticket_hash`),
  KEY `idx_expires` (`expires_at`),
  CONSTRAINT `view_tickets_file_fk` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- At most one counted view per viewer, per file, per UTC day. The primary key
-- makes the de-duplication atomic (INSERT IGNORE), even under concurrency.
CREATE TABLE IF NOT EXISTS `view_counted` (
  `file_id`    char(36)    NOT NULL,
  `viewer_key` varchar(80) NOT NULL,
  `view_date`  date        NOT NULL,
  `created_at` datetime    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`file_id`, `viewer_key`, `view_date`),
  KEY `idx_viewer_date` (`viewer_key`, `view_date`),
  CONSTRAINT `view_counted_file_fk` FOREIGN KEY (`file_id`) REFERENCES `files` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit trail: every redemption attempt with its outcome and reason.
CREATE TABLE IF NOT EXISTS `view_events` (
  `id`         bigint       NOT NULL AUTO_INCREMENT,
  `file_id`    char(36)     NOT NULL,
  `viewer_key` varchar(80)  NOT NULL,
  `user_id`    char(36)     DEFAULT NULL,
  `counted`    tinyint(1)   NOT NULL,
  `reason`     varchar(32)  NOT NULL,
  `created_at` datetime     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_file_created` (`file_id`, `created_at`),
  KEY `idx_viewer_created` (`viewer_key`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
