import React, { useState, useEffect } from 'react';
import ActaModal from './ActaModal';
import ProjectSchedule from './ProjectSchedule';
import ProjectHistory from './ProjectHistory';

const API_BASE = 'https://api-control-sc-unefa.onrender.com/api';
const BACKEND_URL = API_BASE.replace('/api', '');

export default function CoordinatorDashboard({ user, token }) {
  const [stats, setStats] = useState({ activeStudents: 0, activeProjects: 0, completedStudents: 0 });
  const [vistaActiva, setVistaActiva] = useState('estadisticas');
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
    tutor_institucional_id: '',
    password: '',
    project_title: '',
    project_community: '',
    tutor_type: 'académico',
    docs_submitted: false,
    phone: '',
    email: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [userFormError, setUserFormError] = useState('');
  const [userFormSuccess, setUserFormSuccess] = useState('');
  const [expandedCoordProjects, setExpandedCoordProjects] = useState({});
  // -- NUEVOS ESTADOS PARA EL ACTA EN PDF --
  const [mostrarModal, setMostrarModal] = useState(false);
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null);
  const [actaFormats, setActaFormats] = useState({});
  // ----------------------------------------

  const [selectedGanttProject, setSelectedGanttProject] = useState('fase_inicial');

  // Estados para el Repositorio de Proyectos Históricos
  const [historicalProjects, setHistoricalProjects] = useState([]);
  const [searchQueryHistorical, setSearchQueryHistorical] = useState('');
  const [newHistFormData, setNewHistFormData] = useState({
    title: '',
    major: '',
    academic_year: new Date().getFullYear(),
    community: '',
    summary: ''
  });
  const [histFile, setHistFile] = useState(null);
  const [histUploadError, setHistUploadError] = useState('');
  const [histUploadSuccess, setHistUploadSuccess] = useState('');
  const [histUploading, setHistUploading] = useState(false);
  const [editingHistProject, setEditingHistProject] = useState(null);
  const [userDocType, setUserDocType] = useState('V');


  const toggleCoordProject = (pid) => {
    setExpandedCoordProjects(prev => ({
      ...prev,
      [pid]: !prev[pid]
    }));
  };

  // Formulario Hito (Add)
  const [milestoneFormData, setMilestoneFormData] = useState({ title: '', event_date: '', project_id: '' });
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

      // 5. Proyectos Históricos
      const histRes = await fetch(`${API_BASE}/proyectos-historicos`, { headers });
      const histData = await histRes.json();
      setHistoricalProjects(Array.isArray(histData) ? histData : []);

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

      // Si es un nuevo usuario y no se especifica contraseña, usar "Unefa123*" por defecto
      const submitPassword = userFormData.password.trim() || (editingUser ? '' : 'Unefa123*');

      // Concatenar el prefijo a la identificación
      const finalIdentification = `${userDocType}-${userFormData.identification.trim()}`;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...userFormData,
          identification: finalIdentification,
          password: submitPassword,
          tutor_id: userFormData.tutor_id ? parseInt(userFormData.tutor_id) : null,
          tutor_institucional_id: userFormData.tutor_institucional_id ? parseInt(userFormData.tutor_institucional_id) : null
        })
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error && (result.error.includes('registrada') || result.error.includes('exist'))) {
          alert('Esta cédula ya se encuentra registrada');
        }
        setUserFormError(result.error || 'Error al guardar el usuario.');
        return;
      }

      setUserFormSuccess(editingUser ? '✅ Usuario actualizado con éxito.' : `✅ Usuario creado con éxito. Contraseña por defecto: ${submitPassword}`);
      setUserFormData({ name: '', identification: '', major: '', role: 'student', tutor_id: '', tutor_institucional_id: '', password: '', project_title: '', project_community: '', tutor_type: 'académico', docs_submitted: false, phone: '', email: '' });
      setUserDocType('V');
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

  // Cambiar estado docs_submitted vía PUT
  const handleToggleDocs = async (studentId, currentStatus) => {
    try {
      const res = await fetch(`${API_BASE}/admin/usuarios/${studentId}/docs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ docs_submitted: !currentStatus })
      });
      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error('Error al actualizar documentos:', err);
    }
  };

  // Cargar usuario para edición
  const handleStartEditUser = (u) => {
    setEditingUser(u);
    let prefix = 'V';
    let number = u.identification;
    if (u.identification && u.identification.includes('-')) {
      const parts = u.identification.split('-');
      prefix = parts[0];
      number = parts.slice(1).join('-');
    }
    setUserDocType(prefix);
    setUserFormData({
      name: u.name,
      identification: number,
      major: u.major,
      role: u.role,
      tutor_id: u.tutor_id ? u.tutor_id.toString() : '',
      tutor_institucional_id: u.tutor_institucional_id ? u.tutor_institucional_id.toString() : '',
      password: '',
      project_title: u.project_title || '',
      project_community: u.project_community || '',
      tutor_type: u.tutor_type || 'académico',
      docs_submitted: !!u.docs_submitted,
      phone: u.phone || '',
      email: u.email || ''
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
    if (!milestoneFormData.title || !milestoneFormData.event_date || !milestoneFormData.project_id) return;

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
        setMilestoneFormData({ title: '', event_date: '', project_id: '' });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelEditHist = () => {
    setEditingHistProject(null);
    setNewHistFormData({
      title: '',
      major: '',
      academic_year: new Date().getFullYear(),
      community: '',
      summary: ''
    });
    setHistFile(null);
    const fileInput = document.getElementById('hist-file-input');
    if (fileInput) fileInput.value = '';
    setHistUploadError('');
    setHistUploadSuccess('');
  };

  const handleStartEditHist = (proj) => {
    setEditingHistProject(proj);
    setNewHistFormData({
      title: proj.title || '',
      major: proj.major || '',
      academic_year: proj.academic_year || new Date().getFullYear(),
      community: proj.community || '',
      summary: proj.summary || ''
    });
    setHistFile(null);
    const fileInput = document.getElementById('hist-file-input');
    if (fileInput) fileInput.value = '';

    const formElement = document.getElementById('hist-form-container');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleHistSubmit = async (e) => {
    e.preventDefault();
    setHistUploadError('');
    setHistUploadSuccess('');

    if (!newHistFormData.title || !newHistFormData.major || !newHistFormData.academic_year) {
      setHistUploadError('El título, la carrera y el año académico son obligatorios.');
      return;
    }

    if (!editingHistProject && !histFile) {
      alert('Debe agregar un documento PDF');
      setHistUploadError('Debe agregar un documento PDF');
      return;
    }

    setHistUploading(true);

    const formData = new FormData();
    formData.append('title', newHistFormData.title);
    formData.append('major', newHistFormData.major);
    formData.append('academic_year', newHistFormData.academic_year);
    formData.append('community', newHistFormData.community || 'N/A');
    formData.append('summary', newHistFormData.summary || '');
    if (histFile) {
      formData.append('archivo', histFile);
    }

    try {
      const url = editingHistProject
        ? `${API_BASE}/proyectos-historicos/${editingHistProject.id}`
        : `${API_BASE}/proyectos-historicos`;
      const method = editingHistProject ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Error al guardar el proyecto histórico.');
      }

      setHistUploadSuccess(
        editingHistProject
          ? '✅ Proyecto histórico actualizado exitosamente.'
          : '✅ Proyecto histórico registrado exitosamente en el repositorio.'
      );

      handleCancelEditHist();

      // Recargar datos
      loadData();
    } catch (err) {
      setHistUploadError(err.message);
    } finally {
      setHistUploading(false);
    }
  };

  const filteredHistoricalProjects = Array.isArray(historicalProjects)
    ? historicalProjects.filter(p => {
      if (!p.ruta_archivo) return false; // Mostrar solo si tiene PDF adjunto
      const q = searchQueryHistorical.toLowerCase();
      const title = p.title ? p.title.toLowerCase() : '';
      const major = p.major ? p.major.toLowerCase() : '';
      const community = p.community ? p.community.toLowerCase() : '';
      return title.includes(q) || major.includes(q) || community.includes(q);
    })
    : [];

  // Filtrar lista de usuarios
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.identification.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.major.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = roleFilter === 'all' ? true : u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const academicTutors = users.filter(u => u.role === 'tutor' && (!u.tutor_type || u.tutor_type === 'académico'));
  const institutionalTutors = users.filter(u => u.role === 'tutor' && u.tutor_type === 'institucional');
  const tutors = users.filter(u => u.role === 'tutor');

  // Lógica de agrupación en memoria de los estudiantes activos por proyecto comunitario
  const activeStudentsList = users.filter(u => u.role === 'student' && u.active);
  const projectsMap = {};
  activeStudentsList.forEach(student => {
    const pid = student.project_id || 0;
    const ptitle = student.project_title || 'Sin Proyecto Asignado';
    const pcomm = student.project_community || 'N/A';

    if (!projectsMap[pid]) {
      projectsMap[pid] = {
        id: student.project_id,
        title: ptitle,
        community_name: pcomm,
        students: []
      };
    }

    const approvedHours = activities
      .filter(act => act.student_id === student.id && act.status === 'approved')
      .reduce((sum, act) => sum + act.hours_spent, 0);

    projectsMap[pid].students.push({
      ...student,
      approvedHours,
      progressPercentage: Math.min(Math.round((approvedHours / 120) * 100), 100)
    });
  });

  const projectsList = Object.values(projectsMap);

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

        </div>

        {/* Menú de Navegación por Pestañas */}
        <div className="glass-panel no-print" style={{
          display: 'flex',
          gap: '0.8rem',
          padding: '0.6rem',
          borderRadius: '12px',
          margin: '1.5rem 0',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          background: 'rgba(255, 255, 255, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
          boxShadow: 'var(--shadow-premium)'
        }}>
          <button
            onClick={() => setVistaActiva('estadisticas')}
            style={{
              flex: '1 1 200px',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: vistaActiva === 'estadisticas' ? 'var(--unefa-navy)' : 'transparent',
              color: vistaActiva === 'estadisticas' ? '#fff' : 'var(--unefa-navy)',
              fontFamily: 'var(--font-header)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease-in-out',
              boxShadow: vistaActiva === 'estadisticas' ? '0 4px 15px rgba(12, 35, 64, 0.15)' : 'none'
            }}
          >
            <i className="fa-solid fa-chart-simple"></i> Inicio (Estadísticas)
          </button>
          <button
            onClick={() => setVistaActiva('proyectos')}
            style={{
              flex: '1 1 200px',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: vistaActiva === 'proyectos' ? 'var(--unefa-navy)' : 'transparent',
              color: vistaActiva === 'proyectos' ? '#fff' : 'var(--unefa-navy)',
              fontFamily: 'var(--font-header)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease-in-out',
              boxShadow: vistaActiva === 'proyectos' ? '0 4px 15px rgba(12, 35, 64, 0.15)' : 'none'
            }}
          >
            <i className="fa-solid fa-folder-tree"></i> Proyectos y Actas
          </button>
          <button
            onClick={() => setVistaActiva('usuarios')}
            style={{
              flex: '1 1 200px',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: vistaActiva === 'usuarios' ? 'var(--unefa-navy)' : 'transparent',
              color: vistaActiva === 'usuarios' ? '#fff' : 'var(--unefa-navy)',
              fontFamily: 'var(--font-header)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease-in-out',
              boxShadow: vistaActiva === 'usuarios' ? '0 4px 15px rgba(12, 35, 64, 0.15)' : 'none'
            }}
          >
            <i className="fa-solid fa-users-gear"></i> Usuarios
          </button>
          <button
            onClick={() => setVistaActiva('cronograma')}
            style={{
              flex: '1 1 200px',
              padding: '0.8rem 1rem',
              borderRadius: '8px',
              border: 'none',
              background: vistaActiva === 'cronograma' ? 'var(--unefa-navy)' : 'transparent',
              color: vistaActiva === 'cronograma' ? '#fff' : 'var(--unefa-navy)',
              fontFamily: 'var(--font-header)',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease-in-out',
              boxShadow: vistaActiva === 'cronograma' ? '0 4px 15px rgba(12, 35, 64, 0.15)' : 'none'
            }}
          >
            <i className="fa-solid fa-calendar-days"></i> Cronograma
          </button>
        </div>

        {/* Sub-views Condicionales */}

        {/* VISTA 1: ESTADÍSTICAS */}
        {vistaActiva === 'estadisticas' && (
          <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', margin: '2rem 0' }}>
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
        )}

        {/* VISTA 2: PROYECTOS Y ACTAS */}
        {vistaActiva === 'proyectos' && (
          <div className="no-print" style={{ marginBottom: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--unefa-navy)' }}>
                <i className="fa-solid fa-folder-tree" style={{ color: 'var(--unefa-gold)' }}></i>
                Monitoreo de Proyectos Comunitarios Activos
              </h3>

              {projectsList.length === 0 ? (
                <p style={{ fontSize: '0.9rem', opacity: 0.7, textAlign: 'center', padding: '1rem' }}>No hay proyectos comunitarios activos registrados.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
                  {projectsList.map(project => {
                    const pid = project.id || 0;
                    const isExpanded = !!expandedCoordProjects[pid];

                    return (
                      <div
                        key={pid}
                        style={{
                          background: 'white',
                          border: '1px solid #E2E8F0',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.01)'
                        }}
                      >
                        {/* Cabecera de Proyecto */}
                        <div
                          onClick={() => toggleCoordProject(pid)}
                          style={{
                            background: 'rgba(12, 35, 64, 0.02)',
                            padding: '0.9rem 1.1rem',
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
                              Comunidad: {project.community_name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', background: 'var(--unefa-navy)', color: 'white', padding: '0.15rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                              {project.students.length} Est.
                            </span>
                            <i
                              className={`fa-solid ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}
                              style={{ color: 'var(--unefa-gold)', fontSize: '0.8rem' }}
                            ></i>
                          </div>
                        </div>

                        {/* Lista de Estudiantes del Proyecto al expandir */}
                        {isExpanded && (
                          <div style={{ padding: '0.8rem', background: '#FAFBFD', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {/* Acciones Generales del Proyecto */}
                            {project.students.length > 0 && (
                              <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #E2E8F0' }}>
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--unefa-navy)' }}>Formato del Acta:</label>
                                <select
                                  value={actaFormats[pid] || 'horizontal'}
                                  onChange={(e) => setActaFormats(prev => ({ ...prev, [pid]: e.target.value }))}
                                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '5px', border: '1px solid #CBD5E1', outline: 'none' }}
                                >
                                  <option value="horizontal">Horizontal</option>
                                  <option value="vertical_con_nombre">Vertical (Con nombre del proyecto)</option>
                                  <option value="vertical_sin_nombre">Vertical (Sin nombre del proyecto)</option>
                                </select>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProyectoSeleccionado(pid);
                                    setMostrarModal(true);
                                  }}
                                  className="btn-primary"
                                  style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderRadius: '5px', marginLeft: '0.5rem' }}
                                >
                                  <i className="fa-solid fa-file-pdf" style={{ marginRight: '5px' }}></i>
                                  Generar Acta General
                                </button>
                              </div>
                            )}

                            {project.students.length === 0 ? (
                              <p style={{ fontSize: '0.75rem', opacity: 0.6, padding: '0.5rem', textAlign: 'center' }}>No hay estudiantes asignados.</p>
                            ) : (
                              project.students.map(student => (
                                <div
                                  key={student.id}
                                  style={{
                                    background: 'white',
                                    border: '1px solid #E2E8F0',
                                    borderRadius: '8px',
                                    padding: '0.75rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.4rem'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ textAlign: 'left' }}>
                                      <h5 style={{ fontSize: '0.82rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: 0 }}>
                                        {student.name}
                                      </h5>
                                      <span style={{ fontSize: '0.68rem', opacity: 0.6 }}>CI: {student.identification}</span>
                                    </div>

                                    {/* Checkbox de entrega de documentos */}
                                    <label style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.3rem',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                      color: student.docs_submitted ? 'var(--status-approved)' : '#64748B',
                                      background: student.docs_submitted ? 'rgba(16, 185, 129, 0.08)' : 'rgba(100, 116, 139, 0.08)',
                                      padding: '0.2rem 0.5rem',
                                      borderRadius: '6px'
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={student.docs_submitted}
                                        onChange={() => handleToggleDocs(student.id, student.docs_submitted)}
                                        style={{ cursor: 'pointer', margin: 0 }}
                                      />
                                      {student.docs_submitted ? 'Docs Consignados' : 'Docs Pendientes'}
                                    </label>
                                  </div>

                                  {/* Barra de horas */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', fontWeight: 600, marginBottom: '0.1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <span>Progreso:</span>
                                    <span style={{ color: 'var(--status-approved)' }}>
                                      {student.approvedHours} / 120 hrs ({student.progressPercentage}%)
                                    </span>
                                  </div>
                                  <div className="progress-bar-container" style={{ height: '6px', borderRadius: '3px' }}>
                                    <div
                                      className="progress-bar-fill"
                                      style={{
                                        width: `${student.progressPercentage}%`,
                                        borderRadius: '3px',
                                        background: student.approvedHours >= 120 ? 'linear-gradient(90deg, #10B981, #059669)' : 'linear-gradient(90deg, #3B82F6, #1D4ED8)'
                                      }}
                                    ></div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Repositorio de Proyectos Históricos (Sección Independiente) */}
            <div className="glass-panel no-print" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--unefa-navy)' }}>
                    <i className="fa-solid fa-book-bookmark" style={{ color: 'var(--unefa-gold)' }}></i>
                    Repositorio de Proyectos Históricos
                  </h3>
                  <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>Gestión, carga de documentos PDF y búsqueda de proyectos de años anteriores.</p>
                </div>

                <div style={{ position: 'relative', width: '300px' }}>
                  <input
                    type="text"
                    placeholder="Buscar por título, carrera o comunidad..."
                    value={searchQueryHistorical}
                    onChange={(e) => setSearchQueryHistorical(e.target.value)}
                    className="form-control"
                    style={{ width: '100%', paddingLeft: '2.5rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                  />
                  <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}></i>
                </div>
              </div>

              {/* Formulario para registrar nuevo proyecto histórico con PDF */}
              <div id="hist-form-container" style={{ background: 'rgba(12, 35, 64, 0.02)', border: '1.5px dashed rgba(197, 160, 89, 0.4)', borderRadius: '12px', padding: '1.5rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: 'var(--unefa-navy)', marginBottom: '1rem', fontWeight: 700 }}>
                  <i className={`fa-solid ${editingHistProject ? 'fa-pen-to-square' : 'fa-plus'}`} style={{ color: 'var(--unefa-gold)', marginRight: '0.5rem' }}></i>
                  {editingHistProject ? '✏️ Editar Proyecto Histórico (Cargar nuevo PDF es opcional)' : 'Registrar Nuevo Proyecto Histórico (Cargar PDF)'}
                </h4>

                {histUploadError && (
                  <div className="glass-card" style={{ borderLeftColor: 'var(--status-correct)', background: 'rgba(239, 68, 68, 0.05)', padding: '0.6rem 1rem', marginBottom: '1rem' }}>
                    <span style={{ color: '#9B2C2C', fontSize: '0.8rem', fontWeight: 600 }}>{histUploadError}</span>
                  </div>
                )}
                {histUploadSuccess && (
                  <div className="glass-card" style={{ borderLeftColor: 'var(--status-approved)', background: 'rgba(16, 185, 129, 0.05)', padding: '0.6rem 1rem', marginBottom: '1rem' }}>
                    <span style={{ color: '#065F46', fontSize: '0.8rem', fontWeight: 600 }}>{histUploadSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleHistSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Título del Proyecto</label>
                    <input
                      type="text"
                      placeholder="Ej. Sistema de Inventario para Ambulatorio"
                      value={newHistFormData.title}
                      onChange={(e) => setNewHistFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Carrera</label>
                    <input
                      type="text"
                      placeholder="Ej. Ingeniería de Sistemas"
                      value={newHistFormData.major}
                      onChange={(e) => setNewHistFormData(prev => ({ ...prev, major: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Año Académico</label>
                    <input
                      type="number"
                      placeholder="Ej. 2025"
                      value={newHistFormData.academic_year}
                      onChange={(e) => setNewHistFormData(prev => ({ ...prev, academic_year: parseInt(e.target.value, 10) || '' }))}
                      className="form-control"
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                      required
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Comunidad</label>
                    <input
                      type="text"
                      placeholder="Ej. Sector Central Las Flores"
                      value={newHistFormData.community}
                      onChange={(e) => setNewHistFormData(prev => ({ ...prev, community: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Resumen (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Breve descripción del proyecto..."
                      value={newHistFormData.summary}
                      onChange={(e) => setNewHistFormData(prev => ({ ...prev, summary: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.45rem 0.8rem', fontSize: '0.85rem', border: '1px solid #CBD5E1', borderRadius: '8px' }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 700 }}>Archivo PDF</label>
                    <input
                      id="hist-file-input"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                         const file = e.target.files[0];
                         if (file && file.type !== 'application/pdf') {
                           alert('Únicamente se permiten archivos en formato PDF.');
                           e.target.value = '';
                           setHistFile(null);
                         } else {
                           setHistFile(file);
                         }
                      }}
                      style={{
                        fontSize: '0.8rem',
                        background: 'white',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        padding: '0.35rem 0.6rem',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <button
                      type="submit"
                      className="btn-accent"
                      style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', height: '38px', justifyContent: 'center', flex: 1 }}
                      disabled={histUploading}
                    >
                      {histUploading ? (
                        <>
                          <i className="fa-solid fa-circle-notch fa-spin"></i> Guardando...
                        </>
                      ) : (
                        <>
                          <i className={`fa-solid ${editingHistProject ? 'fa-floppy-disk' : 'fa-circle-plus'}`}></i> {editingHistProject ? 'Guardar Cambios' : 'Registrar Proyecto'}
                        </>
                      )}
                    </button>
                    {editingHistProject && (
                      <button
                        type="button"
                        onClick={handleCancelEditHist}
                        className="btn-secondary"
                        style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', height: '38px', justifyContent: 'center', flex: 1, background: '#EF4444', color: 'white', borderColor: '#EF4444' }}
                        disabled={histUploading}
                      >
                        <i className="fa-solid fa-xmark"></i> Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Listado de Proyectos Históricos */}
              {filteredHistoricalProjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#94A3B8' }}>
                  <p style={{ fontWeight: 600 }}>No hay proyectos históricos que coincidan con la búsqueda.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                  {filteredHistoricalProjects.map(proj => (
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
                        <h4 style={{ fontSize: '0.95rem', margin: '0.2rem 0', color: 'var(--unefa-navy)', fontWeight: 800 }}>{proj.title}</h4>
                        <p style={{ fontSize: '0.85rem', opacity: 0.9, fontStyle: 'italic', margin: '0.2rem 0' }}>
                          📍 <strong>Comunidad:</strong> {proj.community}
                        </p>
                        {proj.summary && (
                          <p style={{ fontSize: '0.8rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.4', marginTop: '0.4rem' }}>
                            {proj.summary}
                          </p>
                        )}
                      </div>

                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {proj.ruta_archivo && (
                          <a
                            href={`${BACKEND_URL}/${proj.ruta_archivo}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary"
                            style={{
                              padding: '0.35rem 0.8rem',
                              fontSize: '0.78rem',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              textDecoration: 'none',
                              boxShadow: 'none'
                            }}
                          >
                            <i className="fa-solid fa-arrow-up-right-from-square"></i>
                            Ver PDF
                          </a>
                        )}
                        <button
                          onClick={() => handleStartEditHist(proj)}
                          className="btn-secondary"
                          style={{
                            padding: '0.35rem 0.8rem',
                            fontSize: '0.78rem',
                            borderRadius: '6px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            boxShadow: 'none',
                            background: '#E2E8F0',
                            color: 'var(--unefa-navy)',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                          Editar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* VISTA 3: USUARIOS */}
        {vistaActiva === 'usuarios' && (
          <div className="glass-panel no-print" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <i className="fa-solid fa-users-gear" style={{ color: 'var(--unefa-gold)' }}></i>
                Gestor General de Usuarios
              </h3>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <select
                      value={userDocType}
                      onChange={(e) => setUserDocType(e.target.value)}
                      className="form-control"
                      style={{
                        width: '70px',
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.85rem',
                        background: 'white',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="V">V</option>
                      <option value="E">E</option>
                      <option value="P">P</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Ej. 25123456"
                      value={userFormData.identification}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, identification: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', flex: 1 }}
                      required
                    />
                  </div>
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
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Número de Teléfono</label>
                  <input
                    type="text"
                    placeholder="Ej. 0412-1234567"
                    value={userFormData.phone}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="Ej. usuario@gmail.com"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="form-control"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
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
                  <>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Tutor Académico</label>
                      <select
                        value={userFormData.tutor_id}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, tutor_id: e.target.value }))}
                        className="form-control"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="">No Asignado</option>
                        {academicTutors.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Tutor Institucional</label>
                      <select
                        value={userFormData.tutor_institucional_id}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, tutor_institucional_id: e.target.value }))}
                        className="form-control"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        <option value="">No Asignado</option>
                        {institutionalTutors.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Título del Proyecto</label>
                      <input
                        type="text"
                        placeholder="Ej. Sistema de Control Comunitario"
                        value={userFormData.project_title}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, project_title: e.target.value }))}
                        className="form-control"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Comunidad del Proyecto</label>
                      <input
                        type="text"
                        placeholder="Ej. Sector Central Las Flores"
                        value={userFormData.project_community}
                        onChange={(e) => setUserFormData(prev => ({ ...prev, project_community: e.target.value }))}
                        className="form-control"
                        style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                        required
                      />
                    </div>

                    <div className="form-group" style={{ marginBottom: 0, justifyContent: 'center', minHeight: '38px' }}>
                      <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', height: '100%' }}>
                        <input
                          type="checkbox"
                          checked={userFormData.docs_submitted}
                          onChange={(e) => setUserFormData(prev => ({ ...prev, docs_submitted: e.target.checked }))}
                          style={{ cursor: 'pointer', margin: 0 }}
                        />
                        Documentos Consignados
                      </label>
                    </div>
                  </>
                )}

                {userFormData.role === 'tutor' && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Tipo de Tutor</label>
                    <select
                      value={userFormData.tutor_type}
                      onChange={(e) => setUserFormData(prev => ({ ...prev, tutor_type: e.target.value }))}
                      className="form-control"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      <option value="académico">Académico</option>
                      <option value="institucional">Institucional</option>
                    </select>
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Contraseña</label>
                  <input
                    type="password"
                    placeholder={editingUser ? "Nueva contraseña (mín. 1 mayús, 1 minús, 1 núm, 1 car. esp.) o dejar vacío" : "Por defecto: Unefa123*"}
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
                        setUserDocType('V');
                        setUserFormData({ name: '', identification: '', major: '', role: 'student', tutor_id: '', tutor_institucional_id: '', password: '', project_title: '', project_community: '', tutor_type: 'académico', docs_submitted: false, phone: '', email: '' });
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
                        <td data-label="Nombre" style={{ fontWeight: 700, color: 'var(--unefa-navy)' }}>
                          <div>{u.name}</div>
                          {(u.phone || u.email) && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 'normal', color: '#64748B', marginTop: '0.2rem', display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                              {u.phone && <span><i className="fa-solid fa-phone" style={{ fontSize: '0.65rem', marginRight: '3px' }}></i> {u.phone}</span>}
                              {u.email && <span><i className="fa-solid fa-envelope" style={{ fontSize: '0.65rem', marginRight: '3px' }}></i> {u.email}</span>}
                            </div>
                          )}
                        </td>
                        <td data-label="Cédula">{u.identification}</td>
                        <td data-label="Carrera">{u.major}</td>
                        <td data-label="Rol">
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', fontWeight: 600 }}>
                            <i className={`fa-solid ${roleIcon}`}></i> {roleTag}
                            {u.role === 'tutor' && (
                              <span style={{
                                marginLeft: '0.4rem',
                                fontSize: '0.68rem',
                                fontWeight: 'bold',
                                color: u.tutor_type === 'académico' ? '#1D4ED8' : '#B45309',
                                background: u.tutor_type === 'académico' ? '#EFF6FF' : '#FEF3C7',
                                padding: '0.1rem 0.35rem',
                                borderRadius: '5px',
                                textTransform: 'capitalize'
                              }}>
                                {u.tutor_type || 'Académico'}
                              </span>
                            )}
                          </span>
                        </td>
                        <td data-label="Estado">
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
                        <td data-label="Acciones">
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
        )}

        {/* VISTA 4: CRONOGRAMA */}
        {vistaActiva === 'cronograma' && (
          <div className="glass-panel no-print" style={{ padding: '1.8rem', display: 'flex', flexDirection: 'column', gap: '1.2rem', marginBottom: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="fa-solid fa-calendar-days" style={{ color: 'var(--unefa-gold)' }}></i>
              Gestor del Cronograma
            </h3>

            <div style={{ maxWidth: '500px', background: 'rgba(12, 35, 64, 0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--unefa-navy)' }}>
                  Seleccione el Proyecto Comunitario
                </label>
                <select
                  className="form-control"
                  value={selectedGanttProject}
                  onChange={(e) => setSelectedGanttProject(e.target.value)}
                  style={{ padding: '0.6rem 0.8rem', fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}
                >
                  <option value="fase_inicial">Fase Inicial (Actividades Generales / Sin Proyecto)</option>
                  <option value="" disabled>-- Elija un proyecto disponible --</option>
                  {projectsList.map(p => (
                    <option key={p.id || 0} value={p.id}>{p.title} ({p.community_name})</option>
                  ))}
                </select>
              </div>
            </div>

            {selectedGanttProject && (
              <div style={{ marginTop: '1rem' }}>
                <ProjectSchedule projectId={selectedGanttProject} token={token} />
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal de Acta de Aprobación (Renderizado único a nivel raíz de dashboard) */}
      {mostrarModal && (
        <ActaModal
          projectId={proyectoSeleccionado}
          formato={actaFormats[proyectoSeleccionado] || 'horizontal'}
          onClose={() => setMostrarModal(false)}
        />
      )}

    </div>
  );
}

