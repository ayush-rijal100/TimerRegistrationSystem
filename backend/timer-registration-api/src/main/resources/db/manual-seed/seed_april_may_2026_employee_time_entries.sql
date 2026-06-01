-- Manual demo seed for April and May 2026 employee time entries.
-- Purpose:
--   1. Create realistic time-entry data for active EMPLOYEE users.
--   2. Leave intentional weekday gaps so missing-entry reports stay useful.
--   3. Avoid touching users, roles, projects, assignments, manager/admin entries, or other months.
--
-- Safe to rerun: this script first deletes only April/May 2026 time entries
-- for active EMPLOYEE users, then inserts deterministic random-looking data.

BEGIN;

DELETE FROM time_entries te
USING users u, roles r
WHERE te.user_id = u.id
  AND u.role_id = r.id
  AND r.name = 'EMPLOYEE'
  AND te.entry_date BETWEEN DATE '2026-04-01' AND DATE '2026-05-31';

WITH employee_projects AS (
  SELECT
    u.id AS user_id,
    u.full_name,
    p.id AS project_id,
    p.project_code,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY p.id) AS project_rank,
    COUNT(*) OVER (PARTITION BY u.id) AS project_count
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN user_projects up ON up.user_id = u.id
  JOIN projects p ON p.id = up.project_id
  WHERE r.name = 'EMPLOYEE'
    AND u.is_active = TRUE
    AND p.is_active = TRUE
), weekdays AS (
  SELECT day::date AS entry_date
  FROM generate_series(DATE '2026-04-01', DATE '2026-05-31', INTERVAL '1 day') AS day
  WHERE EXTRACT(ISODOW FROM day) BETWEEN 1 AND 5
), selected_days AS (
  SELECT
    ep.user_id,
    ep.full_name,
    ep.project_id,
    ep.project_code,
    wd.entry_date,
    EXTRACT(DAY FROM wd.entry_date)::int AS day_of_month,
    EXTRACT(MONTH FROM wd.entry_date)::int AS month_number,
    EXTRACT(ISODOW FROM wd.entry_date)::int AS weekday_number,
    ep.project_rank,
    ep.project_count
  FROM employee_projects ep
  CROSS JOIN weekdays wd
  WHERE ep.project_rank = ((EXTRACT(DAY FROM wd.entry_date)::int + ep.user_id::int) % ep.project_count) + 1
    -- Deterministic gaps: skips enough weekdays to make missing-entry reports interesting.
    AND ((EXTRACT(DAY FROM wd.entry_date)::int + ep.user_id::int + EXTRACT(MONTH FROM wd.entry_date)::int) % 5) NOT IN (0, 3)
), prepared_entries AS (
  SELECT
    user_id,
    project_id,
    entry_date,
    CASE ((day_of_month + user_id::int + month_number) % 5)
      WHEN 0 THEN 4.00
      WHEN 1 THEN 5.50
      WHEN 2 THEN 6.00
      WHEN 3 THEN 7.50
      ELSE 8.00
    END AS hours,
    CASE ((day_of_month + user_id::int + weekday_number) % 8)
      WHEN 0 THEN 'Implemented backend API changes'
      WHEN 1 THEN 'Fixed bugs and tested flows'
      WHEN 2 THEN 'Worked on frontend integration'
      WHEN 3 THEN 'Reviewed database and reports'
      WHEN 4 THEN 'Added validation and cleanup'
      WHEN 5 THEN 'Prepared demo data and documentation'
      WHEN 6 THEN 'Tested Discord and MCP workflow'
      ELSE 'Worked on assigned project tasks'
    END AS notes,
    CASE
      WHEN ((day_of_month + user_id::int + month_number) % 11) = 0 THEN 'DRAFT'
      ELSE 'SUBMITTED'
    END AS status
  FROM selected_days
)
INSERT INTO time_entries (user_id, project_id, entry_date, hours, notes, status, created_at, updated_at)
SELECT
  user_id,
  project_id,
  entry_date,
  hours,
  notes,
  status,
  entry_date + TIME '10:00:00',
  entry_date + TIME '18:00:00'
FROM prepared_entries
ORDER BY user_id, entry_date;

COMMIT;

-- Quick verification summary.
SELECT
  u.full_name,
  COUNT(*) AS seeded_entries,
  SUM(te.hours) AS total_hours,
  MIN(te.entry_date) AS first_entry,
  MAX(te.entry_date) AS last_entry
FROM time_entries te
JOIN users u ON u.id = te.user_id
JOIN roles r ON r.id = u.role_id
WHERE r.name = 'EMPLOYEE'
  AND te.entry_date BETWEEN DATE '2026-04-01' AND DATE '2026-05-31'
GROUP BY u.full_name
ORDER BY u.full_name;
