import { useState, useEffect } from 'react'
import {
  Link2, Clock, Layers, Activity,
  ChevronRight, TrendingUp
} from 'lucide-react'
import { api } from '../api.js'

function formatTime(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return d.toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })
}
function timeLeft(isoStr) {
  if (!isoStr) return null
  const diff = new Date(isoStr) - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`
}

export default function Dashboard({ onNavigate }) {
  const [summary, setSummary] = useState(null)
  const [links, setLinks]     = useState([])

  useEffect(() => {
    api.get('/dashboard/summary').then(r => setSummary(r.summary)).catch(console.error)
    api.get('/dashboard/links').then(r => setLinks(r.links || [])).catch(console.error)
  }, [])

  const stats = [
    { Icon: Link2,     val: summary?.active_links   ?? '—', lbl: 'Active Links',    color: '#6366f1' },
    { Icon: Activity,  val: summary?.active_sessions ?? '—', lbl: 'Active Sessions', color: '#06b6d4' },
    { Icon: Layers,    val: summary?.total_links    ?? '—', lbl: 'Total Links',     color: '#8b5cf6' },
    { Icon: TrendingUp,val: summary?.total_sessions ?? '—', lbl: 'Total Sessions',  color: '#10b981' },
  ]

  const recentLinks = links.slice(0, 4)

  return (
    <div className="fade-in">
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

      <div className="section-header">
        <span className="section-title">Recent Links</span>
        <button className="btn btn-ghost btn-sm" style={{ gap: 4 }} onClick={() => onNavigate('links')}>
          View all <ChevronRight size={13} />
        </button>
      </div>

      {recentLinks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Link2 size={36} strokeWidth={1.2} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          </div>
          <div className="empty-text">No invite links yet. Create your first link!</div>
        </div>
      ) : (
        <div className="links-grid">
          {recentLinks.map(link => (
            <LinkCard key={link.id} link={link} onClick={() => onNavigate('detail', link.token)} />
          ))}
        </div>
      )}
    </div>
  )
}

export function LinkCard({ link, onClick }) {
  const connected = parseInt(link.connected_devices_count) || 0
  const max       = parseInt(link.max_devices) || 50
  const pct       = Math.round((connected / max) * 100)
  const statusMap = { active: 'badge-green', expired: 'badge-red', disabled: 'badge-muted' }
  const tl        = timeLeft(link.expires_at)

  return (
    <div className="link-card" onClick={onClick}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
        <div className="link-token">{link.token}</div>
        <span className={`badge ${statusMap[link.status] || 'badge-muted'}`}>
          {link.status === 'active' ? '● ' : ''}{link.status}
        </span>
      </div>
      <div className="link-meta">{link.access_code_label}</div>

      <div className="divider" style={{ margin:'14px 0' }} />

      <div className="device-bar">
        <span style={{ fontSize:12, color:'var(--muted)', whiteSpace:'nowrap' }}>
          {connected}/{max} devices
        </span>
        <div className="progress"><div className="progress-fill" style={{ width: pct+'%' }} /></div>
      </div>

      <div className="link-footer" style={{ marginTop:12 }}>
        <span style={{ fontSize:12, color:'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Clock size={11} />
          {tl}
        </span>
        <span style={{ fontSize:12, color:'var(--accent1)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Activity size={11} />
          {link.active_session_count || 0} active sessions
        </span>
      </div>
    </div>
  )
}
