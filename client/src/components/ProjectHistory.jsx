import React, { useState, useEffect } from 'react';

const API_BASE = 'https://api-control-sc-unefa.onrender.com/api';
const BACKEND_URL = API_BASE.replace(/\/api$/, '');

export default function ProjectHistory({ projectId, token, readOnly = false }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar el historial de documentos
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/proyectos/${projectId}/documentos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Error al obtener los documentos.');
      }

      const data = await res.json();
      setDocuments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchDocuments();
    }
  }, [projectId]);

  // Manejar el cambio en el selector de archivo
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Únicamente se permiten archivos en formato PDF.');
        setSelectedFile(null);
        e.target.value = ''; // Resetear input
      } else {
        setError('');
        setSelectedFile(file);
      }
    }
  };

  // Enviar el archivo
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Por favor, seleccione un archivo PDF antes de subir.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('archivo', selectedFile);

    try {
      const res = await fetch(`${API_BASE}/proyectos/${projectId}/documentos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error al subir el documento.');
      }

      setSuccess('✅ Documento PDF subido y registrado exitosamente en el histórico.');
      setSelectedFile(null);
      
      // Limpiar input file
      const fileInput = document.getElementById('document-file-input');
      if (fileInput) fileInput.value = '';

      // Recargar lista de documentos
      fetchDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Mensajes de Alerta */}
      {error && (
        <div className="glass-card" style={{ borderLeftColor: 'var(--status-correct)', background: 'rgba(239, 68, 68, 0.05)', padding: '0.8rem 1.2rem' }}>
          <span style={{ color: '#9B2C2C', fontSize: '0.88rem', fontWeight: 600 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: '0.5rem' }}></i>
            {error}
          </span>
        </div>
      )}

      {success && (
        <div className="glass-card" style={{ borderLeftColor: 'var(--status-approved)', background: 'rgba(16, 185, 129, 0.05)', padding: '0.8rem 1.2rem' }}>
          <span style={{ color: '#065F46', fontSize: '0.88rem', fontWeight: 600 }}>
            <i className="fa-solid fa-circle-check" style={{ marginRight: '0.5rem' }}></i>
            {success}
          </span>
        </div>
      )}

      {/* Sección de Subida */}
      {!readOnly && (
        <div style={{
          background: 'white',
          border: '1.5px dashed rgba(197, 160, 89, 0.4)',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(12, 35, 64, 0.02)'
        }}>
          <h4 style={{ fontSize: '1rem', color: 'var(--unefa-navy)', marginBottom: '0.8rem', fontWeight: 700 }}>
            <i className="fa-solid fa-cloud-arrow-up" style={{ color: 'var(--unefa-gold)', marginRight: '0.5rem' }}></i>
            Subir Nuevo Documento al Histórico
          </h4>
          <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              <input 
                id="document-file-input"
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange}
                style={{
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--slate-dark)',
                  background: 'rgba(12, 35, 64, 0.02)',
                  border: '1px solid #CBD5E1',
                  borderRadius: '8px',
                  padding: '0.4rem 0.8rem',
                  cursor: 'pointer'
                }}
              />
            </div>
            
            <button 
              type="submit" 
              className="btn-accent" 
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', height: '38px' }}
              disabled={uploading || !selectedFile}
            >
              {uploading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Subiendo...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-upload"></i> Subir Documento
                </>
              )}
            </button>
          </form>
          <span style={{ display: 'block', fontSize: '0.72rem', opacity: 0.6, marginTop: '0.5rem' }}>
            Solo se permiten archivos en formato PDF (máx. 10MB)
          </span>
        </div>
      )}

      {/* Sección de Visualización */}
      <div>
        <h4 style={{ fontSize: '1.1rem', color: 'var(--unefa-navy)', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <i className="fa-solid fa-file-pdf" style={{ color: 'var(--unefa-gold)' }}></i>
          Historial de Documentos PDF Registrados
        </h4>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '1.5rem', color: 'var(--unefa-navy)', marginBottom: '0.5rem' }}></i>
            <p style={{ fontSize: '0.85rem', color: '#64748B' }}>Cargando histórico de documentos...</p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            color: '#94A3B8'
          }}>
            <i className="fa-regular fa-folder-open" style={{ fontSize: '2.5rem', marginBottom: '0.8rem', opacity: 0.5 }}></i>
            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>No hay documentos registrados para este proyecto.</p>
            <p style={{ fontSize: '0.8rem' }}>Los documentos subidos se guardarán y ordenarán automáticamente por fecha.</p>
          </div>
        ) : (
          <div className="premium-table-container" style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0' }}>
            <table className="premium-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(12, 35, 64, 0.02)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--unefa-navy)' }}>Nombre del Archivo</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--unefa-navy)' }}>Fecha de Subida</th>
                  <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--unefa-navy)', textAlign: 'center' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #E2E8F0' }}>
                    <td data-label="Nombre" style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--unefa-navy)' }}>
                      <i className="fa-regular fa-file-pdf" style={{ color: '#EF4444', marginRight: '0.5rem', fontSize: '1rem' }}></i>
                      {doc.nombre_archivo}
                    </td>
                    <td data-label="Fecha" style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#64748B' }}>
                      {new Date(doc.fecha_subida).toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td data-label="Acción" style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <a 
                        href={`${BACKEND_URL}/${doc.ruta_archivo}`} 
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
                        Ver / Descargar
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
