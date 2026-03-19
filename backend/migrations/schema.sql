-- ============================================================
-- Daily Time Record (DTR) System — PostgreSQL Schema
-- Philippine Labor Code Compliant
-- Articles: 83, 86, 87, 88, 93 | Book III Rule IV Sec. 4
-- ============================================================

-- ── Departments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id                SERIAL       PRIMARY KEY,
  employee_code     VARCHAR(20)  UNIQUE NOT NULL,
  first_name        VARCHAR(100) NOT NULL,
  last_name         VARCHAR(100) NOT NULL,
  middle_name       VARCHAR(100),
  department_id     INTEGER      REFERENCES departments(id) ON DELETE SET NULL,
  position          VARCHAR(100),
  date_hired        DATE,
  employment_status VARCHAR(20)  NOT NULL DEFAULT 'regular'
                    CHECK (employment_status IN ('regular', 'probationary', 'contractual', 'part_time')),
  daily_rate        NUMERIC(12,2) NOT NULL DEFAULT 0,
  schedule_in       TIME         NOT NULL DEFAULT '08:00',
  schedule_out      TIME         NOT NULL DEFAULT '17:00',
  is_active         BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  DEFAULT NOW()
);

-- ── Attendance Records (DTR) ──────────────────────────────────
-- Implements the 4-Punch System:
--   AM_IN  → Clock-in
--   AM_OUT → Lunch Start  (nullable — missed lunch punch handled via auto-deduction)
--   PM_IN  → Lunch End    (nullable)
--   PM_OUT → Clock-out
CREATE TABLE IF NOT EXISTS attendance_records (
  id              SERIAL  PRIMARY KEY,
  employee_id     INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  record_date     DATE    NOT NULL,
  day_type        VARCHAR(30) NOT NULL DEFAULT 'regular'
                  CHECK (day_type IN ('regular', 'rest_day', 'special_holiday', 'regular_holiday')),

  -- 4-Punch timestamps
  am_in           TIME,
  am_out          TIME,
  pm_in           TIME,
  pm_out          TIME,

  -- Computed time metrics (populated by Node.js DTR Calculator)
  total_rendered_hours  NUMERIC(6,4)  NOT NULL DEFAULT 0,
  late_minutes          INTEGER       NOT NULL DEFAULT 0,
  undertime_minutes     INTEGER       NOT NULL DEFAULT 0,
  overtime_minutes      INTEGER       NOT NULL DEFAULT 0,
  overtime_hours        NUMERIC(6,4)  NOT NULL DEFAULT 0,
  night_diff_hours      NUMERIC(6,4)  NOT NULL DEFAULT 0,
  missed_lunch_punch    BOOLEAN       NOT NULL DEFAULT FALSE,

  -- Computed pay fields (PHP — based on employee daily_rate / 8)
  regular_pay           NUMERIC(12,2) NOT NULL DEFAULT 0,
  overtime_pay          NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Art. 87: 125%/130%/200%
  night_diff_pay        NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Art. 86: 10% premium
  late_deduction        NUMERIC(12,2) NOT NULL DEFAULT 0,  -- Art. 88: cannot be offset by OT
  undertime_deduction   NUMERIC(12,2) NOT NULL DEFAULT 0,

  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (employee_id, record_date)
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_att_employee     ON attendance_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_att_date         ON attendance_records(record_date);
CREATE INDEX IF NOT EXISTS idx_att_emp_date     ON attendance_records(employee_id, record_date);
CREATE INDEX IF NOT EXISTS idx_emp_active       ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_emp_department   ON employees(department_id);

-- ── Default Departments ───────────────────────────────────────
INSERT INTO departments (name) VALUES
  ('Administration'),
  ('Finance'),
  ('Human Resources'),
  ('Information Technology'),
  ('Operations'),
  ('Sales & Marketing')
ON CONFLICT (name) DO NOTHING;
