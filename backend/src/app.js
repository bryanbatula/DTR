// Load .env from src/ (local dev) or project root (production)
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });
require('dotenv').config(); // fallback to backend root .env
const express = require('express');
const cors = require('cors');
const { pool } = require('./config/database');

const employeeRoutes  = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const dashboardRoutes  = require('./routes/dashboard');

const app = express();

const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : true; // allow all in development

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/employees',  employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/dashboard',  dashboardRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Boot ──────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await pool.query('SELECT 1');
    console.log('✓ PostgreSQL connected');
    app.listen(PORT, () => console.log(`✓ API server listening on port ${PORT}`));
  } catch (err) {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  }
})();
