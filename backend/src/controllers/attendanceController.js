const { pool } = require('../config/database');
const { calculateDTR } = require('../services/dtrCalculator');

const attendanceController = {

  async getAll(req, res) {
    try {
      const { employee_id, date_from, date_to, record_date, day_type, page = 1, limit = 50 } = req.query;
      const params = [];
      let where = 'WHERE 1=1';
      let i = 1;

      if (employee_id) { where += ` AND a.employee_id = $${i++}`; params.push(employee_id); }
      if (record_date) { where += ` AND a.record_date = $${i++}`; params.push(record_date); }
      if (date_from)   { where += ` AND a.record_date >= $${i++}`; params.push(date_from); }
      if (date_to)     { where += ` AND a.record_date <= $${i++}`; params.push(date_to); }
      if (day_type)    { where += ` AND a.day_type = $${i++}`;     params.push(day_type); }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM attendance_records a ${where}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);
      const offset = (parseInt(page) - 1) * parseInt(limit);

      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT a.*,
                e.first_name, e.last_name, e.employee_code,
                e.daily_rate, ROUND(e.daily_rate / 8, 4) AS hourly_rate,
                d.name AS department_name
         FROM attendance_records a
         JOIN employees e ON a.employee_id = e.id
         LEFT JOIN departments d ON e.department_id = d.id
         ${where}
         ORDER BY a.record_date DESC, e.last_name ASC
         LIMIT $${i++} OFFSET $${i++}`,
        params
      );
      res.json({ data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async upsert(req, res) {
    try {
      const { employee_id, record_date, am_in, am_out, pm_in, pm_out, day_type = 'regular', notes } = req.body;

      if (!employee_id || !record_date || !am_in) {
        return res.status(400).json({ error: 'employee_id, record_date, and am_in are required.' });
      }

      // Fetch employee's hourly rate (daily_rate / 8)
      const empResult = await pool.query(
        'SELECT ROUND(daily_rate / 8, 4) AS hourly_rate FROM employees WHERE id = $1',
        [employee_id]
      );
      if (!empResult.rows.length) return res.status(404).json({ error: 'Employee not found.' });

      const hourlyRate = parseFloat(empResult.rows[0].hourly_rate);
      const calc = calculateDTR({
        am_in,
        am_out:      am_out  || null,
        pm_in:       pm_in   || null,
        pm_out:      pm_out  || null,
        day_type,
        hourly_rate: hourlyRate,
      });

      const { rows } = await pool.query(
        `INSERT INTO attendance_records (
           employee_id, record_date, day_type,
           am_in, am_out, pm_in, pm_out,
           total_rendered_hours, late_minutes, undertime_minutes,
           overtime_minutes, overtime_hours, night_diff_hours, missed_lunch_punch,
           regular_pay, overtime_pay, night_diff_pay, late_deduction, undertime_deduction,
           notes, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,
           $8,$9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,$20, NOW()
         )
         ON CONFLICT (employee_id, record_date) DO UPDATE SET
           day_type             = EXCLUDED.day_type,
           am_in                = EXCLUDED.am_in,
           am_out               = EXCLUDED.am_out,
           pm_in                = EXCLUDED.pm_in,
           pm_out               = EXCLUDED.pm_out,
           total_rendered_hours = EXCLUDED.total_rendered_hours,
           late_minutes         = EXCLUDED.late_minutes,
           undertime_minutes    = EXCLUDED.undertime_minutes,
           overtime_minutes     = EXCLUDED.overtime_minutes,
           overtime_hours       = EXCLUDED.overtime_hours,
           night_diff_hours     = EXCLUDED.night_diff_hours,
           missed_lunch_punch   = EXCLUDED.missed_lunch_punch,
           regular_pay          = EXCLUDED.regular_pay,
           overtime_pay         = EXCLUDED.overtime_pay,
           night_diff_pay       = EXCLUDED.night_diff_pay,
           late_deduction       = EXCLUDED.late_deduction,
           undertime_deduction  = EXCLUDED.undertime_deduction,
           notes                = EXCLUDED.notes,
           updated_at           = NOW()
         RETURNING *`,
        [
          employee_id, record_date, day_type,
          am_in, am_out || null, pm_in || null, pm_out || null,
          calc.total_rendered_hours, calc.late_minutes, calc.undertime_minutes,
          calc.overtime_minutes, calc.overtime_hours, calc.night_diff_hours, calc.missed_lunch_punch,
          calc.regular_pay, calc.overtime_pay, calc.night_diff_pay,
          calc.late_deduction, calc.undertime_deduction, notes || null,
        ]
      );
      res.json({ data: rows[0], calculated: calc });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  },

  async calculate(req, res) {
    try {
      const { am_in, am_out, pm_in, pm_out, day_type = 'regular', hourly_rate = 0 } = req.body;
      if (!am_in) return res.status(400).json({ error: 'am_in is required.' });

      const result = calculateDTR({
        am_in,
        am_out:      am_out  || null,
        pm_in:       pm_in   || null,
        pm_out:      pm_out  || null,
        day_type,
        hourly_rate: parseFloat(hourly_rate),
      });
      res.json({ data: result });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM attendance_records WHERE id = $1',
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Record not found.' });
      res.json({ message: 'Attendance record deleted.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = attendanceController;
