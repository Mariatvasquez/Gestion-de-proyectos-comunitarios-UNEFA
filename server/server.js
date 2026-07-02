import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Importar routers
import authRouter from './routes/auth.js';
import reportesRouter from './routes/reportes.js';
import cronogramaRouter from './routes/cronograma.js';
import proyectosRouter from './routes/proyectos.js';
import projectSchedulesRouter from './routes/projectSchedules.js';
import tutorRouter from './routes/tutor.js';
import adminRouter from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Middleware para logs de peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Registrar routers de la API
app.use('/api/auth', authRouter);
app.use('/api/reportes', reportesRouter);
app.use('/api/cronograma', cronogramaRouter);
app.use('/api/proyectos-historicos', proyectosRouter);
app.use('/api/proyectos', projectSchedulesRouter);
app.use('/api/estudiantes', tutorRouter);
app.use('/api/admin', adminRouter);

// Ruta de estado de la API (Health check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Manejador de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Express ejecutándose en el puerto ${PORT}`);
  console.log(`👉 http://localhost:${PORT}/api/health`);
});
