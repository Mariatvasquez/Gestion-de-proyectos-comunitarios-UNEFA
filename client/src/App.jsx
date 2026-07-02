import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TutorDashboard from './components/TutorDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';

const API_BASE = 'https://api-control-sc-unefa.onrender.com';

export default function App() {
  const [activeUser, setActiveUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para Cambio de Contraseña (Modal a nivel raíz)
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Verificar si hay un token válido guardado al montar la aplicación
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken) {
      fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${savedToken}`
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Token no válido');
          }
          return res.json();
        })
        .then(user => {
          setToken(savedToken);
          setActiveUser(user);
          setLoading(false);
        })
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
          setActiveUser(null);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (newToken, user) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setActiveUser(user);
  };

  const handleLogout = () => {
    if (window.confirm('¿Está seguro de que desea cerrar sesión?')) {
      localStorage.removeItem('token');
      setToken(null);
      setActiveUser(null);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.error || 'Error al cambiar la contraseña.');
        return;
      }

      setPasswordSuccess('✅ Contraseña cambiada con éxito.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      setPasswordError('Error de red al conectar con el servidor.');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1rem',
        background: '#F8FAFC'
      }}>
        <i className="fa-solid fa-circle-notch fa-spin" style={{ fontSize: '2.5rem', color: 'var(--unefa-navy)' }}></i>
        <p style={{ fontFamily: 'var(--font-header)', fontWeight: 600, color: 'var(--unefa-navy)' }}>
          Verificando sesión...
        </p>
      </div>
    );
  }

  // Si no está autenticado, se muestra la vista de Login
  if (!activeUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* 1. Header con Información de Usuario, Logout y Cambio de Contraseña */}
      <Header user={activeUser} onLogout={handleLogout} onChangePassword={() => setShowPasswordModal(true)} />

      {/* 2. Banner Oficial UNEFA */}
      <div className="print-hidden" style={{
        background: 'linear-gradient(135deg, #0C2340 0%, #15355D 100%)',
        color: 'white',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderBottom: '4px solid #C5A059',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
      }}>
        {/* Efecto de luz decorativo */}
        <div style={{
          position: 'absolute',
          top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
          background: 'radial-gradient(circle, rgba(197,160,89,0.15) 0%, transparent 60%)',
          pointerEvents: 'none'
        }}></div>

        <h1 style={{
          color: '#C5A059',
          fontFamily: 'var(--font-header)',
          fontSize: '2.4rem',
          fontWeight: '900',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          marginBottom: '0.4rem'
        }}>
          Control de Servicio Comunitario
        </h1>
        <p style={{
          fontSize: '1rem',
          maxWidth: '650px',
          margin: '0 auto',
          opacity: 0.9,
          fontWeight: '500',
          lineHeight: '1.4'
        }}>
          Equipo de Extensión Universitaria • Departamento de Servicio Comunitario
        </p>
      </div>

      {/* 3. Panel Principal Dinámico por Rol */}
      <main style={{ flex: 1, paddingBottom: '3rem' }}>
        {activeUser.role === 'student' && (
          <StudentDashboard user={activeUser} token={token} />
        )}

        {activeUser.role === 'tutor' && (
          <TutorDashboard user={activeUser} token={token} />
        )}

        {activeUser.role === 'coordinator' && (
          <CoordinatorDashboard user={activeUser} token={token} />
        )}
      </main>

      {/* 4. Footer */}
      <footer className="print-hidden" style={{
        textAlign: 'center',
        padding: '1.5rem',
        background: '#0C2340',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.8rem',
        fontWeight: '500',
        borderTop: '2px solid #C5A059',
        marginTop: 'auto'
      }}>
        <p>© {new Date().getFullYear()} Universidad Nacional Experimental Politécnica de las Fuerzas Armadas.</p>
        <p style={{ opacity: 0.4, marginTop: '0.2rem' }}>Departamento de Servicio Comunitario</p>
      </footer>

      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(12, 35, 64, 0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '400px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            position: 'relative',
            color: 'var(--unefa-navy)'
          }}>
            <h3 style={{
              fontFamily: 'var(--font-header)',
              color: 'var(--unefa-navy)',
              fontSize: '1.25rem',
              fontWeight: 800,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: 0
            }}>
              <i className="fa-solid fa-key" style={{ color: 'var(--unefa-gold)' }}></i>
              Cambiar Contraseña
            </h3>

            {passwordError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: 'var(--status-correct)',
                padding: '0.8rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderLeft: '4px solid var(--status-correct)'
              }}>
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div style={{
                background: 'rgba(16, 185, 129, 0.08)',
                color: 'var(--status-approved)',
                padding: '0.8rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                borderLeft: '4px solid var(--status-approved)'
              }}>
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: 0 }}>Contraseña Actual</label>
                <input
                  type="password"
                  className="form-control"
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: 0 }}>Nueva Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <span style={{ fontSize: '0.68rem', color: '#64748B', display: 'block', marginTop: '0.1rem', lineHeight: '1.3' }}>
                  Debe incluir al menos 1 mayúscula, 1 minúscula, 1 número y 1 carácter especial (@, #, $, /, *, ., +, -).
                </span>
              </div>

              <div className="form-group" style={{ marginBottom: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', textAlign: 'left' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--unefa-navy)', fontWeight: 700, margin: 0 }}>Confirmar Nueva Contraseña</label>
                <input
                  type="password"
                  className="form-control"
                  style={{ padding: '0.5rem 0.8rem', fontSize: '0.9rem', width: '100%', boxSizing: 'border-box' }}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                    setPasswordSuccess('');
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  disabled={passwordLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
