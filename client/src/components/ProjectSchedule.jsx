import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function ProjectSchedule({ projectId, token }) {
  const [scheduleItems, setScheduleItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Estado para el formulario de agregar/editar
  const [formData, setFormData] = useState({
    objective: '',
    activity: '',
    task: '',
    start_week: 1,
    end_week: 12
  });

  // Estado para saber cuál fila está en edición inline
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({
    objective: '',
    activity: '',
    task: '',
    start_week: 1,
    end_week: 12
  });

  // Cargar cronograma del proyecto
  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/proyectos/${projectId}/cronograma`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error('Error al cargar el cronograma del proyecto.');
      }
      const data = await res.json();
      setScheduleItems(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchSchedule();
    }
  }, [projectId]);

  // Manejar cambios en el formulario de creación
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('week') ? parseInt(value, 10) : value
    }));
  };

  // Manejar cambios en el formulario de edición inline
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: name.includes('week') ? parseInt(value, 10) : value
    }));
  };

  // Enviar nueva tarea (POST)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (formData.start_week > formData.end_week) {
      setError('La semana de inicio no puede ser posterior a la semana de fin.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/proyectos/${projectId}/cronograma`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar el registro.');
      }

      setSuccessMsg('Tarea agregada exitosamente.');
      setFormData({
        objective: '',
        activity: '',
        task: '',
        start_week: 1,
        end_week: 12
      });
      fetchSchedule(); // Recargar datos en orden
    } catch (err) {
      setError(err.message);
    }
  };

  // Iniciar edición de una fila
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditFormData({
      objective: item.objective,
      activity: item.activity,
      task: item.task,
      start_week: item.start_week,
      end_week: item.end_week
    });
  };

  // Guardar edición (PUT)
  const saveEdit = async (id) => {
    setError('');
    setSuccessMsg('');

    if (editFormData.start_week > editFormData.end_week) {
      setError('La semana de inicio no puede ser posterior a la semana de fin.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/proyectos/${projectId}/cronograma/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al actualizar el registro.');
      }

      setSuccessMsg('Registro actualizado exitosamente.');
      setEditingId(null);
      fetchSchedule();
    } catch (err) {
      setError(err.message);
    }
  };

  // Eliminar una tarea (DELETE)
  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar esta tarea del cronograma institucional?')) {
      return;
    }

    setError('');
    setSuccessMsg('');

    try {
      const res = await fetch(`${API_BASE}/proyectos/${projectId}/cronograma/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el registro.');
      }

      setSuccessMsg('Registro eliminado exitosamente.');
      fetchSchedule();
    } catch (err) {
      setError(err.message);
    }
  };

  // Generar array de semanas (1 a 12)
  const weeks = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
      
      {/* Título de la sección */}
      <div style={{ borderTop: '2px solid #E2E8F0', paddingTop: '1.5rem' }}>
        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--unefa-navy)', fontSize: '1rem', fontWeight: 'bold', margin: '0 0 0.5rem 0' }}>
          <i className="fa-solid fa-calendar-days" style={{ color: 'var(--unefa-gold)' }}></i>
          Cronograma de Actividades Institucional (Matriz Gantt de 12 Semanas)
        </h4>
        <p style={{ fontSize: '0.75rem', color: '#64748B', margin: 0 }}>
          Planificación y control semanal de los objetivos, actividades y tareas específicas del proyecto comunitario.
        </p>
      </div>

      {/* Alertas de error/éxito */}
      {error && (
        <div style={{ padding: '0.75rem 1rem', background: '#FEF2F2', borderLeft: '4px solid #EF4444', borderRadius: '6px', color: '#B91C1C', fontSize: '0.8rem', fontWeight: 500 }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: '6px' }}></i>
          {error}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: '0.75rem 1rem', background: '#ECFDF5', borderLeft: '4px solid #10B981', borderRadius: '6px', color: '#047857', fontSize: '0.8rem', fontWeight: 500 }}>
          <i className="fa-solid fa-circle-check" style={{ marginRight: '6px' }}></i>
          {successMsg}
        </div>
      )}

      {/* Formulario para agregar actividades */}
      <form onSubmit={handleSubmit} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '1rem' }}>
        <h5 style={{ fontSize: '0.8rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: '0 0 0.8rem 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Planificar Nueva Tarea / Fila
        </h5>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.8rem', marginBottom: '0.8rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Objetivo Específico</label>
            <input 
              type="text" 
              name="objective" 
              value={formData.objective} 
              onChange={handleInputChange} 
              placeholder="Ej. Diagnosticar necesidades de la comunidad"
              required 
              style={{ padding: '0.5rem', fontSize: '0.78rem', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Actividad</label>
            <input 
              type="text" 
              name="activity" 
              value={formData.activity} 
              onChange={handleInputChange} 
              placeholder="Ej. Visita técnica y entrevistas"
              required 
              style={{ padding: '0.5rem', fontSize: '0.78rem', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Tarea Específica</label>
            <input 
              type="text" 
              name="task" 
              value={formData.task} 
              onChange={handleInputChange} 
              placeholder="Ej. Redactar encuesta y aplicar a 20 familias"
              required 
              style={{ padding: '0.5rem', fontSize: '0.78rem', border: '1px solid #CBD5E1', borderRadius: '4px', outline: 'none' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Semana Inicio</label>
              <select 
                name="start_week" 
                value={formData.start_week} 
                onChange={handleInputChange} 
                style={{ padding: '0.5rem', fontSize: '0.78rem', border: '1px solid #CBD5E1', borderRadius: '4px', background: 'white' }}
              >
                {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>Semana Fin</label>
              <select 
                name="end_week" 
                value={formData.end_week} 
                onChange={handleInputChange} 
                style={{ padding: '0.5rem', fontSize: '0.78rem', border: '1px solid #CBD5E1', borderRadius: '4px', background: 'white' }}
              >
                {weeks.map(w => <option key={w} value={w}>Semana {w}</option>)}
              </select>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', borderRadius: '5px', height: 'fit-content' }}
          >
            <i className="fa-solid fa-plus"></i>
            Agregar al Cronograma
          </button>
        </div>
      </form>

      {/* Tabla del Cronograma (Gantt) */}
      {loading ? (
        <p style={{ textAlign: 'center', fontSize: '0.8rem', padding: '1rem', color: '#64748B' }}>Cargando cronograma...</p>
      ) : scheduleItems.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: '8px', color: '#64748B' }}>
          <i className="fa-solid fa-calendar-xmark" style={{ fontSize: '1.5rem', color: '#94A3B8', marginBottom: '0.5rem', display: 'block' }}></i>
          <p style={{ fontSize: '0.8rem', margin: 0 }}>No hay actividades planificadas para este proyecto.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', minWidth: '850px' }}>
            <thead>
              <tr style={{ background: 'var(--unefa-navy)', color: 'white', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, width: '22%' }}>Objetivo Específico</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, width: '22%' }}>Actividades</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, width: '22%' }}>Tareas</th>
                {weeks.map(w => (
                  <th key={w} style={{ padding: '0.5rem 0', textAlign: 'center', fontWeight: 600, width: '2.5%', minWidth: '35px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                    {w}
                  </th>
                ))}
                <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, width: '8%' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {scheduleItems.map((item) => {
                const isEditing = editingId === item.id;
                
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #E2E8F0', verticalAlign: 'middle', background: isEditing ? '#F1F5F9' : 'transparent' }}>
                    
                    {/* Celda: Objetivo */}
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#1E293B' }}>
                      {isEditing ? (
                        <textarea 
                          name="objective" 
                          value={editFormData.objective} 
                          onChange={handleEditInputChange}
                          style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', resize: 'vertical' }}
                        />
                      ) : (
                        <strong>{item.objective}</strong>
                      )}
                    </td>

                    {/* Celda: Actividad */}
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#475569' }}>
                      {isEditing ? (
                        <textarea 
                          name="activity" 
                          value={editFormData.activity} 
                          onChange={handleEditInputChange}
                          style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', resize: 'vertical' }}
                        />
                      ) : (
                        item.activity
                      )}
                    </td>

                    {/* Celda: Tarea */}
                    <td style={{ padding: '0.75rem', verticalAlign: 'top', color: '#475569' }}>
                      {isEditing ? (
                        <textarea 
                          name="task" 
                          value={editFormData.task} 
                          onChange={handleEditInputChange}
                          style={{ width: '100%', padding: '0.4rem', fontSize: '0.75rem', border: '1px solid #CBD5E1', borderRadius: '4px', resize: 'vertical' }}
                        />
                      ) : (
                        item.task
                      )}
                    </td>

                    {/* Celdas de las Semanas (Matriz Gantt) */}
                    {weeks.map((w) => {
                      const start = isEditing ? editFormData.start_week : item.start_week;
                      const end = isEditing ? editFormData.end_week : item.end_week;
                      
                      const isSelected = w >= start && w <= end;
                      const isStart = w === start;
                      const isEnd = w === end;

                      return (
                        <td 
                          key={w} 
                          style={{ 
                            padding: '0', 
                            position: 'relative', 
                            height: '45px', 
                            borderLeft: '1px solid #E2E8F0',
                            backgroundColor: isEditing ? '#F8FAFC' : '#fff'
                          }}
                        >
                          {isSelected && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '22%',
                                bottom: '22%',
                                left: isStart ? '8px' : '0',
                                right: isEnd ? '8px' : '0',
                                backgroundColor: 'var(--unefa-navy)',
                                borderRadius: `${isStart ? '6px' : '0'} ${isEnd ? '6px' : '0'} ${isEnd ? '6px' : '0'} ${isStart ? '6px' : '0'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#fff',
                                boxShadow: '0 2px 4px rgba(12, 35, 64, 0.15)',
                                zIndex: 1
                              }}
                              title={`Semana ${w}`}
                            >
                              {isStart && (
                                <i className="fa-solid fa-check" style={{ fontSize: '0.65rem', color: 'var(--unefa-gold)' }}></i>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}

                    {/* Acciones (Editar/Eliminar/Guardar) */}
                    <td style={{ padding: '0.5rem', textAlign: 'center', borderLeft: '1px solid #E2E8F0' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.2rem' }}>
                            <select 
                              name="start_week" 
                              value={editFormData.start_week} 
                              onChange={handleEditInputChange}
                              style={{ padding: '0.2rem', fontSize: '0.7rem', border: '1px solid #CBD5E1', borderRadius: '3px' }}
                            >
                              {weeks.map(w => <option key={w} value={w}>S{w}</option>)}
                            </select>
                            <span style={{ fontSize: '0.7rem', alignSelf: 'center' }}>al</span>
                            <select 
                              name="end_week" 
                              value={editFormData.end_week} 
                              onChange={handleEditInputChange}
                              style={{ padding: '0.2rem', fontSize: '0.7rem', border: '1px solid #CBD5E1', borderRadius: '3px' }}
                            >
                              {weeks.map(w => <option key={w} value={w}>S{w}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            <button 
                              onClick={() => saveEdit(item.id)}
                              style={{ padding: '0.25rem 0.5rem', background: 'var(--status-approved)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}
                              title="Guardar Cambios"
                            >
                              <i className="fa-solid fa-save"></i>
                            </button>
                            <button 
                              onClick={() => setEditingId(null)}
                              style={{ padding: '0.25rem 0.5rem', background: '#64748B', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}
                              title="Cancelar"
                            >
                              <i className="fa-solid fa-times"></i>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem' }}>
                          <button 
                            onClick={() => startEdit(item)}
                            style={{ padding: '0.3rem 0.5rem', background: '#E2E8F0', color: 'var(--unefa-navy)', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}
                            title="Editar Tarea"
                          >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            style={{ padding: '0.3rem 0.5rem', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem' }}
                            title="Eliminar Tarea"
                          >
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
