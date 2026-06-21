import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function StudentDashboard({ user, token }) {
  const [activities, setActivities] = useState([]);
  const [summary, setSummary] = useState({ approved: 0, pending: 0, correct: 0, total: 0, remaining: 120, percentage: 0 });
  const [milestones, setMilestones] = useState([]);
  const [historicalProjects, setHistoricalProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Formulario de nueva actividad
  const [formData, setFormData] = useState({
    activity_date: '',
    hours_spent: '',
    description: '',
    physical_attendance: false,
    spokesperson_name: '',
    spokesperson_phone: '',
    sworn_statement: false
  });
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Edición de actividad
  const [editingActivity, setEditingActivity] = useState(null);

  // Cargar datos del estudiante con autenticación JWT
  const loadData = async () => {
    try {
      setLoading(true);
      // 1. Bitácoras y resumen de horas del estudiante
      const actRes = await fetch(`${API_BASE}/reportes/estudiante`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const actData = await actRes.json();
      setActivities(actData.activities || []);
      setSummary(actData.summary || { approved: 0, pending: 0, correct: 0, total: 0, remaining: 120, percentage: 0 });

      // 2. Cronograma académico
      const msRes = await fetch(`${API_BASE}/cronograma`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const msData = await msRes.json();
      setMilestones(msData || []);

      // 3. Proyectos históricos
      const projRes = await fetch(`${API_BASE}/proyectos-historicos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const projData = await projRes.json();
      setHistoricalProjects(projData || []);

      setLoading(false);
    } catch (err) {
      console.error('Error al cargar datos del estudiante:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Limpiar alertas al cambiar de estudiante
    setFormError('');
    setFormSuccess('');
    setEditingActivity(null);
    setFormData({
      activity_date: '',
      hours_spent: '',
      description: '',
      physical_attendance: false,
      spokesperson_name: '',
      spokesperson_phone: '',
      sworn_statement: false
    });
  }, [user, token]);

  // Manejar cambios en el formulario de registro
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Enviar actividad
  const handleSubmitActivity = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Validaciones
    const hours = parseInt(formData.hours_spent);
    if (isNaN(hours) || hours < 1 || hours > 8) {
      setFormError('Las horas invertidas deben estar entre 1 y 8 horas por día.');
      return;
    }

    if (!formData.sworn_statement) {
      setFormError('Debe aceptar la declaración jurada para registrar la actividad.');
      return;
    }

    try {
      const url = editingActivity 
        ? `${API_BASE}/reportes/${editingActivity.id}`
        : `${API_BASE}/reportes`;
        
      const method = editingActivity ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData
        })
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result.error || 'Error al guardar la actividad.');
        return;
      }

      setFormSuccess(editingActivity ? '✅ Actividad corregida y reenviada con éxito.' : '✅ Actividad registrada con éxito como pendiente.');
      
      // Limpiar formulario y recargar
      setFormData({
        activity_date: '',
        hours_spent: '',
        description: '',
        physical_attendance: false,
        spokesperson_name: '',
        spokesperson_phone: '',
        sworn_statement: false
      });
      setEditingActivity(null);
      loadData();
    } catch (err) {
      setFormError('Error de red al intentar registrar la actividad.');
    }
  };

  // Iniciar edición de actividad que requiere corrección
  const handleStartEdit = (act) => {
    setEditingActivity(act);
    setFormData({
      activity_date: act.activity_date.split('T')[0],
      hours_spent: act.hours_spent.toString(),
      description: act.description,
      physical_attendance: act.physical_attendance,
      spokesperson_name: act.spokesperson_name,
      spokesperson_phone: act.spokesperson_phone,
      sworn_statement: true // Ya la había aceptado
    });
    // Hacer scroll al formulario
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  // Filtrar proyectos históricos
  const filteredProjects = historicalProjects.filter(p => 
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.community.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.major.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', flexDirection: 'column', gap: '1rem' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: 'var(--unefa-navy)' }}></i>
        <p style={{ fontFamily: 'var(--font-header)', fontWeight: 600 }}>Cargando datos del estudiante...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* 1. Header con Información y Progreso */}
      <div className="glass-panel" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center' }}>
        <div>
          <span style={{ color: 'var(--unefa-gold)', fontWeight: 700, fontFamily: 'var(--font-header)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>
            Panel General del Estudiante
          </span>
          <h2 style={{ fontSize: '2rem', margin: '0.2rem 0 0.5rem 0' }}>{user.name}</h2>
          <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
            <strong>Cédula:</strong> {user.identification} | <strong>Carrera:</strong> {user.major}
          </p>
          <div style={{ marginTop: '1.2rem', display: 'flex', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(12, 35, 64, 0.05)', padding: '0.8rem 1.2rem', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--status-approved)' }}>{summary.approved} hrs</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.8 }}>Aprobadas</span>
            </div>
            <div style={{ background: 'rgba(12, 35, 64, 0.05)', padding: '0.8rem 1.2rem', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--status-pending)' }}>{summary.pending} hrs</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.8 }}>Pendientes</span>
            </div>
            <div style={{ background: 'rgba(12, 35, 64, 0.05)', padding: '0.8rem 1.2rem', borderRadius: '10px', textAlign: 'center' }}>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: '800', color: 'var(--status-correct)' }}>{summary.correct} hrs</span>
              <span style={{ fontSize: '0.75rem', fontWeight: '600', opacity: 0.8 }}>Por Corregir</span>
            </div>
          </div>
        </div>

        {/* Progreso a las 120 horas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <span style={{ fontFamily: 'var(--font-header)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--unefa-navy)' }}>
              Progreso Requisito Legal (120 Horas)
            </span>
            <span style={{ fontFamily: 'var(--font-header)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--status-approved)' }}>
              {summary.percentage}%
            </span>
          </div>
          
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${summary.percentage}%` }}></div>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', opacity: 0.8, fontWeight: 600 }}>
            <span>Aprobadas: {summary.approved} / 120 hrs</span>
            <span>Restan: {summary.remaining} hrs</span>
          </div>
        </div>
      </div>

      {/* 2. Cuerpo: Formulario de Carga y Bitácoras */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.8fr', gap: '2rem' }}>
        
        {/* Formulario de Carga de Actividad */}
        <div className="glass-panel" style={{ padding: '1.8rem' }}>
          <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-circle-plus" style={{ color: 'var(--unefa-gold)' }}></i>
            {editingActivity ? 'Editar y Reenviar' : 'Registrar Actividad'}
          </h3>

          {formError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-correct)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', borderLeft: '4px solid var(--status-correct)', fontWeight: 600 }}>
              {formError}
            </div>
          )}

          {formSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-approved)', padding: '0.8rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem', borderLeft: '4px solid var(--status-approved)', fontWeight: 600 }}>
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleSubmitActivity}>
            <div className="form-group">
              <label className="form-label">Fecha de Actividad</label>
              <input 
                type="date" 
                name="activity_date" 
                value={formData.activity_date} 
                onChange={handleInputChange} 
                className="form-control" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Horas Invertidas (Hoy)</label>
              <input 
                type="number" 
                name="hours_spent" 
                min="1" 
                max="8" 
                value={formData.hours_spent} 
                onChange={handleInputChange} 
                placeholder="1 a 8 horas"
                className="form-control" 
                required 
              />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción de Actividades</label>
              <textarea 
                name="description" 
                rows="3" 
                value={formData.description} 
                onChange={handleInputChange} 
                placeholder="Detalla las tareas realizadas comunitarias..."
                className="form-control" 
                required
                style={{ resize: 'none' }}
              ></textarea>
            </div>

            {/* Asistencia Física Switch */}
            <div 
              className={`switch-container ${formData.physical_attendance ? 'active' : ''}`}
              onClick={() => setFormData(prev => ({ ...prev, physical_attendance: !prev.physical_attendance }))}
            >
              <div className="switch-track">
                <div className="switch-thumb"></div>
              </div>
              <span className="form-label" style={{ margin: 0 }}>Asistencia Física Comunal (Presencial)</span>
            </div>

            {/* Módulo de Aval Comunitario */}
            <div style={{ background: 'rgba(12, 35, 64, 0.03)', border: '1px dashed #C5A059', padding: '1rem', borderRadius: '10px', margin: '1.2rem 0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--unefa-navy)', display: 'block', marginBottom: '0.5rem', fontFamily: 'var(--font-header)' }}>
                🔒 Aval Comunitario (Bloque II - Pregunta 6)
              </span>
              <div className="form-group" style={{ marginBottom: '0.8rem' }}>
                <input 
                  type="text" 
                  name="spokesperson_name" 
                  value={formData.spokesperson_name} 
                  onChange={handleInputChange} 
                  placeholder="Nombre del Vocero Comunal"
                  className="form-control" 
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                  required 
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <input 
                  type="text" 
                  name="spokesperson_phone" 
                  value={formData.spokesperson_phone} 
                  onChange={handleInputChange} 
                  placeholder="Teléfono del Vocero"
                  className="form-control" 
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.85rem' }}
                  required 
                />
              </div>
            </div>

            {/* Declaración Jurada */}
            <label style={{ display: 'flex', gap: '0.6rem', cursor: 'pointer', margin: '1rem 0', fontSize: '0.8rem', lineHeight: '1.4', fontWeight: 500 }}>
              <input 
                type="checkbox" 
                name="sworn_statement" 
                checked={formData.sworn_statement} 
                onChange={handleInputChange} 
                style={{ width: '16px', height: '16px', accentColor: 'var(--unefa-navy)', marginTop: '2px' }}
              />
              <span>Declaro bajo juramento que los datos suministrados son verídicos y corresponden a actividades de servicio comunitario.</span>
            </label>

            <button 
              type="submit" 
              className={editingActivity ? "btn-accent" : "btn-primary"} 
              style={{ width: '100%', justifyContent: 'center' }}
              disabled={!formData.sworn_statement}
            >
              <i className="fa-solid fa-paper-plane"></i>
              {editingActivity ? 'Enviar Corrección' : 'Registrar Bitácora'}
            </button>

            {editingActivity && (
              <button 
                type="button" 
                className="btn-secondary" 
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.5rem' }}
                onClick={() => {
                  setEditingActivity(null);
                  setFormData({
                    activity_date: '',
                    hours_spent: '',
                    description: '',
                    physical_attendance: false,
                    spokesperson_name: '',
                    spokesperson_phone: '',
                    sworn_statement: false
                  });
                }}
              >
                Cancelar Edición
              </button>
            )}
          </form>
        </div>

        {/* Historial de Bitácoras */}
        <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', justifySelf: 'flex-start', gap: '0.5rem' }}>
            <i className="fa-solid fa-list-check" style={{ color: 'var(--unefa-gold)' }}></i>
            Historial de Bitácoras
          </h3>

          {activities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94A3B8' }}>
              <i className="fa-solid fa-folder-open" style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}></i>
              <p style={{ fontWeight: 600 }}>No hay actividades registradas.</p>
              <p style={{ fontSize: '0.85rem' }}>Carga tu primera actividad en el formulario de la izquierda.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', maxHeight: '550px', paddingRight: '0.5rem' }}>
              {activities.map(act => {
                let borderCol = 'var(--unefa-navy)';
                let bgCol = 'rgba(12, 35, 64, 0.03)';
                let statusLabel = 'Pendiente';
                let statusIcon = 'fa-clock';
                let iconColor = 'var(--status-pending)';

                if (act.status === 'approved') {
                  borderCol = 'var(--status-approved)';
                  bgCol = 'rgba(16, 185, 129, 0.05)';
                  statusLabel = 'Aprobada';
                  statusIcon = 'fa-circle-check';
                  iconColor = 'var(--status-approved)';
                } else if (act.status === 'correct') {
                  borderCol = 'var(--status-correct)';
                  bgCol = 'rgba(239, 68, 68, 0.05)';
                  statusLabel = 'Por Corregir';
                  statusIcon = 'fa-triangle-exclamation';
                  iconColor = 'var(--status-correct)';
                }

                return (
                  <div 
                    key={act.id} 
                    className="glass-card" 
                    style={{ 
                      borderLeftColor: borderCol,
                      background: bgCol,
                      padding: '1.2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.8rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--unefa-navy)' }}>
                        <i className="fa-regular fa-calendar"></i> {new Date(act.activity_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </span>
                      
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: '700', 
                        color: iconColor, 
                        background: 'white', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '12px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        <i className={`fa-solid ${statusIcon}`}></i> {statusLabel}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{act.description}</p>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', opacity: 0.9 }}>
                      <span><strong>Horas:</strong> {act.hours_spent} hrs</span>
                      <span><strong>Modalidad:</strong> {act.physical_attendance ? '📍 Presencial en Comunidad' : '💻 Remoto / Análisis'}</span>
                      <span><strong>Vocero:</strong> {act.spokesperson_name} ({act.spokesperson_phone})</span>
                    </div>

                    {act.status === 'correct' && act.feedback_comment && (
                      <div style={{ background: '#FFF5F5', border: '1px solid #FEB2B2', borderRadius: '8px', padding: '0.8rem', marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-correct)', display: 'block', marginBottom: '0.2rem' }}>
                          ✍️ Observación de Corrección del Tutor:
                        </span>
                        <p style={{ fontSize: '0.85rem', color: '#9B2C2C', fontStyle: 'italic' }}>"{act.feedback_comment}"</p>
                        <button 
                          className="btn-danger" 
                          style={{ padding: '0.3rem 0.8rem', fontSize: '0.75rem', marginTop: '0.6rem', borderRadius: '6px' }}
                          onClick={() => handleStartEdit(act)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i> Editar y Corregir
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Cronograma e Instructivo de Redacción */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '2rem' }}>
        
        {/* Cronograma de Hitos */}
        <div className="glass-panel" style={{ padding: '1.8rem' }}>
          <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-timeline" style={{ color: 'var(--unefa-gold)' }}></i>
            Visor del Cronograma Académico
          </h3>

          {milestones.length === 0 ? (
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>No hay hitos programados en el cronograma institucional.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', position: 'relative', paddingLeft: '1.5rem', borderLeft: '2px solid rgba(197, 160, 89, 0.4)' }}>
              {milestones.map((ms, index) => (
                <div key={ms.id} style={{ position: 'relative' }}>
                  {/* Punto del timeline */}
                  <div style={{ 
                    position: 'absolute', 
                    left: '-1.95rem', 
                    top: '3px',
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    background: 'var(--unefa-gold)',
                    border: '3px solid white',
                    boxShadow: '0 0 0 2px var(--unefa-navy)'
                  }}></div>
                  
                  <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--unefa-gold)' }}>
                    {new Date(ms.event_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                  </span>
                  <h4 style={{ fontSize: '0.95rem', marginTop: '0.1rem', color: 'var(--unefa-navy)' }}>{ms.title}</h4>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructivos de Informe Card */}
        <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem', background: 'linear-gradient(135deg, rgba(12, 35, 64, 0.02) 0%, rgba(197, 160, 89, 0.05) 100%)' }}>
          <div>
            <h3 style={{ marginBottom: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-file-pdf" style={{ color: 'var(--unefa-navy)' }}></i>
              Pautas de Redacción
            </h3>
            <p style={{ fontSize: '0.85rem', lineHeight: '1.4', opacity: 0.8 }}>
              Descarga interactiva del instructivo formal oficial de la UNEFA para la redacción de informes del Servicio Comunitario, adaptado al reglamento institucional vigente.
            </p>
          </div>
          
          <div style={{ background: 'white', padding: '0.8rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.8rem' }}>
            <strong>💡 Recomendación INTEI:</strong> Elabora la descripción de tus bitácoras de manera clara, mencionando las metas alcanzadas y el impacto comunitario presencial.
          </div>

          <button 
            className="btn-primary" 
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={() => {
              // Simulación de descarga interactiva
              alert('📥 Descargando instructivo oficial "Instructivo-Servicio-Comunitario-UNEFA.pdf" (Simulado)');
            }}
          >
            <i className="fa-solid fa-download"></i> Descargar Pautas Oficiales
          </button>
        </div>
      </div>

      {/* 4. Repositorio de Proyectos Históricos */}
      <div className="glass-panel" style={{ padding: '1.8rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-book-bookmark" style={{ color: 'var(--unefa-gold)' }}></i>
              Repositorio de Proyectos Históricos
            </h3>
            <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Buscador interactivo en tiempo real para consultar trabajos anteriores aprobados por carrera.</p>
          </div>

          <div style={{ position: 'relative', width: '300px' }}>
            <input 
              type="text" 
              placeholder="Buscar por título, comunidad o carrera..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control"
              style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.85rem' }}
            />
            <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}></i>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
            <p style={{ fontWeight: 600 }}>No se encontraron proyectos históricos con ese criterio.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filteredProjects.map(proj => (
              <div 
                key={proj.id} 
                className="glass-card" 
                style={{ 
                  borderLeftColor: 'var(--unefa-gold)',
                  background: 'rgba(255, 255, 255, 0.4)',
                  padding: '1.2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.8rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'var(--unefa-navy)', opacity: 0.8, marginBottom: '0.3rem' }}>
                    <span>{proj.major}</span>
                    <span>Año: {proj.academic_year}</span>
                  </div>
                  <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0', color: 'var(--unefa-navy)' }}>{proj.title}</h4>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8, fontStyle: 'italic', margin: '0.3rem 0' }}>
                    📍 <strong>Comunidad:</strong> {proj.community}
                  </p>
                  <p style={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4' }}>
                    {proj.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
