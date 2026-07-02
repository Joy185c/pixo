import { useState, useEffect } from 'react'
import { LayoutDashboard, Link2, Plus, Wifi, Server } from 'lucide-react'
import Dashboard   from './pages/Dashboard.jsx'
import MyLinks     from './pages/MyLinks.jsx'
import LinkDetail  from './pages/LinkDetail.jsx'
import ConnectPage from './pages/ConnectPage.jsx'
import CreateLinkModal from './components/CreateLinkModal.jsx'

const NAV = [
  { id: 'dashboard', Icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'links',     Icon: Link2,           label: 'My Links'  },
]

// Simple URL-based routing for /connect/:token
function getRouteFromURL() {
  const path = window.location.pathname
  const match = path.match(/^\/connect\/([A-Z0-9-]+)$/)
  if (match) return { type: 'connect', token: match[1] }
  return { type: 'app' }
}

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
      {/* Gloss highlight */}
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

export default function App() {
  const [route, setRoute] = useState(getRouteFromURL)
  const [page, setPage]   = useState('dashboard')
  const [detailToken, setDetailToken] = useState(null)
  const [modal, setModal] = useState(false)

  useEffect(() => {
    const onPop = () => setRoute(getRouteFromURL())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Provider phone connect flow
  if (route.type === 'connect') {
    return <ConnectPage token={route.token} />
  }

  const navigate = (p, token = null) => {
    setPage(p)
    if (token) setDetailToken(token)
  }

  const titles = {
    dashboard: { title: 'Dashboard',   sub: 'Overview of your Pixo activity' },
    links:     { title: 'My Links',    sub: 'Manage your invite links' },
    detail:    { title: detailToken || 'Link Details', sub: 'Connected devices and sessions' },
  }
  const current = titles[page] || titles.dashboard

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
          {NAV.map(n => (
            <button
              key={n.id}
              className={`nav-item ${page === n.id ? 'active' : ''}`}
              onClick={() => setPage(n.id)}
            >
              <n.Icon size={16} strokeWidth={1.8} style={{ flexShrink: 0 }} />
              {n.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />

          <button
            id="sidebar-create-btn"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', marginTop: 8, gap: 6 }}
            onClick={() => setModal(true)}
          >
            <Plus size={15} strokeWidth={2.5} />
            New Link
          </button>
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontWeight: 600, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Server size={12} style={{ color: 'var(--muted)' }} />
            Pixo Backend
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
            <Wifi size={11} style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: 10, wordBreak: 'break-all' }}>pixo-5l0v.onrender.com</span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">{current.title}</div>
            <div className="topbar-sub">{current.sub}</div>
          </div>
          {page !== 'detail' && (
            <button className="btn btn-primary btn-sm" style={{ gap: 5 }} onClick={() => setModal(true)}>
              <Plus size={13} strokeWidth={2.5} />
              New Link
            </button>
          )}
        </header>

        <div className="content">
          {page === 'dashboard' && <Dashboard onNavigate={navigate} />}
          {page === 'links'     && <MyLinks   onNavigate={navigate} />}
          {page === 'detail'    && <LinkDetail token={detailToken} onBack={() => setPage('links')} />}
        </div>
      </div>

      {modal && (
        <CreateLinkModal
          onClose={() => setModal(false)}
          onCreated={() => { setModal(false); setPage('links') }}
        />
      )}
    </div>
  )
}
