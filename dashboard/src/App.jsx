import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams, Link } from 'react-router-dom'
import { LayoutDashboard, Link2, Plus, Wifi, Server, LogOut, Shield } from 'lucide-react'

import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ConnectPage from './pages/ConnectPage'
import Dashboard from './pages/Dashboard'
import MyLinks from './pages/MyLinks'
import LinkDetail from './pages/LinkDetail'
import CreateLinkModal from './components/CreateLinkModal'
import AdminDashboard from './pages/AdminDashboard'
import AdminUserPage from './pages/AdminUserPage'
import AdminFilesPage from './pages/AdminFilesPage'

// Premium Pixo Logo Icon
function PixoLogo({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: Math.round(size * 0.27),
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: '0 0 20px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
      position: 'relative', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
        borderRadius: `${Math.round(size * 0.27)}px ${Math.round(size * 0.27)}px 0 0`,
      }} />
      <span style={{
        fontWeight: 800, fontSize: Math.round(size * 0.5), color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif', letterSpacing: -0.5,
        position: 'relative', zIndex: 1,
      }}>P</span>
    </div>
  )
}

function ProtectedRoute({ children, adminOnly }) {
  const token = localStorage.getItem('pixo_token')
  const user = JSON.parse(localStorage.getItem('pixo_user') || '{}')
  
  if (!token) return <Navigate to="/login" />
  if (adminOnly && user.role !== 'super_admin') return <Navigate to="/dashboard" />
  return children
}

const NAV = [
  { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { id: 'links',     Icon: Link2,           label: 'My Links', path: '/links'  },
]

function Layout({ children, title, sub }) {
  const [modal, setModal] = useState(false)
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('pixo_user') || '{}')
  const isAdmin = user.role === 'super_admin'

  const handleLogout = () => {
    localStorage.removeItem('pixo_token')
    localStorage.removeItem('pixo_user')
    navigate('/login')
  }

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <PixoLogo size={36} />
          <div>
            <div className="logo-text">Pixo</div>
            <div className="logo-tag">Access your files, fluently.</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {!isAdmin && NAV.map(n => (
            <Link key={n.id} to={n.path} className={`nav-item ${window.location.pathname === n.path ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
              <n.Icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {n.label}
            </Link>
          ))}

          {isAdmin && (
            <Link to="/admin" className={`nav-item ${window.location.pathname.startsWith('/admin') ? 'active' : ''}`} style={{ textDecoration: 'none' }}>
              <Shield size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              Super Admin
            </Link>
          )}

          <div style={{ flex: 1 }} />
          <button className="nav-item" onClick={handleLogout} style={{ border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', color: 'var(--red)', opacity: 0.8 }}>
            <LogOut size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
            Logout
          </button>
          {!isAdmin && (
            <button
              id="sidebar-create-btn"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, gap: 6 }}
              onClick={() => setModal(true)}
            >
              <Plus size={15} strokeWidth={2.5} />
              New Link
            </button>
          )}
        </nav>
        <div className="sidebar-footer">
          <div style={{ fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={12} style={{ color: 'var(--muted)' }} />
            {user.name} ({user.role})
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            <div className="topbar-sub">{sub}</div>
          </div>
        </header>

        <div className="content">
          {children}
        </div>
      </div>

      {modal && (
        <CreateLinkModal
          onClose={() => setModal(false)}
          onCreated={() => { setModal(false); navigate('/links') }}
        />
      )}
    </div>
  )
}

// Wrapper Components to pass props
function DashboardPage() {
  const navigate = useNavigate()
  return <Layout title="Dashboard" sub="Overview of your Pixo activity"><Dashboard onNavigate={(p, token) => navigate(token ? `/links/${token}` : `/${p}`)} /></Layout>
}

function MyLinksPage() {
  const navigate = useNavigate()
  return <Layout title="My Links" sub="Manage your invite links"><MyLinks onNavigate={(p, token) => navigate(token ? `/links/${token}` : `/${p}`)} /></Layout>
}

function LinkDetailPage() {
  const navigate = useNavigate()
  const { token } = useParams()
  return <Layout title={token} sub="Connected devices and sessions"><LinkDetail token={token} onBack={() => navigate('/links')} /></Layout>
}

// Admin Panel (uses full AdminDashboard)
function AdminPage() {
  return <AdminDashboard />
}

function AdminUserLinkDetailPage() {
  const navigate = useNavigate()
  const { userId, token } = useParams()
  return <Layout title={token} sub="Connected devices (Admin View)"><LinkDetail token={token} userId={userId} onBack={() => navigate(`/admin/users/${userId}`)} /></Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/connect/:token" element={<ConnectPage />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/links" element={<ProtectedRoute><MyLinksPage /></ProtectedRoute>} />
        <Route path="/links/:token" element={<ProtectedRoute><LinkDetailPage /></ProtectedRoute>} />
        
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
        <Route path="/admin/files" element={<ProtectedRoute adminOnly><AdminFilesPage /></ProtectedRoute>} />
        <Route path="/admin/users/:userId" element={<ProtectedRoute adminOnly><AdminUserPage /></ProtectedRoute>} />
        <Route path="/admin/users/:userId/links/:token" element={<ProtectedRoute adminOnly><AdminUserLinkDetailPage /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
