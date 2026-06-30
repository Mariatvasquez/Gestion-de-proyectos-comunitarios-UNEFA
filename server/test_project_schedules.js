import { query } from './db/index.js';

// Para probar los endpoints, podemos simular una petición HTTP levantando temporalmente el servidor, 
// o bien probar directamente la lógica de base de datos y validaciones de forma programática.
// Dado que queremos probar los endpoints reales, iniciaremos el servidor Express en un puerto alternativo (e.g. 5001)
// y haremos peticiones fetch locales para comprobar el flujo CRUD completo.

import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import projectSchedulesRouter from './routes/projectSchedules.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/proyectos', projectSchedulesRouter);

const PORT = 5001;
const server = app.listen(PORT, async () => {
  console.log(`🧪 Servidor de pruebas ejecutándose en el puerto ${PORT}`);
  
  try {
    // 1. Iniciar sesión para obtener el Token JWT
    console.log('\n🔑 1. Iniciando sesión como Coordinador...');
    const loginRes = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identification: 'V-10203040',
        password: 'unefa123'
      })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Error de inicio de sesión: ${loginRes.statusText}`);
    }
    
    const { token } = await loginRes.json();
    console.log('✅ Token obtenido con éxito.');

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // 2. Crear una nueva tarea en el cronograma (POST)
    console.log('\n➕ 2. Creando tarea de prueba (POST)...');
    const createRes = await fetch(`http://localhost:${PORT}/api/proyectos/1/cronograma`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        objective: 'Objetivo de Prueba Integración',
        activity: 'Actividad de Prueba',
        task: 'Tarea de Prueba',
        start_week: 3,
        end_week: 7
      })
    });

    if (!createRes.ok) {
      const errData = await createRes.json();
      throw new Error(`Error en POST: ${errData.error || createRes.statusText}`);
    }

    const newSchedule = await createRes.json();
    console.log('✅ Tarea creada:', newSchedule);
    const scheduleId = newSchedule.id;

    // 3. Crear otra tarea con semana de inicio anterior para verificar el ordenamiento (POST)
    console.log('\n➕ 3. Creando segunda tarea de prueba con semana de inicio anterior (POST)...');
    const createRes2 = await fetch(`http://localhost:${PORT}/api/proyectos/1/cronograma`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        objective: 'Objetivo de Diagnóstico Inicial',
        activity: 'Reunión de diagnóstico',
        task: 'Elaborar actas de reunión',
        start_week: 1,
        end_week: 2
      })
    });
    const newSchedule2 = await createRes2.json();
    console.log('✅ Segunda tarea creada:', newSchedule2);

    // 4. Obtener las tareas del cronograma (GET) y comprobar orden
    console.log('\n🔍 4. Consultando el cronograma del proyecto (GET)...');
    const getRes = await fetch(`http://localhost:${PORT}/api/proyectos/1/cronograma`, {
      headers
    });
    
    if (!getRes.ok) {
      throw new Error(`Error en GET: ${getRes.statusText}`);
    }
    
    const scheduleList = await getRes.json();
    console.log('📋 Lista de tareas obtenida (ordenadas por start_week):');
    console.table(scheduleList.map(item => ({
      id: item.id,
      obj: item.objective,
      start: item.start_week,
      end: item.end_week
    })));

    // Validar orden
    if (scheduleList[0].start_week > scheduleList[1].start_week) {
      throw new Error('❌ Las tareas no se devolvieron ordenadas por start_week.');
    } else {
      console.log('✅ Verificación de orden exitosa.');
    }

    // 5. Actualizar la primera tarea (PUT)
    console.log(`\n📝 5. Actualizando la tarea con ID ${scheduleId} (PUT)...`);
    const updateRes = await fetch(`http://localhost:${PORT}/api/proyectos/1/cronograma/${scheduleId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        objective: 'Objetivo de Prueba Actualizado',
        activity: 'Actividad de Prueba Modificada',
        task: 'Tarea de Prueba Modificada',
        start_week: 4,
        end_week: 8
      })
    });

    if (!updateRes.ok) {
      const errData = await updateRes.json();
      throw new Error(`Error en PUT: ${errData.error || updateRes.statusText}`);
    }

    const updatedSchedule = await updateRes.json();
    console.log('✅ Tarea actualizada:', updatedSchedule);

    // 6. Eliminar ambas tareas de prueba (DELETE) para dejar limpia la BD
    console.log(`\n🗑️ 6. Eliminando tarea de prueba con ID ${scheduleId} (DELETE)...`);
    const deleteRes = await fetch(`http://localhost:${PORT}/api/proyectos/1/cronograma/${scheduleId}`, {
      method: 'DELETE',
      headers
    });

    if (!deleteRes.ok) {
      throw new Error(`Error en DELETE: ${deleteRes.statusText}`);
    }
    console.log('✅ Primera tarea eliminada.');

    console.log(`🗑️ Eliminando segunda tarea con ID ${newSchedule2.id} (DELETE)...`);
    await fetch(`http://localhost:${PORT}/api/proyectos/1/cronograma/${newSchedule2.id}`, {
      method: 'DELETE',
      headers
    });
    console.log('✅ Segunda tarea eliminada.');

    console.log('\n🎉 ¡TODAS LAS PRUEBAS UNITARIAS Y DE INTEGRACIÓN PASARON EXITOSAMENTE! 🎉');

  } catch (error) {
    console.error('\n❌ Ocurrió un error durante las pruebas:', error.message);
  } finally {
    console.log('\n🔌 Cerrando servidor de pruebas...');
    server.close();
    process.exit(0);
  }
});
