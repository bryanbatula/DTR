const { pool } = require('../config/database');

const employeeController = {

  async getDepartments(_req, res) {
    try {
      const { rows } = await pool.query('SELECT * FROM departments ORDER BY name');
      res.json({ data: rows });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getAll(req, res) {
    try {
      const { search, department_id, is_active, page = 1, limit = 50 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);
      const params = [];
      let where = 'WHERE 1=1';
      let i = 1;

      if (search) {
        where += ` AND (e.first_name ILIKE $${i} OR e.last_name ILIKE $${i} OR e.employee_code ILIKE $${i})`;
        params.push(`%${search}%`);
        i++;
      }
      if (department_id) {
        where += ` AND e.department_id = $${i++}`;
        params.push(department_id);
      }
      if (is_active !== undefined) {
        where += ` AND e.is_active = $${i++}`;
        params.push(is_active === 'true');
      }

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM employees e ${where}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      params.push(parseInt(limit), offset);
      const { rows } = await pool.query(
        `SELECT e.*, d.name AS department_name,
                ROUND(e.daily_rate / 8, 4) AS hourly_rate
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         ${where}
         ORDER BY e.last_name, e.first_name
         LIMIT $${i++} OFFSET $${i++}`,
        params
      );

      res.json({ data: rows, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async getOne(req, res) {
    try {
      const { rows } = await pool.query(
        `SELECT e.*, d.name AS department_name,
                ROUND(e.daily_rate / 8, 4) AS hourly_rate
         FROM employees e
         LEFT JOIN departments d ON e.department_id = d.id
         WHERE e.id = $1`,
        [req.params.id]
      );
      if (!rows.length) return res.status(404).json({ error: 'Employee not found' });
      res.json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async create(req, res) {
    try {
      const {
        employee_code, first_name, last_name, middle_name,
        department_id, position, date_hired, employment_status,
        daily_rate, schedule_in, schedule_out, is_active,
      } = req.body;

      if (!employee_code || !first_name || !last_name) {
        return res.status(400).json({ error: 'employee_code, first_name, and last_name are required.' });
      }

      const { rows } = await pool.query(
        `INSERT INTO employees
           (employee_code, first_name, last_name, middle_name, department_id,
            position, date_hired, employment_status, daily_rate,
            schedule_in, schedule_out, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING *`,
        [
          employee_code.trim().toUpperCase(), first_name.trim(), last_name.trim(),
          middle_name || null, department_id || null, position || null,
          date_hired || null, employment_status || 'regular',
          parseFloat(daily_rate) || 0,
          schedule_in || '08:00', schedule_out || '17:00',
          is_active !== undefined ? is_active : true,
        ]
      );
      res.status(201).json({ data: rows[0] });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ error: 'Employee code already exists.' });
      res.status(500).json({ error: err.message });
    }
  },

  async update(req, res) {
    try {
      const {
        first_name, last_name, middle_name, department_id, position,
        date_hired, employment_status, daily_rate, schedule_in,
        schedule_out, is_active,
      } = req.body;

      const { rows } = await pool.query(
        `UPDATE employees SET
           first_name=$1, last_name=$2, middle_name=$3, department_id=$4,
           position=$5, date_hired=$6, employment_status=$7, daily_rate=$8,
           schedule_in=$9, schedule_out=$10, is_active=$11, updated_at=NOW()
         WHERE id=$12 RETURNING *`,
        [
          first_name, last_name, middle_name || null, department_id || null,
          position || null, date_hired || null, employment_status || 'regular',
          parseFloat(daily_rate) || 0, schedule_in || '08:00',
          schedule_out || '17:00', is_active !== undefined ? is_active : true,
          req.params.id,
        ]
      );
      if (!rows.length) return res.status(404).json({ error: 'Employee not found' });
      res.json({ data: rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },

  async remove(req, res) {
    try {
      const { rowCount } = await pool.query(
        'DELETE FROM employees WHERE id = $1',
        [req.params.id]
      );
      if (!rowCount) return res.status(404).json({ error: 'Employee not found' });
      res.json({ message: 'Employee deleted.' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  },
};

module.exports = employeeController;
