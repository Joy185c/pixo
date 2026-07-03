import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ChevronLeft, Link2, Smartphone, FileText, Image, Video, File,
  MessageCircle, Folder, RefreshCw, AlertTriangle, Radio, Clock,
  ChevronRight, Activity, Layers, Shield
} from 'lucide-react';
import { api } from '../api';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}
function timeLeft(isoStr) {
  if (!isoStr) return null;
  const diff = new Date(isoStr) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

const CAT_META = {
  photos:    { Icon: Image,         label: 'Photos',    desc: 'Camera roll images',    color: '#f59e0b' },
  videos:    { Icon: Video,         label: 'Videos',    desc: 'Recorded videos',       color: '#ef4444' },
  pdfs:      { Icon: FileText,      label: 'PDFs',      desc: 'PDF documents',         color: '#f97316' },
  documents: { Icon: File,          label: 'Documents', desc: 'DOCX, XLSX, TXT',      color: '#6366f1' },
  whatsapp:  { Icon: MessageCircle, label: 'WhatsApp',  desc: 'WhatsApp media & docs', color: '#22c55e' },
};

function FileIcon({ mime, size = 20 }) {
  if (!mime) return <Folder size={size} style={{ color: '#8b5cf6' }} />;
  if (mime.startsWith('image/')) return <Image size={size} style={{ color: '#f59e0b' }} />;
  if (mime.startsWith('video/')) return <Video size={size} style={{ color: '#ef4444' }} />;
  if (mime === 'application/pdf') return <FileText size={size} style={{ color: '#f97316' }} />;
  return <File size={size} style={{ color: '#6366f1' }} />;
}

// ─── User File Browser ────────────────────────────────────────────────────────
function UserFileBrowser({ userId }) {
  const [summary, setSummary] = useState(null);
  const [files, setFiles]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]   = useState('');
  const [preview, setPreview] = useState(null);
  const LIMIT = 250;

  // Load category summary
  useEffect(() => {
    api.get(`/admin/users/${userId}/files/summary`)
      .then(r => setSummary(r.summary))
      .catch(() => setError('Failed to load file summary.'))
      .finally(() => setLoading(false));
  }, [userId]);

  const loadFiles = useCallback((cat, offset = 0, append = false) => {
    if (offset === 0) setLoading(true); else setLoadingMore(true);
    setError('');
    const ep = `/admin/users/${userId}/files?limit=${LIMIT}&offset=${offset}${cat ? `&category=${cat}` : ''}`;
    api.get(ep)
      .then(r => {
        setFiles(prev => append ? [...prev, ...r.files] : r.files);
        setTotal(r.total);
        setHasMore(r.hasMore);
      })
      .catch(() => setError('Failed to load files.'))
      .finally(() => { setLoading(false); setLoadingMore(false); });
  }, [userId]);

  const selectCat = (cat) => {
    setSelectedCat(cat);
    setFiles([]);
    loadFiles(cat, 0, false);
  };
  const loadMore = () => loadFiles(selectedCat, files.length, true);

  if (loading && !selectedCat) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
      <Radio size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
      <div>Loading file categories…</div>
    </div>
  );

  if (error && !summary) return (
    <div className="empty-state">
      <AlertTriangle size={32} style={{ color: 'var(--red)', marginBottom: 8 }} />
      <div style={{ color: 'var(--red)' }}>{error}</div>
    </div>
  );

  // ── Category grid ──
  if (!selectedCat) {
    const cats = summary || {};
    const total = parseInt(cats.totalFiles) || 0;
    return (
      <div className="fade-in">
        <div className="card" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Indexed Files</div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 4 }}>{total.toLocaleString()}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            setLoading(true);
            api.get(`/admin/users/${userId}/files/summary`).then(r => setSummary(r.summary)).finally(() => setLoading(false));
          }}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
        {total === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Folder size={36} strokeWidth={1.2} style={{ opacity: 0.4 }} /></div>
            <div className="empty-text">No approved files available yet.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
            {Object.entries(CAT_META).map(([catId, meta]) => {
              const count = parseInt(cats[catId]) || 0;
              return (
                <div key={catId} onClick={() => count > 0 && selectCat(catId)}
                  className="card-glass"
                  style={{ cursor: count > 0 ? 'pointer' : 'default', opacity: count > 0 ? 1 : 0.45, transition: 'all 0.2s',
                    border: count > 0 ? '1px solid var(--border)' : '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <meta.Icon size={20} style={{ color: meta.color }} />
                    </div>
                    <span className={`badge ${count > 0 ? 'badge-green' : 'badge-muted'}`}>{count.toLocaleString()} files</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{meta.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{meta.desc}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── File grid / list ──
  const catMeta = CAT_META[selectedCat] || {};
  const isMedia = selectedCat === 'photos' || selectedCat === 'videos';
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="back-btn" style={{ margin: 0 }} onClick={() => setSelectedCat(null)}>
          <ChevronLeft size={14} /> Categories
        </button>
        <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          {catMeta.Icon && <catMeta.Icon size={16} style={{ color: catMeta.color }} />}
          {catMeta.label}
        </h3>
        <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>
          Showing {files.length} of {total.toLocaleString()}
        </span>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', gap: 5 }} onClick={() => loadFiles(selectedCat, 0, false)}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          <Radio size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <div>Loading files…</div>
        </div>
      ) : error ? (
        <div className="empty-state">
          <AlertTriangle size={28} style={{ color: 'var(--red)' }} />
          <div style={{ color: 'var(--red)', marginTop: 8 }}>{error}</div>
        </div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-text">No approved files available yet.</div>
        </div>
      ) : isMedia ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {files.map(file => (
              <div key={file.fileToken}
                className="card-glass"
                style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                onClick={() => setPreview(file)}>
                <div style={{ width: '100%', height: 160, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  {file.previewData
                    ? <img src={file.previewData} alt={file.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    : <FileIcon mime={file.mimeType} size={48} />}
                  {selectedCat === 'videos' && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: 12 }}>
                      <Video size={24} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{fmtSize(file.fileSize)}</div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <button className="btn btn-primary" style={{ margin: '24px auto 0', display: 'flex' }} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? 'Loading…' : `Load More (${total - files.length} remaining)`}
            </button>
          )}
        </>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {files.map((file, idx) => (
            <div key={file.fileToken}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 18px',
                borderBottom: idx < files.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background .15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              onClick={() => setPreview(file)}>
              <FileIcon mime={file.mimeType} size={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{fmtSize(file.fileSize)}</div>
              </div>
              <span className="badge badge-muted">{file.category}</span>
            </div>
          ))}
          {hasMore && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading…' : `Load More (${total - files.length} remaining)`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setPreview(null)}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, maxWidth: 600, width: '100%', padding: 20 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{preview.fileName}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreview(null)}>✕ Close</button>
            </div>
            {preview.previewData ? (
              <img src={preview.previewData} alt={preview.fileName} style={{ width: '100%', borderRadius: 10, maxHeight: 400, objectFit: 'contain', background: '#000' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                <FileIcon mime={preview.mimeType} size={48} />
                <div style={{ marginTop: 12 }}>No preview available</div>
              </div>
            )}
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 16 }}>
              <span>Size: {fmtSize(preview.fileSize)}</span>
              <span>Type: {preview.mimeType || '—'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin User Sessions Tab ──────────────────────────────────────────────────
function UserSessionsTab({ userId }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/users/${userId}/links`)
      .then(r => setLinks(r.links || []))
      .catch(() => setError('Failed to load sessions.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)', textAlign: 'center' }}>Loading sessions…</div>;
  if (error) return <div className="empty-state"><div style={{ color: 'var(--red)' }}>{error}</div></div>;

  const allSessions = links.flatMap(l => {
    const active  = parseInt(l.active_session_count)  || 0;
    const expired = parseInt(l.expired_session_count) || 0;
    const revoked = parseInt(l.revoked_session_count) || 0;
    return [{ linkToken: l.token, active, expired, revoked }];
  });

  if (allSessions.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon"><Smartphone size={36} strokeWidth={1.2} style={{ opacity: 0.4 }} /></div>
      <div className="empty-text">No sessions found for this user.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {links.map(link => (
        <div key={link.id} className="card-glass" style={{ padding: '14px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, fontFamily: 'monospace' }}>{link.token}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
                Active: {link.active_session_count} · Expired: {link.expired_session_count} · Revoked: {link.revoked_session_count}
              </div>
            </div>
            <span className={`badge ${link.status === 'active' ? 'badge-green' : 'badge-red'}`}>{link.status}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Admin User Overview Tab ──────────────────────────────────────────────────
function UserOverviewTab({ userId, user }) {
  const [summary, setSummary] = useState(null);
  const [fileSummary, setFileSummary] = useState(null);

  useEffect(() => {
    api.get(`/admin/users/${userId}/summary`).then(r => setSummary(r.summary)).catch(console.error);
    api.get(`/admin/users/${userId}/files/summary`).then(r => setFileSummary(r.summary)).catch(console.error);
  }, [userId]);

  const stats = [
    { Icon: Link2,      val: summary?.total_links    ?? '—', lbl: 'Total Links',    color: '#6366f1' },
    { Icon: Activity,   val: summary?.active_sessions ?? '—', lbl: 'Active Sessions',color: '#10b981' },
    { Icon: Layers,     val: summary?.total_sessions  ?? '—', lbl: 'Total Sessions', color: '#06b6d4' },
    { Icon: FileText,   val: parseInt(fileSummary?.totalFiles) || '—', lbl: 'Total Files', color: '#f59e0b' },
  ];

  return (
    <div>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: `${s.color}18`, color: s.color }}>
              <s.Icon size={20} strokeWidth={1.8} />
            </div>
            <div className="stat-val">{s.val}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>
      {fileSummary && parseInt(fileSummary.totalFiles) > 0 && (
        <div style={{ marginTop: 24 }}>
          <div className="section-title" style={{ marginBottom: 14 }}>File Distribution</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: 12 }}>
            {Object.entries(CAT_META).map(([catId, meta]) => {
              const count = parseInt(fileSummary[catId]) || 0;
              if (count === 0) return null;
              return (
                <div key={catId} className="card-glass" style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <meta.Icon size={16} style={{ color: meta.color }} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: meta.color }}>{count.toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin User Links Tab ─────────────────────────────────────────────────────
function UserLinksTab({ userId }) {
  const navigate = useNavigate();
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/admin/users/${userId}/links`)
      .then(r => setLinks(r.links || []))
      .catch(() => setError('Failed to load links.'))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)', textAlign: 'center' }}>Loading links…</div>;
  if (error) return <div className="empty-state"><div style={{ color: 'var(--red)' }}>{error}</div></div>;
  if (links.length === 0) return (
    <div className="empty-state">
      <div className="empty-icon"><Link2 size={36} strokeWidth={1.2} style={{ opacity: 0.4 }} /></div>
      <div className="empty-text">No invite links found for this user.</div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {links.map(link => (
        <div key={link.id} className="card-glass" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 14 }}>{link.token}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              Devices: {link.connected_devices_count}/{link.max_devices} ·
              Active sessions: {link.active_session_count} ·
              {link.access_code_label ? ` Code: ${link.access_code_label}` : ' (no code)'}
            </div>
          </div>
          <span className={`badge ${link.status === 'active' ? 'badge-green' : 'badge-red'}`}>{link.status}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/users/${userId}/links/${link.token}`)}>
            Details <ChevronRight size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main AdminUserPage ───────────────────────────────────────────────────────
export default function AdminUserPage() {
  const { userId } = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [user, setUser] = useState(null);

  // Initialize tab from ?tab= URL param
  const initialTab = new URLSearchParams(location.search).get('tab') || 'overview';
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    api.get('/admin/users').then(r => {
      const found = (r.users || []).find(u => u.id === userId);
      setUser(found || null);
    }).catch(console.error);
  }, [userId]);

  const TABS = [
    { id: 'overview', label: 'Overview',  Icon: Activity },
    { id: 'links',    label: 'Links',     Icon: Link2 },
    { id: 'sessions', label: 'Sessions',  Icon: Smartphone },
    { id: 'files',    label: 'Files',     Icon: Folder },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Topbar ── */}
      <header style={{
        background: 'var(--bg2)', borderBottom: '1px solid var(--border)',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16
      }}>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin')}>
          <ChevronLeft size={15} /> Admin Panel
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
              {(user?.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name || 'Loading…'}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{user?.email_or_username}</div>
            </div>
            {user?.role === 'super_admin' && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(245,158,11,0.15)', color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)', padding: '2px 8px', borderRadius: 5 }}>ADMIN</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(245,200,66,0.1)',
          border: '1px solid rgba(245,200,66,0.25)', borderRadius: 10, padding: '6px 14px' }}>
          <Shield size={14} style={{ color: 'var(--yellow)' }} />
          <span style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 600 }}>Viewing as Super Admin</span>
        </div>
      </header>

      <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* ── Tab bar ── */}
        <div className="tabs" style={{ marginBottom: 24 }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        {tab === 'overview'  && <UserOverviewTab  userId={userId} user={user} />}
        {tab === 'links'     && <UserLinksTab     userId={userId} />}
        {tab === 'sessions'  && <UserSessionsTab  userId={userId} />}
        {tab === 'files'     && <UserFileBrowser  userId={userId} />}
      </div>
    </div>
  );
}
