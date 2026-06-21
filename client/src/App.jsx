import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Header from './components/Header';
import StudentDashboard from './components/StudentDashboard';
import TutorDashboard from './components/TutorDashboard';
import CoordinatorDashboard from './components/CoordinatorDashboard';

const API_BASE = 'http://localhost:5000/api';

export default function App() {
  const [activeUser, setActiveUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

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
      
      {/* 1. Header con Información de Usuario y Logout */}
      <Header user={activeUser} onLogout={handleLogout} />
      
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
          Vicerrectorado de Asuntos Sociales y Participación Ciudadana • Núcleo Académico UNEFA
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
        <p>© {new Date().getFullYear()} Universidad Nacional Experimental Politécnica de la Fuerza Armada Nacional Bolivariana.</p>
        <p style={{ opacity: 0.4, marginTop: '0.2rem' }}>Coordinación de proyectos Comunitarios</p>
      </footer>

    </div>
  );
}
