import React, { useState } from 'react';

const ActaModal = ({ projectId, formato, onClose }) => {
  const [formData, setFormData] = useState({
    semestre: '',
    seccion: '',
    fecha_inicio: '',
    fecha_culminacion: '',
    periodo: '',
    autoridades: {
      jefe_area: 'Prof. Carlos Mendoza',
      jefe_area_ci: 'V-8765432',
      responsable_servicio: 'Prof. Rosa Camejo',
      responsable_servicio_ci: 'V-10203040',
      jefe_extension: '',
      jefe_extension_ci: '',
      tutor_academico: '',
      tutor_academico_ci: ''
    }
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuthorityChange = (e) => {
    setFormData({
      ...formData,
      autoridades: {
        ...formData.autoridades,
        [e.target.name]: e.target.value
      }
    });
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('https://api-control-sc-unefa.onrender.com/api/reportes/generar-acta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ...formData, project_id: projectId, formato: formato || 'horizontal' }),
      });

      if (!response.ok) throw new Error('Error al generar el documento');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Acta_Proyecto_${projectId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      onClose(); // Cierra el modal después de descargar

    } catch (error) {
      console.error(error);
      alert('Hubo un problema descargando el acta.');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(12, 35, 64, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 1000,
      padding: '1rem',
      overflowY: 'auto'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '480px',
        padding: '2rem 2.2rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        background: 'rgba(255, 255, 255, 0.96)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
        color: 'var(--slate-dark)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <h2 style={{ 
          fontSize: '1.5rem', 
          fontWeight: '800', 
          margin: 0, 
          color: 'var(--unefa-navy)',
          fontFamily: 'var(--font-header)'
        }}>
          Generar Acta Final
        </h2>
        
        <form onSubmit={handleDownload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          


          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Semestre</label>
              <input 
                type="text" 
                name="semestre" 
                placeholder="Ej. 7mo" 
                onChange={handleChange} 
                required 
                style={{
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: 'white',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '100%'
                }} 
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Sección</label>
              <input 
                type="text" 
                name="seccion" 
                placeholder="Ej. D01" 
                onChange={handleChange} 
                required 
                style={{
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: 'white',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '100%'
                }} 
              />
            </div>
          </div>

          {/* Renderizado condicional: Fechas vs Período */}
          {formato === 'horizontal' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Período Académico</label>
              <input 
                type="text" 
                name="periodo" 
                placeholder="Ej. 2026-I" 
                onChange={handleChange} 
                required 
                style={{
                  padding: '0.6rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  background: 'white',
                  fontSize: '0.85rem',
                  outline: 'none',
                  width: '100%'
                }} 
              />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Fecha de Inicio</label>
                <input 
                  type="date" 
                  name="fecha_inicio" 
                  onChange={handleChange} 
                  required 
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: 'white',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '100%'
                  }} 
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Fecha de Culminación</label>
                <input 
                  type="date" 
                  name="fecha_culminacion" 
                  onChange={handleChange} 
                  required 
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: 'white',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '100%'
                  }} 
                />
              </div>
            </div>
          )}

          {/* Formulario de Firmas Autorizadas */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.8rem', marginTop: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--unefa-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Firmas Autorizadas</span>
            
            {/* Campos condicionales (Tutor Académico, Jefe Extensión, Jefe Área) solo si es vertical_sin_nombre */}
            {formato === 'vertical_sin_nombre' && (
              <>
                {/* Tutor Académico */}
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem' }}>
                  <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Tutor Académico</label>
                    <input 
                      type="text" 
                      name="tutor_academico" 
                      value={formData.autoridades.tutor_academico} 
                      onChange={handleAuthorityChange} 
                      placeholder="Dejar vacío para usar base de datos"
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: 'white',
                        fontSize: '0.8rem',
                        outline: 'none',
                        width: '100%'
                      }} 
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>C.I. Tutor</label>
                    <input 
                      type="text" 
                      name="tutor_academico_ci" 
                      value={formData.autoridades.tutor_academico_ci} 
                      onChange={handleAuthorityChange} 
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: 'white',
                        fontSize: '0.8rem',
                        outline: 'none',
                        width: '100%'
                      }} 
                    />
                  </div>
                </div>

                {/* Jefe de Área Académica */}
                <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem' }}>
                  <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Jefe de Área Académica</label>
                    <input 
                      type="text" 
                      name="jefe_area" 
                      value={formData.autoridades.jefe_area} 
                      onChange={handleAuthorityChange} 
                      required 
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: 'white',
                        fontSize: '0.8rem',
                        outline: 'none',
                        width: '100%'
                      }} 
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>C.I. Jefe de Área</label>
                    <input 
                      type="text" 
                      name="jefe_area_ci" 
                      value={formData.autoridades.jefe_area_ci} 
                      onChange={handleAuthorityChange} 
                      required 
                      style={{
                        padding: '0.55rem 0.7rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        background: 'white',
                        fontSize: '0.8rem',
                        outline: 'none',
                        width: '100%'
                      }} 
                    />
                  </div>
                </div>
              </>
            )}

            {/* Responsable de Servicio */}
            <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem' }}>
              <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Responsable Servicio</label>
                <input 
                  type="text" 
                  name="responsable_servicio" 
                  value={formData.autoridades.responsable_servicio} 
                  onChange={handleAuthorityChange} 
                  required 
                  style={{
                    padding: '0.55rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: 'white',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '100%'
                  }} 
                />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>C.I. Responsable</label>
                <input 
                  type="text" 
                  name="responsable_servicio_ci" 
                  value={formData.autoridades.responsable_servicio_ci} 
                  onChange={handleAuthorityChange} 
                  required 
                  style={{
                    padding: '0.55rem 0.7rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    background: 'white',
                    fontSize: '0.8rem',
                    outline: 'none',
                    width: '100%'
                  }} 
                />
              </div>
            </div>

            {/* Jefe Equipo de Extensión (solo si es vertical_sin_nombre) */}
            {formato === 'vertical_sin_nombre' && (
              <div style={{ display: 'flex', gap: '0.8rem', marginTop: '0.2rem' }}>
                <div style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>Jefe Equipo Extensión</label>
                  <input 
                    type="text" 
                    name="jefe_extension" 
                    value={formData.autoridades.jefe_extension} 
                    onChange={handleAuthorityChange} 
                    required 
                    style={{
                      padding: '0.55rem 0.7rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: 'white',
                      fontSize: '0.8rem',
                      outline: 'none',
                      width: '100%'
                    }} 
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--unefa-navy)' }}>C.I. Jefe Extensión</label>
                  <input 
                    type="text" 
                    name="jefe_extension_ci" 
                    value={formData.autoridades.jefe_extension_ci} 
                    onChange={handleAuthorityChange} 
                    required 
                    style={{
                      padding: '0.55rem 0.7rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      background: 'white',
                      fontSize: '0.8rem',
                      outline: 'none',
                      width: '100%'
                    }} 
                  />
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.8rem' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F1F5F9',
                color: '#475569',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#E2E8F0'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#F1F5F9'}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, var(--unefa-navy) 0%, #15355D 100%)',
                color: 'white',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
                boxShadow: '0 4px 10px rgba(12, 35, 64, 0.15)',
                transition: 'transform 0.2s, box-shadow 0.2s'
              }}
              onMouseOver={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 15px rgba(12, 35, 64, 0.25)';
              }}
              onMouseOut={(e) => {
                e.target.style.transform = 'none';
                e.target.style.boxShadow = '0 4px 10px rgba(12, 35, 64, 0.15)';
              }}
            >
              Imprimir PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ActaModal;