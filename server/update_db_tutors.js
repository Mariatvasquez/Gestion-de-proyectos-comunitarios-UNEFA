import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateDb() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS tutor_institucional_id INTEGER REFERENCES users(id) ON DELETE SET NULL;');
    console.log('Database updated successfully: tutor_institucional_id added');
  } catch (error) {
    console.error('Error updating database:', error);
  } finally {
    pool.end();
  }
}

updateDb();
