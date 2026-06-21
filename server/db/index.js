import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Configurar el Pool de conexiones a PostgreSQL
const pool = new Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'unefa_servicio_comunitario',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
      }
);

// Registrar eventos de error en clientes inactivos
pool.on('error', (err, client) => {
  console.error('⚠️ Error inesperado en el cliente inactivo de pg:', err);
});

// Exportar interfaz unificada de consultas
export const query = (text, params) => pool.query(text, params);

export default pool;
