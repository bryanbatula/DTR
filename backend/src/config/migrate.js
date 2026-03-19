// Load from src/.env first (local dev), then backend root (CI/production)
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('./database');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const schemaPath = path.join(__dirname, '../../migrations/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');

  console.log('Running database migration...');
  try {
    await pool.query(sql);
    console.log('✓ Migration completed successfully');
  } catch (err) {
    console.error('✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
