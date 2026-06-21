import React from 'react';

export default function Header({ user, onLogout }) {
  if (!user) return null;

  let roleLabel = 'Estudiante';
  let roleIcon = 'fa-user-graduate';
  
  if (user.role === 'tutor') {
    roleLabel = 'Tutor Académico';
    roleIcon = 'fa-chalkboard-user';
  } else if (user.role === 'coordinator') {
    roleLabel = 'Coordinador General';
    roleIcon = 'fa-user-tie';
  }

  return (
    <header className="print-hidden" style={{
      background: 'rgba(12, 35, 64, 0.96)',
      backdropFilter: 'blur(10px)',
      borderBottom: '3px solid var(--unefa-gold)',
      color: 'white',
      padding: '0.8rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
    }}>
      {/* Logotipo y Título */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
        <div style={{
          background: 'var(--unefa-gold)',
          color: '#0C2340',
          width: '38px',
          height: '38px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '1.2rem'
        }}>
          <i className="fa-solid fa-shield-halved"></i>
        </div>
        <div>
          <span style={{ 
            fontFamily: 'var(--font-header)', 
            fontWeight: '800', 
            fontSize: '1.1rem',
            letterSpacing: '1px',
            display: 'block'
          }}>
            UNEFA <span style={{ color: 'var(--unefa-gold)' }}>SERVICIO COMUNITARIO</span>
          </span>
          <span style={{ 
            fontSize: '0.7rem', 
            display: 'block', 
            opacity: 0.8,
            marginTop: '-2px'
          }}>
            Plataforma de Control e Integración Vecinal
          </span>
        </div>
      </div>

      {/* Perfil e Interacciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        {/* Info del Usuario */}
        <div style={{ textAlign: 'right' }}>
          <span style={{
            display: 'block',
            fontWeight: '700',
            fontSize: '0.9rem',
            fontFamily: 'var(--font-header)'
          }}>
            {user.name}
          </span>
          <span style={{
            fontSize: '0.75rem',
            color: 'var(--unefa-gold)',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '0.15rem 0.5rem',
            borderRadius: '6px'
          }}>
            <i className={`fa-solid ${roleIcon}`}></i> {roleLabel}
          </span>
        </div>

        {/* Separador */}
        <div style={{ height: '30px', width: '1px', background: 'rgba(255, 255, 255, 0.2)' }}></div>

        {/* Botón Cerrar Sesión */}
        <button 
          onClick={onLogout}
          className="btn-danger"
          style={{
            padding: '0.45rem 1rem',
            fontSize: '0.8rem',
            borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid var(--status-correct)',
            color: '#FCA5A5',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--status-correct)';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            e.currentTarget.style.color = '#FCA5A5';
          }}
        >
          <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
