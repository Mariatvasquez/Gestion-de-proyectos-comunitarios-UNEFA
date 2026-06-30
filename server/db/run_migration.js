import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de base de datos...');
    const sqlPath = path.join(__dirname, 'create_project_schedules.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await query(sql);
    console.log('✅ Tabla "project_schedules" creada o ya existente de manera exitosa.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando la migración:', error);
    process.exit(1);
  }
}

runMigration();
