import pool from './server/db/index.js';

async function updateDb() {
  try {
    await pool.query('ALTER TABLE activities DROP COLUMN IF EXISTS spokesperson_name;');
    await pool.query('ALTER TABLE activities DROP COLUMN IF EXISTS spokesperson_phone;');
    await pool.query('ALTER TABLE activities ADD COLUMN IF NOT EXISTS schedule_activity_id INTEGER REFERENCES project_schedules(id) ON DELETE SET NULL;');
    console.log('Database updated successfully');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    pool.end();
  }
}

updateDb();
