import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔄 Iniciando migración de base de datos para documentos_historico...');
    const sqlPath = path.join(__dirname, 'create_documentos_historico.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await query(sql);
    console.log('✅ Tabla "documentos_historico" creada o ya existente de manera exitosa.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando la migración de documentos_historico:', error);
    process.exit(1);
  }
}

runMigration();
