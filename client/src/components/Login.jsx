import React, { useState } from 'react';

const API_BASE = 'http://localhost:5000/api';

export default function Login({ onLoginSuccess }) {
  const [docType, setDocType] = useState('V');
  const [docNumber, setDocNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!docNumber.trim() || !password.trim()) {
      setError('Por favor complete todos los campos.');
      setLoading(false);
      return;
    }

    const identification = `${docType}-${docNumber.trim()}`;

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identification,
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Credenciales inválidas. Intente nuevamente.');
        setLoading(false);
        return;
      }

      // Guardar token y pasar sesión al padre
      onLoginSuccess(data.token, data.user);
    } catch (err) {
      setError('Error de conexión con el servidor. Por favor verifique si el backend está activo.');
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      background: 'radial-gradient(circle at top right, #0F2A4A 0%, #051426 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Círculos decorativos de fondo con difuminado (Efecto Glassmorphism Premium) */}
      <div style={{
        position: 'absolute',
        top: '20%',
        left: '15%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(197,160,89,0.15) 0%, transparent 70%)',
        filter: 'blur(40px)',
        pointerEvents: 'none'
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '10%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(12,35,64,0.4) 0%, transparent 60%)',
        filter: 'blur(30px)',
        pointerEvents: 'none'
      }}></div>

      {/* Caja de Login principal */}
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '460px',
        padding: '3rem 2.5rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(255, 255, 255, 0.07)',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Encabezado e Isotipo */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #C5A059 0%, #9F7E3B 100%)',
            borderRadius: '20px',
            margin: '0 auto 1.5rem auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px rgba(197, 160, 89, 0.3)',
            transform: 'rotate(45deg)'
          }}>
            <i className="fa-solid fa-shield-halved" style={{
              color: '#0C2340',
              fontSize: '2.2rem',
              transform: 'rotate(-45deg)'
            }}></i>
          </div>

          <h2 style={{
            color: '#C5A059',
            fontSize: '1.8rem',
            fontWeight: '900',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '0.4rem',
            textShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}>
            UNEFA
          </h2>
          <p style={{
            fontSize: '0.9rem',
            opacity: 0.8,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '2px',
            color: '#E2E8F0'
          }}>
            Servicio Comunitario
          </p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            borderLeft: '4px solid var(--status-correct)',
            color: '#FEE2E2',
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            textAlign: 'left',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <i className="fa-solid fa-circle-exclamation" style={{ color: 'var(--status-correct)' }}></i>
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
              DOCUMENTO DE IDENTIDAD
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="form-control"
                style={{
                  width: '80px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  paddingLeft: '0.5rem',
                  paddingRight: '0.5rem'
                }}
              >
                <option value="V" style={{ color: 'var(--slate-dark)' }}>V</option>
                <option value="E" style={{ color: 'var(--slate-dark)' }}>E</option>
                <option value="P" style={{ color: 'var(--slate-dark)' }}>P</option>
              </select>
              <div style={{ position: 'relative', flex: 1 }}>
                <i className="fa-solid fa-id-card" style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontSize: '1.1rem'
                }}></i>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Número de cédula"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value.replace(/\D/g, ''))}
                  className="form-control"
                  style={{
                    width: '100%',
                    paddingLeft: '2.8rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1.5px solid rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    borderRadius: '12px'
                  }}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="form-label" style={{ color: '#E2E8F0', fontSize: '0.85rem', letterSpacing: '0.5px' }}>
              CONTRASEÑA
            </label>
            <div style={{ position: 'relative' }}>
              <i className="fa-solid fa-lock" style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '1.1rem'
              }}></i>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-control"
                style={{
                  width: '100%',
                  paddingLeft: '2.8rem',
                  paddingRight: '3rem',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1.5px solid rgba(255, 255, 255, 0.15)',
                  color: 'white',
                  borderRadius: '12px'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.6)',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-accent"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '0.9rem',
              borderRadius: '12px',
              fontSize: '1rem',
              boxShadow: '0 6px 20px rgba(197, 160, 89, 0.2)'
            }}
            disabled={loading}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                Iniciando Sesión...
              </>
            ) : (
              <>
                <i className="fa-solid fa-right-to-bracket"></i>
                Ingresar al Sistema
              </>
            )}
          </button>
        </form>

        <p style={{
          marginTop: '2.5rem',
          fontSize: '0.75rem',
          opacity: 0.5,
          fontWeight: 500,
          color: '#E2E8F0'
        }}>
          Vicerrectorado de Asuntos Sociales y Participación Ciudadana<br />
          UNEFA • Núcleo Académico
        </p>
      </div>
    </div>
  );
}
