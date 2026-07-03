import { useState, useEffect } from 'react'
import { Plus, Link2 } from 'lucide-react'
import { api } from '../api.js'
import { LinkCard } from './Dashboard.jsx'
import CreateLinkModal from '../components/CreateLinkModal.jsx'

export default function MyLinks({ onNavigate }) {
  const [links, setLinks]   = useState([])
  const [modal, setModal]   = useState(false)
  const [filter, setFilter] = useState('all')

  const load = () => api.get('/dashboard/links').then(r => setLinks(r.links || [])).catch(console.error)
  useEffect(() => { load() }, [])

  const filtered = filter === 'all' ? links : links.filter(l => l.status === filter)

  return (
    <div className="fade-in">
      <div className="section-header">
        <div>
          <div className="section-title">My Links</div>
          <div style={{ fontSize:13, color:'var(--muted)', marginTop:3 }}>{links.length} total links</div>
        </div>
        <button className="btn btn-primary" id="create-link-btn" style={{ gap: 6 }} onClick={() => setModal(true)}>
          <Plus size={14} strokeWidth={2.5} />
          Create New Link
        </button>
      </div>

      <div className="tabs">
        {['all','active','expired','disabled'].map(f => (
          <button key={f} className={`tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <Link2 size={36} strokeWidth={1.2} style={{ color: 'var(--muted)', opacity: 0.5 }} />
          </div>
          <div className="empty-text">No {filter === 'all' ? '' : filter} links yet.</div>
          {filter === 'all' && <button className="btn btn-primary btn-sm" style={{ gap: 5 }} onClick={() => setModal(true)}>
            <Plus size={13} /> Create your first link
          </button>}
        </div>
      ) : (
        <div className="links-grid">
          {filtered.map(link => (
            <LinkCard key={link.id} link={link} onClick={() => onNavigate('detail', link.token)} />
          ))}
        </div>
      )}

      {modal && (
        <CreateLinkModal
          onClose={() => setModal(false)}
          onCreated={() => { setModal(false); load() }}
        />
      )}
    </div>
  )
}
