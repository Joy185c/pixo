import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Link2, Smartphone, FileText, Activity, LogOut, Eye, LayoutDashboard, ChevronRight, Shield } from 'lucide-react';
import { api } from '../api';

function PixoLogo({ size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.27),
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 20px rgba(99,102,241,0.4)', position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)', borderRadius: `${Math.round(size*0.27)}px ${Math.round(size*0.27)}px 0 0` }} />
      <span style={{ fontWeight: 800, fontSize: Math.round(size * 0.5), color: '#fff', position: 'relative', zIndex: 1 }}>P</span>
    </div>
  );
}

function StatCard({ icon: Icon, value, label, color }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{ background: `${color}18`, color }}>
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <div className="stat-val">{value ?? '—'}</div>
      <div className="stat-lbl">{label}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState('overview');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const adminUser = JSON.parse(localStorage.getItem('pixo_user') || '{}');

  useEffect(() => {
    Promise.all([
      api.get('/admin/overview').then(r => setOverview(r.overview)),
      api.get('/admin/users').then(r => setUsers(r.users || [])),
    ]).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pixo_token');
    localStorage.removeItem('pixo_user');
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <PixoLogo size={36} />
          <div>
            <div className="logo-text">Pixo Admin</div>
            <div className="logo-tag">Super Admin Panel</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${page === 'overview' ? 'active' : ''}`}
            onClick={() => setPage('overview')}
          >
            <LayoutDashboard size={16} strokeWidth={1.8} />
            Overview
          </button>
          <button
            className={`nav-item ${page === 'users' ? 'active' : ''}`}
            onClick={() => setPage('users')}
          >
            <Users size={16} strokeWidth={1.8} />
            All Users
          </button>
          <div style={{ flex: 1 }} />
          <button className="nav-item" onClick={handleLogout} style={{ color: 'var(--red)' }}>
            <LogOut size={16} strokeWidth={1.8} />
            Logout
          </button>
        </nav>
        <div className="sidebar-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, marginBottom: 2 }}>
            <Shield size={11} style={{ color: 'var(--accent1)' }} />
            {adminUser.name || 'Super Admin'}
          </div>
          <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2 }}>{adminUser.emailOrUsername}</div>
        </div>
      </aside>

      {/* Main */}
      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{page === 'overview' ? 'Admin Overview' : 'All Users'}</div>
            <div className="topbar-sub">
              {page === 'overview' ? 'Platform-wide statistics' : `${users.length} registered users`}
            </div>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(245,200,66,0.1)', border: '1px solid rgba(245,200,66,0.25)',
            borderRadius: 10, padding: '6px 14px',
          }}>
            <Shield size={14} style={{ color: 'var(--yellow)' }} />
            <span style={{ fontSize: 13, color: 'var(--yellow)', fontWeight: 600 }}>Super Admin</span>
          </div>
        </header>

        <div className="content fade-in">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: 'var(--muted)', fontSize: 14 }}>
              Loading platform data...
            </div>
          ) : page === 'overview' ? (
            <OverviewTab overview={overview} users={users} onViewUsers={() => setPage('users')} />
          ) : (
            <UsersTab users={users} />
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ overview, users, onViewUsers }) {
  const stats = [
    { icon: Users,      value: overview?.total_users,    label: 'Total Users',    color: '#6366f1' },
    { icon: Link2,      value: overview?.total_links,    label: 'Total Links',    color: '#8b5cf6' },
    { icon: Smartphone, value: overview?.total_sessions, label: 'Total Sessions', color: '#06b6d4' },
    { icon: Activity,   value: overview?.active_sessions,label: 'Active Sessions',color: '#10b981' },
    { icon: FileText,   value: overview?.total_files,    label: 'Total Files',    color: '#f59e0b' },
  ];

  return (
    <div>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      <div className="section-header">
        <span className="section-title">Recent Users</span>
        <button className="btn btn-ghost btn-sm" style={{ gap: 4 }} onClick={onViewUsers}>
          View all <ChevronRight size={13} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.slice(0, 5).map(u => <UserRow key={u.id} user={u} />)}
      </div>
    </div>
  );
}

function UsersTab({ users }) {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-text">No users registered yet.</div>
          </div>
        ) : (
          users.map(u => <UserRow key={u.id} user={u} expanded />)
        )}
      </div>
    </div>
  );
}

function UserRow({ user, expanded }) {
  const joinedDate = new Date(user.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '16px 20px',
      transition: 'border-color 0.2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, fontWeight: 700, color: '#fff',
      }}>
        {(user.name || '?')[0].toUpperCase()}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{user.email_or_username}</div>
        {expanded && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, opacity: 0.6 }}>Joined {joinedDate}</div>}
      </div>

      {/* Stats badges */}
      {expanded && (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {[
            { label: 'Links', val: user.total_links, color: '#6366f1' },
            { label: 'Sessions', val: user.total_sessions, color: '#06b6d4' },
            { label: 'Files', val: user.total_files, color: '#10b981' },
          ].map(b => (
            <div key={b.label} style={{
              textAlign: 'center', padding: '6px 12px', borderRadius: 8,
              background: `${b.color}12`, border: `1px solid ${b.color}25`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: b.color }}>{b.val}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{b.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, minWidth: 80, textAlign: 'right' }}>
        {joinedDate}
      </div>
    </div>
  );
}
