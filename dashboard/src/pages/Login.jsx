import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';

function PixoLogoMark() {
  return (
    <div style={{
      width: 64, height: 64, borderRadius: 18,
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 40px rgba(99,102,241,0.5), 0 0 80px rgba(99,102,241,0.2)',
      position: 'relative', overflow: 'hidden', margin: '0 auto 20px',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
        borderRadius: '18px 18px 0 0',
      }} />
      <span style={{ fontWeight: 800, fontSize: 32, color: '#fff', fontFamily: 'Outfit, sans-serif', position: 'relative', zIndex: 1 }}>P</span>
    </div>
  );
}

export default function Login() {
  const [emailOrUsername, setEmail] = useState('');
  const [accessCode, setCode] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const { token, user } = await api.post('/auth/login', { emailOrUsername, accessCode });
      localStorage.setItem('pixo_token', token);
      localStorage.setItem('pixo_user', JSON.stringify(user));
      window.location.href = user.role === 'super_admin' ? '/admin' : '/dashboard';
    } catch (error) {
      setErr(error.message || 'Invalid username or access code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 50%), var(--bg)',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 420,
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 24, padding: '40px 36px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
        animation: 'slideUp 0.3s ease-out',
      }}>
        <PixoLogoMark />
        <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Welcome back</h1>
        <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 14, marginBottom: 32 }}>Login to your Pixo Dashboard</p>

        {err && (
          <div style={{
            background: 'rgba(240,90,126,0.1)', border: '1px solid rgba(240,90,126,0.3)',
            borderRadius: 10, padding: '10px 14px', marginBottom: 20,
            color: 'var(--red)', fontSize: 13,
          }}>⚠ {err}</div>
        )}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username or Email</label>
            <input
              className="form-input"
              type="text"
              placeholder="you@example.com"
              value={emailOrUsername}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: 28 }}>
            <label className="form-label">Access Code</label>
            <input
              className="form-input"
              type="password"
              placeholder="Your secret access code"
              value={accessCode}
              onChange={e => setCode(e.target.value)}
              required
            />
          </div>
          <button
            id="login-btn"
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '13px 18px', fontSize: 15 }}
          >
            {loading ? '⏳ Logging in...' : 'Login →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 24, fontSize: 14, color: 'var(--muted)' }}>
          Don't have a dashboard?{' '}
          <Link to="/signup" style={{ color: 'var(--accent1)', textDecoration: 'none', fontWeight: 600 }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
