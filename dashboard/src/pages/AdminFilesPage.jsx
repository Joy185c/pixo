import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, Image, Video, File, MessageCircle, Users, Eye, Folder, Shield } from 'lucide-react';
import { api } from '../api';

const CAT_META = {
  photos:    { Icon: Image,         label: 'Photos',    color: '#f59e0b' },
  videos:    { Icon: Video,         label: 'Videos',    color: '#ef4444' },
  pdfs:      { Icon: FileText,      label: 'PDFs',      color: '#f97316' },
  documents: { Icon: File,          label: 'Documents', color: '#6366f1' },
  whatsapp:  { Icon: MessageCircle, label: 'WhatsApp',  color: '#22c55e' },
};

function fmtNum(n) { return parseInt(n || 0).toLocaleString(); }

export default function AdminFilesPage() {
  const navigate = useNavigate();
  const [users, setUsers]       = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/admin/files/summary').then(r => setSummary(r.summary)),
      api.get('/admin/users').then(r => setUsers(r.users || [])),
    ]).catch(() => setError('Failed to load platform files.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>
          <ChevronLeft size={15} /> Admin Panel
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Platform Files</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>All files across all users</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)', borderRadius: 10, padding: '6px 14px' }}>
          <Shield size={14} style={{ color: 'var(--yellow)' }} />
          <span style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 600 }}>Super Admin</span>
        </div>
      </header>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>Loading platform files…</div>
        ) : error ? (
          <div className="empty-state"><div style={{ color: 'var(--red)' }}>{error}</div></div>
        ) : (
          <>
            {/* ── Platform-wide summary ── */}
            {summary && (
              <div className="card" style={{ marginBottom: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <Folder size={20} style={{ color: '#f59e0b' }} />
                  <span style={{ fontWeight: 700, fontSize: 17 }}>Platform Total: {fmtNum(summary.totalFiles)} files</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px,1fr))', gap: 12 }}>
                  {Object.entries(CAT_META).map(([catId, meta]) => {
                    const count = parseInt(summary[catId]) || 0;
                    return (
                      <div key={catId} style={{ background: `${meta.color}0f`, border: `1px solid ${meta.color}25`, borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                          <meta.Icon size={14} style={{ color: meta.color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 800 }}>{fmtNum(count)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Per-user breakdown ── */}
            <div style={{ marginBottom: 16 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>
                <Users size={15} style={{ display: 'inline', marginRight: 6 }} />
                Files by User
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {users.filter(u => parseInt(u.total_files) > 0).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-text">No users have files yet.</div>
                  </div>
                ) : (
                  users
                    .filter(u => parseInt(u.total_files) > 0)
                    .sort((a, b) => parseInt(b.total_files) - parseInt(a.total_files))
                    .map(user => (
                      <div key={user.id} className="card-glass"
                        style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>

                        {/* Avatar */}
                        <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          background: user.role === 'super_admin'
                            ? 'linear-gradient(135deg,#f59e0b,#ef4444)'
                            : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 700, color: '#fff' }}>
                          {(user.name || '?')[0].toUpperCase()}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{user.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user.email_or_username}</div>
                        </div>

                        {/* File count */}
                        <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#f59e0b' }}>{fmtNum(user.total_files)}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>Files</div>
                        </div>

                        {/* Session count */}
                        <div style={{ textAlign: 'center', padding: '8px 16px', borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)' }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#06b6d4' }}>{fmtNum(user.total_sessions)}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>Sessions</div>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/users/${user.id}`)}>
                            <Eye size={13} /> Dashboard
                          </button>
                          <button className="btn btn-primary btn-sm" onClick={() => navigate(`/admin/users/${user.id}?tab=files`)}>
                            <Folder size={13} /> View Files
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
