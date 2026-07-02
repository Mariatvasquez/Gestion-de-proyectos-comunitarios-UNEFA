import { query } from './index.js';

async function updateTable() {
  try {
    console.log('🔄 Actualizando tabla historical_projects para incluir ruta_archivo...');
    await query('ALTER TABLE historical_projects ADD COLUMN IF NOT EXISTS ruta_archivo VARCHAR(500);');
    console.log('✅ Columna "ruta_archivo" agregada exitosamente a "historical_projects".');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al actualizar la tabla:', error);
    process.exit(1);
  }
}

updateTable();
