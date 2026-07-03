import React from 'react';
import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(6,182,212,0.08) 0%, transparent 50%), var(--bg)',
      padding: 20, textAlign: 'center',
    }}>
      {/* Ambient glow orbs */}
      <div style={{
        position: 'fixed', top: '20%', left: '10%', width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(99,102,241,0.06)', filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'fixed', bottom: '20%', right: '10%', width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(6,182,212,0.06)', filter: 'blur(80px)',
        pointerEvents: 'none',
      }} />

      {/* Logo */}
      <div style={{
        width: 80, height: 80, borderRadius: 22,
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 60px rgba(99,102,241,0.5), 0 0 120px rgba(99,102,241,0.2)',
        marginBottom: 32, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)',
          borderRadius: '22px 22px 0 0',
        }} />
        <span style={{ fontWeight: 800, fontSize: 40, color: '#fff', fontFamily: 'Outfit, sans-serif', position: 'relative', zIndex: 1 }}>P</span>
      </div>

      <div style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 3, textTransform: 'uppercase',
        color: 'var(--accent1)', marginBottom: 16, opacity: 0.8,
      }}>
        Pixo Platform
      </div>

      <h1 style={{
        fontSize: 48, fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.1,
        marginBottom: 18, maxWidth: 480,
        background: 'linear-gradient(135deg, #e8e8f4 30%, rgba(99,102,241,0.9) 100%)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>
        Access your files,<br />fluently.
      </h1>

      <p style={{ color: 'var(--muted)', fontSize: 17, maxWidth: 380, lineHeight: 1.6, marginBottom: 44 }}>
        Your private, secure dashboard for indexing and accessing files from any device — anywhere.
      </p>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Link
          to="/login"
          id="home-login-btn"
          className="btn btn-primary"
          style={{ padding: '14px 32px', fontSize: 15, borderRadius: 12, gap: 8 }}
        >
          Login
        </Link>
        <Link
          to="/signup"
          id="home-signup-btn"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '14px 32px', fontSize: 15, fontWeight: 600, borderRadius: 12,
            border: '1px solid var(--border)', color: 'var(--text)',
            textDecoration: 'none', transition: 'all 0.2s',
            background: 'var(--glass)', backdropFilter: 'blur(8px)',
          }}
        >
          Create Dashboard
        </Link>
      </div>

      {/* Feature badges */}
      <div style={{ display: 'flex', gap: 12, marginTop: 56, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['🔒 Private by default', '📱 Android integration', '⚡ Real-time sync', '🛡️ Secure access codes'].map(f => (
          <span key={f} style={{
            fontSize: 12, padding: '6px 14px', borderRadius: 99,
            background: 'var(--glass)', border: '1px solid var(--border)',
            color: 'var(--muted)',
          }}>{f}</span>
        ))}
      </div>
    </div>
  );
}
