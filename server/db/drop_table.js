import { query } from './index.js';

async function dropTable() {
  try {
    console.log('🔄 Eliminando tabla "project_schedules" de la base de datos...');
    await query('DROP TABLE IF EXISTS project_schedules CASCADE;');
    console.log('✅ Tabla eliminada con éxito.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al eliminar la tabla:', error);
    process.exit(1);
  }
}

dropTable();
