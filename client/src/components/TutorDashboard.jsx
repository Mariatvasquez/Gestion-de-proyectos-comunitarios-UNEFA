import React, { useState, useEffect } from 'react';
import ProjectSchedule from './ProjectSchedule';
import ProjectHistory from './ProjectHistory';

const API_BASE = 'https://api-control-sc-unefa.onrender.com/api';

export default function TutorDashboard({ user, token }) {
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [expandedProjects, setExpandedProjects] = useState({});
  const [selectedTutorProject, setSelectedTutorProject] = useState('');

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }));
  };

  // Cargar datos del tutor con JWT
  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/estudiantes/asignados`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      
      setProjects(data.projects || []);
      setActivities(data.activities || []);
      setLoading(false);
    } catch (err) {
      console.error('Error al cargar datos del tutor:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Limpiar estados
    setSelectedActivity(null);
    setFeedbackComment('');
    setActionSuccess('');
    setActionError('');
  }, [user, token]);

  // Manejar evaluación (Aprobar o Requerir Corrección)
  const handleEvaluate = async (activityId, status) => {
    setActionError('');
    setActionSuccess('');

    if (status === 'correct' && (!feedbackComment || feedbackComment.trim() === '')) {
      setActionError('Por favor, ingresa una observación detallando qué se debe corregir.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/reportes/${activityId}/comentario`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          feedback_comment: status === 'correct' ? feedbackComment : null
        })
      });

      const result = await res.json();

      if (!res.ok) {
        setActionError(result.error || 'Error al procesar la evaluación.');
        return;
      }

      setActionSuccess(status === 'approved' ? '✅ Horas aprobadas correctamente.' : '✅ Solicitud de corrección enviada con éxito.');
      setSelectedActivity(null);
      setFeedbackComment('');
      
      // Recargar datos para ver reflejados los cambios
      loadData();
    } catch (err) {
      setActionError('Error de red al intentar procesar la evaluación.');
    }
  };

  const pendingActivities = activities.filter(a => a.status === 'pending');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', flexDirection: 'column', gap: '1rem' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: 'var(--unefa-navy)' }}></i>
        <p style={{ fontFamily: 'var(--font-header)', fontWeight: 600 }}>Cargando datos de tutoría...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header Info */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <span style={{ color: 'var(--unefa-gold)', fontWeight: 700, fontFamily: 'var(--font-header)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>
          Módulo de Supervisión Académica
        </span>
        <h2 style={{ fontSize: '2rem', margin: '0.2rem 0 0.5rem 0' }}>{user.name}</h2>
        <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
          <strong>Cédula:</strong> {user.identification} | <strong>Especialidad:</strong> {user.major} | <strong>Alumnos Asignados:</strong> {projects.reduce((acc, p) => acc + p.students.length, 0)}
        </p>
      </div>

      {/* Grid: Monitoreo Alumnos (Izquierda) e Inbox de Bitácoras (Derecha) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '2rem' }}>
        
        {/* Monitoreo de Alumnos Asignados (Agrupados por Proyecto) */}
        <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="fa-solid fa-graduation-cap" style={{ color: 'var(--unefa-gold)' }}></i>
            Proyectos Comunitarios
          </h3>

          {projects.length === 0 ? (
            <p style={{ fontSize: '0.9rem', opacity: 0.7, textAlign: 'center', padding: '2rem' }}>No tienes estudiantes asignados en este período.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {projects.map(project => {
                const pid = project.id || 0;
                const isExpanded = !!expandedProjects[pid];
                
                return (
                  <div 
                    key={pid}
                    style={{
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.01)'
                    }}
                  >
                    {/* Botón / Header del Proyecto */}
                    <div 
                      onClick={() => toggleProject(pid)}
                      style={{
                        background: 'rgba(12, 35, 64, 0.02)',
                        padding: '0.8rem 1rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        borderBottom: isExpanded ? '1px solid #E2E8F0' : 'none'
                      }}
                    >
                      <div style={{ textAlign: 'left', flex: 1, paddingRight: '0.5rem' }}>
                        <h4 style={{ fontSize: '0.88rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: 0, lineHeight: 1.3 }}>
                          {project.title}
                        </h4>
                        <span style={{ fontSize: '0.7rem', opacity: 0.7, display: 'block', marginTop: '0.1rem' }}>
                          Comunidad: {project.community_name || 'N/A'}
                        </span>
                      </div>
                      <i 
                        className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} 
                        style={{ color: 'var(--unefa-gold)', fontSize: '0.8rem' }}
                      ></i>
                    </div>

                    {/* Lista de Estudiantes al expandirse */}
                    {isExpanded && (
                      <div style={{ padding: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: '#FAFBFD' }}>
                        {project.students.length === 0 ? (
                          <p style={{ fontSize: '0.75rem', opacity: 0.6, padding: '0.5rem', textAlign: 'center' }}>No hay estudiantes asignados en este proyecto.</p>
                        ) : (
                          project.students.map(student => (
                            <div 
                              key={student.id}
                              style={{ 
                                background: 'white', 
                                border: '1px solid #E2E8F0', 
                                borderRadius: '8px', 
                                padding: '0.7rem' 
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                <h5 style={{ fontSize: '0.85rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: 0 }}>
                                  {student.name}
                                </h5>
                                {student.docs_submitted && (
                                  <span style={{ 
                                    fontSize: '0.6rem', 
                                    background: 'rgba(16, 185, 129, 0.1)', 
                                    color: 'var(--status-approved)', 
                                    padding: '0.1rem 0.4rem', 
                                    borderRadius: '6px', 
                                    fontWeight: 'bold' 
                                  }}>
                                    Docs OK
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: '0.7rem', opacity: 0.6, display: 'block', marginBottom: '0.4rem' }}>
                                CI: {student.identification}
                              </span>

                              {/* Barra de progreso */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                                <span>Horas Aprobadas:</span>
                                <span style={{ color: 'var(--status-approved)' }}>
                                  {student.approved_hours} / 120 hrs ({student.progress_percentage}%)
                                </span>
                              </div>
                              <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px' }}>
                                <div 
                                  className="progress-bar-fill" 
                                  style={{ 
                                    width: `${student.progress_percentage}%`,
                                    borderRadius: '3px',
                                    background: student.approved_hours >= 120 ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #3B82F6, #1D4ED8)'
                                  }}
                                ></div>
                              </div>
                            </div>
                          ))
                        )}
                        
                        {/* Historial de Documentos del Proyecto */}
                        <div style={{ marginTop: '0.8rem', borderTop: '1px solid #E2E8F0', paddingTop: '1rem' }}>
                          <ProjectHistory projectId={pid} token={token} readOnly={true} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bandeja de Bitácoras Pendientes */}
        <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', justifySelf: 'flex-start', gap: '0.5rem' }}>
            <i className="fa-solid fa-inbox" style={{ color: 'var(--unefa-gold)' }}></i>
            Bandeja de Entrada: Bitácoras Pendientes
            {pendingActivities.length > 0 && (
              <span style={{ background: 'var(--status-pending)', color: 'var(--unefa-navy)', fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '10px', marginLeft: '0.5rem' }}>
                {pendingActivities.length} por revisar
              </span>
            )}
          </h3>

          {actionSuccess && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--status-approved)', padding: '0.8rem', borderRadius: '8px', borderLeft: '4px solid var(--status-approved)', fontSize: '0.85rem', fontWeight: 600 }}>
              {actionSuccess}
            </div>
          )}

          {actionError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--status-correct)', padding: '0.8rem', borderRadius: '8px', borderLeft: '4px solid var(--status-correct)', fontSize: '0.85rem', fontWeight: 600 }}>
              {actionError}
            </div>
          )}

          {pendingActivities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#94A3B8' }}>
              <i className="fa-solid fa-circle-check" style={{ fontSize: '3rem', color: 'var(--status-approved)', marginBottom: '1rem', opacity: 0.8 }}></i>
              <p style={{ fontWeight: 600, color: 'var(--unefa-navy)' }}>¡Todo al día!</p>
              <p style={{ fontSize: '0.85rem' }}>No tienes reportes de bitácoras pendientes de evaluación.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              
              {/* Lista de bitácoras (Izquierda) */}
              <div style={{ flex: 1.2, display: 'flex', flexDirection: 'column', gap: '0.8rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                {pendingActivities.map(act => (
                  <div 
                    key={act.id}
                    onClick={() => {
                      setSelectedActivity(act);
                      setFeedbackComment('');
                      setActionError('');
                      setActionSuccess('');
                    }}
                    style={{
                      background: selectedActivity?.id === act.id ? 'rgba(197, 160, 89, 0.15)' : 'white',
                      border: selectedActivity?.id === act.id ? '2.5px solid var(--unefa-gold)' : '1px solid #E2E8F0',
                      borderRadius: '8px',
                      padding: '1rem',
                      cursor: 'pointer',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.01)',
                      transform: selectedActivity?.id === act.id ? 'translateX(3px)' : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--unefa-navy)' }}>{act.student_name}</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                        {new Date(act.activity_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {act.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', marginTop: '0.5rem', fontWeight: 600 }}>
                      <span style={{ color: 'var(--unefa-navy)' }}>Horas: {act.hours_spent} hrs</span>
                      <span style={{ color: '#64748B' }}>
                        {act.physical_attendance ? '📍 Presencial' : '💻 Remoto'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detalle y Evaluación (Derecha) */}
              <div style={{ flex: 1.8, background: 'rgba(255, 255, 255, 0.6)', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '300px' }}>
                {selectedActivity ? (
                  <>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--unefa-gold)', textTransform: 'uppercase' }}>
                        Detalle del Reporte
                      </span>
                      <h4 style={{ fontSize: '1.1rem', margin: '0.1rem 0' }}>{selectedActivity.student_name}</h4>
                      <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
                        Carrera: {selectedActivity.student_major} | CI: {selectedActivity.student_identification}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', padding: '0.8rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--unefa-navy)', display: 'block', marginBottom: '0.3rem' }}>
                        DESCRIPCIÓN DE LA LABOR:
                      </span>
                      <p style={{ fontStyle: 'italic', background: 'white', padding: '0.8rem', borderRadius: '6px', border: '1px solid #F1F5F9' }}>
                        "{selectedActivity.description}"
                      </p>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', fontSize: '0.8rem' }}>
                      <div>
                        <strong>Fecha:</strong> {new Date(selectedActivity.activity_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </div>
                      <div>
                        <strong>Horas Reportadas:</strong> {selectedActivity.hours_spent} hrs
                      </div>
                      <div>
                        <strong>Asistencia:</strong> {selectedActivity.physical_attendance ? '📍 Presencial' : '💻 Remota'}
                      </div>
                      <div>
                        <strong>Vocero Comunal:</strong> {selectedActivity.spokesperson_name}
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <strong>Teléfono Vocero Comunal:</strong> {selectedActivity.spokesperson_phone}
                      </div>
                    </div>

                    {/* Evaluación */}
                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--unefa-navy)' }}>
                        SECCIÓN DE EVALUACIÓN Y COMENTARIOS:
                      </span>
                      <textarea
                        rows="2"
                        placeholder="Escribe comentarios u observaciones aquí (obligatorio si solicitas corrección)..."
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        className="form-control"
                        style={{ fontSize: '0.85rem', resize: 'none' }}
                      ></textarea>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <button 
                          className="btn-primary" 
                          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', background: 'var(--status-approved)', border: 'none', justifyContent: 'center' }}
                          onClick={() => handleEvaluate(selectedActivity.id, 'approved')}
                        >
                          <i className="fa-solid fa-check"></i> Aprobar Horas
                        </button>
                        <button 
                          className="btn-danger" 
                          style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', justifyContent: 'center' }}
                          onClick={() => handleEvaluate(selectedActivity.id, 'correct')}
                        >
                          <i className="fa-solid fa-circle-exclamation"></i> Enviar a Corregir
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94A3B8', textAlign: 'center', padding: '2rem' }}>
                    <i className="fa-solid fa-hand-pointer" style={{ fontSize: '2.5rem', marginBottom: '0.8rem', opacity: 0.5 }}></i>
                    <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>Selecciona una bitácora</p>
                    <p style={{ fontSize: '0.8rem' }}>Haz clic en un reporte de la lista de la izquierda para ver su desglose detallado y evaluarlo.</p>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Vista de Cronograma del Proyecto */}
      <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '0.5rem' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-calendar-days" style={{ color: 'var(--unefa-gold)' }}></i>
          Cronograma de Actividades
        </h3>

        <div style={{ maxWidth: '500px', background: 'rgba(12, 35, 64, 0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--unefa-navy)' }}>
              Seleccione el Proyecto Comunitario
            </label>
            <select 
              className="form-control"
              value={selectedTutorProject}
              onChange={(e) => setSelectedTutorProject(e.target.value)}
              style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              <option value="">-- Elija un proyecto asignado --</option>
              {projects.map(p => (
                <option key={p.id || 0} value={p.id}>{p.title} ({p.community_name})</option>
              ))}
            </select>
          </div>
        </div>

        {selectedTutorProject && (
          <div style={{ marginTop: '1rem' }}>
            <ProjectSchedule projectId={selectedTutorProject} token={token} readOnly={true} />
          </div>
        )}
      </div>

    </div>
  );
}
