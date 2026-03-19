const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

router.get('/stats', async (_req, res) => {
  try {
    const [statsRes, recentRes, deptRes] = await Promise.all([
      pool.query(`
        SELECT
          (SELECT COUNT(*) FROM employees WHERE is_active = TRUE)::int                                         AS total_employees,
          COUNT(DISTINCT a.employee_id) FILTER (WHERE a.record_date = CURRENT_DATE)::int                      AS present_today,
          COUNT(DISTINCT a.employee_id) FILTER (WHERE a.record_date = CURRENT_DATE AND a.late_minutes > 0)::int   AS late_today,
          COUNT(DISTINCT a.employee_id) FILTER (WHERE a.record_date = CURRENT_DATE AND a.overtime_minutes > 0)::int AS ot_today,
          COALESCE(SUM(a.overtime_hours) FILTER (WHERE a.record_date = CURRENT_DATE), 0)::numeric             AS total_ot_hours_today
        FROM attendance_records a
      `),
      pool.query(`
        SELECT a.*,
               e.first_name, e.last_name, e.employee_code,
               d.name AS department_name
        FROM attendance_records a
        JOIN employees e ON a.employee_id = e.id
        LEFT JOIN departments d ON e.department_id = d.id
        ORDER BY a.record_date DESC, a.updated_at DESC
        LIMIT 10
      `),
      pool.query(`
        SELECT d.name, COUNT(e.id)::int AS employee_count
        FROM departments d
        LEFT JOIN employees e ON e.department_id = d.id AND e.is_active = TRUE
        GROUP BY d.id, d.name
        ORDER BY employee_count DESC
      `),
    ]);

    res.json({
      stats:           statsRes.rows[0],
      recent_records:  recentRes.rows,
      departments:     deptRes.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
