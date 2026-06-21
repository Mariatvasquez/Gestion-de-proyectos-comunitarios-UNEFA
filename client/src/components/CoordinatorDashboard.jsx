import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function CoordinatorDashboard({ user, token }) {
  const [stats, setStats] = useState({ activeStudents: 0, activeProjects: 0, completedStudents: 0 });
  const [users, setUsers] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros de usuarios
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Formulario Usuario (Add/Edit)
  const [userFormData, setUserFormData] = useState({
    name: '',
    identification: '',
    major: '',
    role: 'student',
    tutor_id: '',
    password: '' // Campo opcional, por defecto se usará unefa123 al crear si queda vacío
  });
  const [editingUser, setEditingUser] = useState(null);
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');

  // Formulario Hito (Add)
  const [milestoneFormData, setMilestoneFormData] = useState({ title: '', event_date: '' });
  const [milestoneSuccess, setMilestoneSuccess] = useState('');

  // Cargar datos
  const loadData = async () => {
    try {
      setLoading(true);
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };

      // 1. Estadísticas
      const statsRes = await fetch(`${API_BASE}/admin/stats`, { headers });
      const statsData = await statsRes.json();
      setStats(statsData);

      // 2. Usuarios
      const usersRes = await fetch(`${API_BASE}/admin/usuarios`, { headers });
      const usersData = await usersRes.json();
      setUsers(usersData || []);

      // 3. Hitos (Cronograma)
      const msRes = await fetch(`${API_BASE}/cronograma`, { headers });
      const msData = await msRes.json();
      setMilestones(msData || []);

      // 4. Actividades (para exportación y reportes imprimibles)
      const actRes = await fetch(`${API_BASE}/admin/reportes`, { headers });
      const actData = await actRes.json();
      setActivities(actData || []);

      setLoading(false);
    } catch (err) {
      console.error('Error al cargar datos de coordinación:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Limpiar alertas
    setUserFormError('');
    setUserFormSuccess('');
    setMilestoneSuccess('');
    setEditingUser(null);
  }, [user, token]);

  // Manejar creación/edición de usuario
  const handleUserSubmit = async (e) => {
    e.preventDefault();
    setUserFormError('');
    setUserFormSuccess('');

    if (!userFormData.name || !userFormData.identification || !userFormData.major || !userFormData.role) {
      setUserFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    try {
      const url = editingUser ? `${API_BASE}/admin/usuarios/${editingUser.id}` : `${API_BASE}/admin/usuarios`;
      const method = editingUser ? 'PUT' : 'POST';

      // Si es un nuevo usuario y no se especifica contraseña, usar "unefa123" por defecto
      const submitPassword = userFormData.password.trim() || (editingUser ? '' : 'unefa123');

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...userFormData,
          password: submitPassword,
          tutor_id: userFormData.tutor_id ? parseInt(userFormData.tutor_id) : null
        })
      });

      const result = await res.json();

      if (!res.ok) {
        setUserFormError(result.error || 'Error al guardar el usuario.');
        return;
      }

      setUserFormSuccess(editingUser ? '✅ Usuario actualizado con éxito.' : `✅ Usuario creado con éxito. Contraseña por defecto: ${submitPassword}`);
      setUserFormData({ name: '', identification: '', major: '', role: 'student', tutor_id: '', password: '' });
      setEditingUser(null);
      loadData();
    } catch (err) {
      setUserFormError('Error de red al intentar procesar la solicitud.');
    }
  };

  // Activar/Desactivar Usuario
  const handleToggleUser = async (u) => {
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${u.id}/toggle`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !u.active })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Cargar usuario para edición
  const handleStartEditUser = (u) => {
    setEditingUser(u);
    setUserFormData({
      name: u.name,
      identification: u.identification,
      major: u.major,
      role: u.role,
      tutor_id: u.tutor_id ? u.tutor_id.toString() : '',
      password: '' // Dejar vacío para no cambiarla a menos que se escriba algo nuevo
    });
  };

  // Eliminar hito cronograma
  const handleDeleteMilestone = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar este hito del cronograma?')) return;
    try {
      const res = await fetch(`${API_BASE}/admin/cronograma/${id}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Crear hito cronograma
  const handleMilestoneSubmit = async (e) => {
    e.preventDefault();
    setMilestoneSuccess('');
    if (!milestoneFormData.title || !milestoneFormData.event_date) return;

    try {
      const res = await fetch(`${API_BASE}/admin/cronograma`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(milestoneFormData)
      });
      
      if (res.ok) {
        setMilestoneSuccess('✅ Hito académico agregado.');
        setMilestoneFormData({ title: '', event_date: '' });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Exportar a CSV (Excel)
  const handleExportCSV = () => {
    if (activities.length === 0) {
      alert('No hay datos disponibles para exportar.');
      return;
    }

    // Cabeceras CSV
    const headers = ['ID Bitacora', 'Estudiante', 'Carrera', 'Cédula', 'Fecha Actividad', 'Horas', 'Modalidad', 'Vocero Comunal', 'Telefono Vocero', 'Estado'];
    
    const rows = activities.map(act => [
      act.id,
      act.student_name,
      act.major || 'Ingeniería de Sistemas',
      act.student_identification,
      new Date(act.activity_date).toLocaleDateString('es-ES', { timeZone: 'UTC' }),
      act.hours_spent,
      act.physical_attendance ? 'Presencial' : 'Remoto',
      act.spokesperson_name,
      act.spokesperson_phone,
      act.status === 'approved' ? 'Aprobada' : act.status === 'pending' ? 'Pendiente' : 'Por Corregir'
    ]);

    // Unir contenidos en CSV UTF-8
    const csvContent = [headers, ...rows]
      .map(row => row.map(value => `"${value.toString().replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Crear y descargar archivo
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bitacoras_Servicio_Comunitario_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrar lista de usuarios
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                          u.identification.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.major.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const tutors = users.filter(u => u.role === 'tutor');

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '3rem', flexDirection: 'column', gap: '1rem' }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2rem', color: 'var(--unefa-navy)' }}></i>
        <p style={{ fontFamily: 'var(--font-header)', fontWeight: 600 }}>Cargando panel de coordinación...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* SECCIÓN IMPRIMIBLE EXCLUSIVA (print-only) */}
      <div style={{ display: 'none' }} className="print-header">
        <h1 style={{ fontFamily: 'var(--font-header)', color: 'var(--unefa-navy)', fontWeight: '800' }}>
          República Bolivariana de Venezuela
        </h1>
        <h2 style={{ fontSize: '1.2rem', margin: '5px 0' }}>
          Universidad Nacional Experimental Politécnica de la Fuerza Armada Nacional Bolivariana (UNEFA)
        </h2>
        <span className="unefa-sub">Módulo del Vicerrectorado de Asuntos Sociales y Participación Ciudadana</span>
        <h3 style={{ marginTop: '20px', textDecoration: 'underline' }}>
          Reporte Consolidado del Servicio Comunitario Académico
        </h3>
        <p style={{ fontSize: '9pt', marginTop: '5px' }}>
          Fecha de Emisión: {new Date().toLocaleDateString('es-VE')}
        </p>

        {/* Tabla imprimible de bitácoras oficiales */}
        <table className="print-table">
          <thead>
            <tr>
              <th>Cédula</th>
              <th>Estudiante</th>
              <th>Fecha Act.</th>
              <th>Horas</th>
              <th>Actividad Realizada</th>
              <th>Vocero Comunal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {activities.map(act => (
              <tr key={act.id}>
                <td>{act.student_identification}</td>
                <td>{act.student_name}</td>
                <td>{new Date(act.activity_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</td>
                <td>{act.hours_spent} hrs</td>
                <td>{act.description}</td>
                <td>{act.spokesperson_name} ({act.spokesperson_phone})</td>
                <td style={{ fontWeight: 'bold' }}>
                  {act.status === 'approved' ? 'APROBADA' : act.status === 'pending' ? 'PENDIENTE' : 'CORREGIR'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Sección de firmas oficial para la Prof. Rosa Camejo */}
        <div className="print-signature-section">
          <div className="signature-block">
            <div className="signature-line"></div>
            <span className="signature-title">Prof. Rosa Camejo</span>
            <span className="signature-subtitle">Coordinador de Servicio Comunitario (UNEFA)</span>
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <span className="signature-title">Firma del Decano / Sello</span>
            <span className="signature-subtitle">Núcleo de Asuntos Académicos</span>
          </div>
        </div>
      </div>

      {/* SECCIÓN NORMAL WEB (no-print) */}
      <div className="print-container">
        
        {/* Header e Información General */}
        <div className="glass-panel no-print" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ color: 'var(--unefa-gold)', fontWeight: 700, fontFamily: 'var(--font-header)', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.85rem' }}>
              Módulo de Dirección y Cierre
            </span>
            <h2 style={{ fontSize: '2rem', margin: '0.2rem 0 0.5rem 0' }}>{user.name}</h2>
            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
              <strong>Cédula:</strong> {user.identification} | <strong>Dirección:</strong> Coordinador General del Servicio Comunitario
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn-accent" onClick={handleExportCSV}>
              <i className="fa-solid fa-file-excel"></i> Exportar Excel (CSV)
            </button>
            <button className="btn-primary" onClick={() => window.print()}>
              <i className="fa-solid fa-print"></i> Imprimir Reporte (PDF)
            </button>
          </div>
        </div>

        {/* Widgets de Estadísticas Express */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', margin: '2rem 0' }}>
          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'white' }}>
            <div style={{ background: 'rgba(12, 35, 64, 0.08)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--unefa-navy)', fontSize: '1.8rem' }}>
              <i className="fa-solid fa-users"></i>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', color: 'var(--unefa-navy)', lineHeight: 1.2 }}>{stats.activeStudents}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Alumnos Activos</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'white' }}>
            <div style={{ background: 'rgba(197, 160, 89, 0.1)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--unefa-gold)', fontSize: '1.8rem' }}>
              <i className="fa-solid fa-clipboard-list"></i>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', color: 'var(--unefa-navy)', lineHeight: 1.2 }}>{stats.activeProjects}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>Proyectos Comunitarios</span>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', background: 'white' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '60px', height: '60px', borderRadius: '15px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--status-approved)', fontSize: '1.8rem' }}>
              <i className="fa-solid fa-award"></i>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', color: 'var(--unefa-navy)', lineHeight: 1.2 }}>{stats.completedStudents}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, opacity: 0.8 }}>120 Horas Completadas</span>
            </div>
          </div>
        </div>

        {/* Cuerpo del Panel */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          
          {/* CRUD GENERAL DE USUARIOS (Izquierda) */}
          <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-users-gear" style={{ color: 'var(--unefa-gold)' }}></i>
                Gestor General de Usuarios
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  placeholder="Buscar usuario..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="form-control"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: '180px' }}
                />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="form-control"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
                >
                  <option value="all">Todos los Roles</option>
                  <option value="student">Estudiantes</option>
                  <option value="tutor">Tutores</option>
                  <option value="coordinator">Coordinadores</option>
                </select>
              </div>
            </div>

            {/* Formulario rápido para Agregar / Editar Usuario */}
            <div style={{ background: 'rgba(12, 35, 64, 0.02)', border: '1.5px solid rgba(197,160,89,0.3)', borderRadius: '12px', padding: '1.2rem' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--unefa-navy)', marginBottom: '0.8rem', fontWeight: 700 }}>
                {editingUser ? '✏️ Editar Datos de Usuario' : '➕ Registrar Nuevo Usuario'}
              </h4>

              {userFormError && (
                <div style={{ color: 'var(--status-correct)', background: 'rgba(239, 68, 68, 0.08)', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {userFormError}
                </div>
              )}
              {userFormSuccess && (
                <div style={{ color: 'var(--status-approved)', background: 'rgba(16, 185, 129, 0.08)', padding: '0.6rem 1rem', borderRadius: '8px', marginBottom: '0.8rem', fontSize: '0.8rem', fontWeight: 600 }}>
                  {userFormSuccess}
                </div>
              )}

              <form onSubmit={handleUserSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Nombre Completo</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Ana Gómez"
                    value={userFormData.name}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Cédula de Identidad</label>
                  <input 
                    type="text" 
                    placeholder="Ej. V-25123456"
                    value={userFormData.identification}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, identification: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Carrera</label>
                  <input 
                    type="text" 
                    placeholder="Ej. Ingeniería de Sistemas"
                    value={userFormData.major}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, major: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Rol Administrativo</label>
                  <select 
                    value={userFormData.role}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, role: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
                  >
                    <option value="student">🎓 Estudiante</option>
                    <option value="tutor">🏫 Tutor Académico</option>
                    <option value="coordinator">💼 Coordinador</option>
                  </select>
                </div>

                {userFormData.role === 'student' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Tutor Asignado</label>
                    <select 
                      value={userFormData.tutor_id}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, tutor_id: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      <option value="">No Asignado</option>
                      {tutors.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Contraseña</label>
                  <input 
                    type="password" 
                    placeholder={editingUser ? "Sin cambios si se deja vacío" : "Por defecto: unefa123"}
                    value={userFormData.password}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button type="submit" className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem', width: '100%', justifyContent: 'center' }}>
                    {editingUser ? 'Actualizar' : 'Registrar'}
                  </button>
                  {editingUser && (
                    <button 
                      type="button" 
                      className="btn-secondary" 
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
                      onClick={() => {
                        setEditingUser(null);
                        setUserFormData({ name: '', identification: '', major: '', role: 'student', tutor_id: '' });
                      }}
                    >
                      X
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Tabla de Usuarios */}
            <div className="premium-table-container">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Cédula</th>
                    <th>Carrera</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    let roleTag = 'Estudiante';
                    let roleIcon = 'fa-user-graduate';
                    if (u.role === 'tutor') {
                      roleTag = 'Tutor';
                      roleIcon = 'fa-chalkboard-user';
                    } else if (u.role === 'coordinator') {
                      roleTag = 'Coordinador';
                      roleIcon = 'fa-user-tie';
                    }

                    return (
                      <tr key={u.id} style={{ opacity: u.active ? 1 : 0.5 }}>
                        <td style={{ fontWeight: 700, color: 'var(--unefa-navy)' }}>{u.name}</td>
                        <td>{u.identification}</td>
                        <td>{u.major}</td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            <i className={`fa-solid ${roleIcon}`}></i> {roleTag}
                          </span>
                        </td>
                        <td>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 'bold', 
                            color: u.active ? 'var(--status-approved)' : 'var(--status-correct)',
                            background: u.active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '12px'
                          }}>
                            {u.active ? 'Activo' : 'De Baja'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button 
                              className="btn-secondary" 
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px' }}
                              onClick={() => handleStartEditUser(u)}
                            >
                              <i className="fa-solid fa-pen"></i>
                            </button>
                            <button 
                              className={u.active ? "btn-danger" : "btn-primary"}
                              style={{ 
                                padding: '0.25rem 0.5rem', 
                                fontSize: '0.75rem', 
                                borderRadius: '4px',
                                background: u.active ? 'var(--status-correct)' : 'var(--status-approved)'
                              }}
                              onClick={() => handleToggleUser(u)}
                            >
                              {u.active ? <i className="fa-solid fa-user-slash"></i> : <i className="fa-solid fa-user-check"></i>}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>

          {/* GESTOR DEL CRONOGRAMA ACADÉMICO (Derecha) */}
          <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', justifySelf: 'flex-start' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--unefa-gold)' }}></i>
              Gestor del Cronograma
            </h3>

            {milestoneSuccess && (
              <div style={{ color: 'var(--status-approved)', background: 'rgba(16, 185, 129, 0.08)', padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                {milestoneSuccess}
              </div>
            )}

            <form onSubmit={handleMilestoneSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Título del Hito Académico</label>
                <input 
                  type="text" 
                  placeholder="Ej. Taller de Inducción"
                  value={milestoneFormData.title}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="form-control"
                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha de Ejecución</label>
                <input 
                  type="date" 
                  value={milestoneFormData.event_date}
                  onChange={(e) => setMilestoneFormData(prev => ({ ...prev, event_date: e.target.value }))}
                  className="form-control"
                  style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem' }}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '0.5rem' }}>
                <i className="fa-solid fa-plus"></i> Agregar Hito
              </button>
            </form>

            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '1rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--unefa-navy)', display: 'block', marginBottom: '0.6rem' }}>
                Hitos Programados:
              </span>

              {milestones.length === 0 ? (
                <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>No hay hitos programados.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                  {milestones.map(ms => (
                    <div 
                      key={ms.id} 
                      style={{ 
                        background: 'white', 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '8px', 
                        padding: '0.6rem 0.8rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--unefa-gold)' }}>
                          {new Date(ms.event_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                        </span>
                        <h4 style={{ fontSize: '0.85rem', margin: 0, color: 'var(--unefa-navy)' }}>{ms.title}</h4>
                      </div>
                      <button 
                        className="btn-secondary" 
                        style={{ padding: '0.2rem 0.4rem', border: 'none', background: 'transparent', color: 'var(--status-correct)', cursor: 'pointer' }}
                        onClick={() => handleDeleteMilestone(ms.id)}
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
