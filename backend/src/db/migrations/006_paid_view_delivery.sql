-- Delivery evidence is additive. Old tickets have no evidence and cannot earn.
ALTER TABLE view_tickets
  ADD COLUMN delivered_at datetime DEFAULT NULL AFTER issued_at;

-- One row per authenticated viewer and UTC day. The row lock serializes
-- redemption across different files and application instances.
CREATE TABLE view_daily_counters (
  viewer_key varchar(80) NOT NULL,
  view_date date NOT NULL,
  counted int NOT NULL DEFAULT 0,
  PRIMARY KEY (viewer_key, view_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO view_daily_counters (viewer_key, view_date, counted)
SELECT viewer_key, view_date, COUNT(*) FROM view_counted
GROUP BY viewer_key, view_date;
