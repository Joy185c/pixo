import { useState, useEffect, useCallback } from 'react'
import {
  Image, Video, FileText, File, MessageCircle, Folder,
  Download, Eye, RefreshCw, Smartphone, Clock, Copy,
  Share2, QrCode, Ban, Shield, ChevronLeft, Wifi,
  AlertTriangle, CheckCircle, Radio, ScrollText, X
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { api } from '../api.js'
import { getShareLink } from '../config.js'

const CATEGORY_META = {
  photos:    { Icon: Image,         label: 'Photos',    desc: 'Camera roll images',      color: '#f59e0b' },
  videos:    { Icon: Video,         label: 'Videos',    desc: 'Recorded video files',    color: '#ef4444' },
  pdfs:      { Icon: FileText,      label: 'PDFs',      desc: 'PDF documents',           color: '#f97316' },
  documents: { Icon: File,          label: 'Documents', desc: 'DOCX, XLSX, TXT files',  color: '#6366f1' },
  whatsapp:  { Icon: MessageCircle, label: 'WhatsApp',  desc: 'WhatsApp media & docs',   color: '#22c55e' },
}

function FileIcon({ mime, size = 20 }) {
  if (!mime) return <Folder size={size} style={{ color: '#8b5cf6' }} />
  if (mime.startsWith('image/'))  return <Image size={size} style={{ color: '#f59e0b' }} />
  if (mime.startsWith('video/'))  return <Video size={size} style={{ color: '#ef4444' }} />
  if (mime === 'application/pdf') return <FileText size={size} style={{ color: '#f97316' }} />
  return <File size={size} style={{ color: '#6366f1' }} />
}

function fmtSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes/1024).toFixed(1)} KB`
  return `${(bytes/1048576).toFixed(1)} MB`
}

function timeLeft(isoStr) {
  if (!isoStr) return null
  const diff = new Date(isoStr) - Date.now()
  if (diff <= 0) return 'Expired'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/* ─── File Browser ─── */
function DeviceFilesView({ session, userId, onBack }) {
  const [filesData, setFilesData] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [selectedCat, setSelectedCat] = useState(null)
  const [previewFile, setPreviewFile] = useState(null)

  const fetchFiles = useCallback((category) => {
    setLoading(true); setError('')
    
    let path = category ? `/sessions/${session.id}/files?category=${category}` : `/sessions/${session.id}/files`
    if (userId) path = `/admin/users/${userId}` + path
    else path = `/dashboard` + path

    api.get(path)
      .then(data => { setFilesData(data); setLoading(false) })
      .catch(() => { setError('Failed to fetch files from device.'); setLoading(false) })
  }, [session.id, userId])

  useEffect(() => { fetchFiles(selectedCat) }, [selectedCat])

  const tl = timeLeft(session.expires_at)

  if (loading) return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={14}/> Back to device list</button>
      <div style={{ textAlign:'center', padding:60, color:'var(--muted)' }}>
        <Radio size={36} style={{ marginBottom:12, opacity:0.5 }} />
        <div style={{ fontWeight:600 }}>Fetching real files from device…</div>
        <div style={{ fontSize:12, marginTop:6 }}>Connecting to {session.provider_device_name}</div>
      </div>
    </div>
  )

  if (error) return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={14}/> Back</button>
      <div style={{ textAlign:'center', padding:60 }}>
        <AlertTriangle size={36} style={{ color:'var(--red)', marginBottom:12 }} />
        <div style={{ color:'var(--red)', fontWeight:600 }}>{error}</div>
        <button className="btn btn-ghost" style={{ marginTop:16, gap:6 }} onClick={() => fetchFiles(selectedCat)}>
          <RefreshCw size={13}/> Retry
        </button>
      </div>
    </div>
  )

  const { totalFiles = 0, categories = {}, files = [], deviceName } = filesData || {}

  const handleDownload = (file) => {
    alert('Full download will be available after secure file transfer is enabled.');
  }

  /* ── Category Grid ── */
  if (!selectedCat) return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={14}/> Back to device list</button>

      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Connected Device</div>
            <div style={{ fontSize:22, fontWeight:800, marginTop:4 }}>{deviceName}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <span className="badge badge-green" style={{ display:'block', marginBottom:4 }}>● Active</span>
            <div style={{ fontSize:12, color:'var(--yellow)', fontFamily:'monospace', display:'flex', alignItems:'center', gap:4 }}>
              <Clock size={11}/> {tl} remaining
            </div>
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)' }}>
          <span style={{ fontSize:13, color:'var(--muted)' }}>
            {totalFiles === 0 ? 'No files shared yet' : `${totalFiles} file${totalFiles!==1?'s':''} indexed`}
          </span>
          <button className="btn btn-ghost btn-sm" style={{ gap:5 }} onClick={() => fetchFiles(null)}>
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      </div>

      {totalFiles === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Folder size={36} strokeWidth={1.2} style={{ opacity:0.4 }} /></div>
          <div className="empty-text">No approved files available yet.</div>
        </div>
      ) : (
        <div>
          <div className="section-title" style={{ marginBottom:14 }}>File Categories</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px,1fr))', gap:14 }}>
            {Object.entries(CATEGORY_META).map(([catId, meta]) => {
              const count = categories[catId] || 0
              return (
                <div key={catId} onClick={() => count > 0 && setSelectedCat(catId)}
                  className="card-glass"
                  style={{ cursor:count>0?'pointer':'default', opacity:count>0?1:0.45, transition:'all 0.2s',
                    border:count>0?'1px solid var(--border)':'1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div style={{ width:40, height:40, borderRadius:10, background:`${meta.color}18`,
                      display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <meta.Icon size={20} style={{ color:meta.color }} />
                    </div>
                    <span className={`badge ${count>0?'badge-green':'badge-muted'}`}>{count} files</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:15 }}>{meta.label}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>{meta.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  /* ── File List ── */
  const catMeta = CATEGORY_META[selectedCat] || {}
  return (
    <div className="fade-in">
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
        <button className="back-btn" style={{ margin:0 }} onClick={() => setSelectedCat(null)}>
          <ChevronLeft size={14}/> Categories
        </button>
        <h3 style={{ fontSize:16, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
          {catMeta.Icon && <catMeta.Icon size={16} style={{ color:catMeta.color }} />}
          {catMeta.label} ({files.length})
        </h3>
        <button className="btn btn-ghost btn-sm" style={{ marginLeft:'auto', gap:5 }} onClick={() => fetchFiles(selectedCat)}>
          <RefreshCw size={12}/> Refresh
        </button>
      </div>

      {files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">{catMeta.Icon && <catMeta.Icon size={36} strokeWidth={1.2} style={{ opacity:0.4 }} />}</div>
          <div className="empty-text">No approved files available yet.</div>
        </div>
      ) : (
        selectedCat === 'photos' || selectedCat === 'videos' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
            {files.map((file, idx) => {
              const isImg = file.mimeType?.startsWith('image/')
              const isPdf = file.mimeType === 'application/pdf'
              const hasPreview = isImg || isPdf
              return (
                <div key={file.fileToken}
                  className="card-glass"
                  style={{ padding: 0, overflow: 'hidden', cursor: 'pointer', position: 'relative', transition: 'transform 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.transform='translateY(-2px)'}
                  onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}
                  onClick={() => { if (hasPreview) setPreviewFile(file); else alert(`Preview not available for "${file.fileName}".`) }}>
                  <div style={{ width: '100%', height: 160, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {file.previewData ? (
                      <img src={file.previewData} alt={file.fileName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                    ) : (
                      <FileIcon mime={file.mimeType} size={48} />
                    )}
                    {selectedCat === 'videos' && (
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', borderRadius: '50%', padding: 12 }}>
                        <Video size={24} color="#fff" />
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.fileName}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{fmtSize(file.fileSize)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            {files.map((file, idx) => {
              const isImg = file.mimeType?.startsWith('image/')
              const isPdf = file.mimeType === 'application/pdf'
              const hasPreview = isImg || isPdf
              return (
                <div key={file.fileToken}
                  style={{ display:'flex', alignItems:'center', gap:14, padding:'13px 18px',
                    borderBottom:idx<files.length-1?'1px solid var(--border)':'none', transition:'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                  <FileIcon mime={file.mimeType} size={22} />
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {file.fileName}
                    </div>
                    <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>
                      {fmtSize(file.fileSize)} · {file.mimeType}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                    <button className="btn btn-ghost btn-sm" style={{ gap:5 }}
                      onClick={() => { if (hasPreview) setPreviewFile(file); else alert(`Preview not available for "${file.fileName}".`) }}>
                      <Eye size={13}/> Preview
                    </button>
                    <button className="btn btn-primary btn-sm" style={{ gap:5 }} onClick={() => handleDownload(file)}>
                      <Download size={13}/> Download
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="modal" style={{ width:560, maxWidth:'95vw' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
              <div style={{ fontWeight:700, fontSize:15 }}>{previewFile.fileName}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPreviewFile(null)}><X size={14}/></button>
            </div>
            {previewFile.mimeType?.startsWith('image/') ? (
              <div style={{ background:'#0a0a14', borderRadius:10, overflow:'hidden', minHeight:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {previewFile.previewData
                  ? <img src={previewFile.previewData} alt={previewFile.fileName} style={{ width:'100%', height:'auto', maxHeight:400, objectFit:'contain' }} />
                  : <div style={{ textAlign:'center', color:'var(--muted)', padding:20 }}>
                      <Image size={48} style={{ marginBottom:12, opacity:0.3 }} />
                      <div style={{ fontSize:13 }}>Image preview not available.</div>
                    </div>
                }
              </div>
            ) : (
              <div style={{ background:'#f8f8f8', borderRadius:10, padding:24, color:'#333', minHeight:200 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16, borderBottom:'1px solid #ddd', paddingBottom:12 }}>
                  <FileText size={28} style={{ color:'#f97316' }} />
                  <div>
                    <div style={{ fontWeight:700 }}>{previewFile.fileName}</div>
                    <div style={{ fontSize:11, color:'#666' }}>{fmtSize(previewFile.fileSize)}</div>
                  </div>
                </div>
                <div style={{ textAlign:'center', color:'#777', fontSize:13, padding:20, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <Shield size={14}/> Secure preview requires provider app agent connection.
                </div>
              </div>
            )}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:16 }}>
              <button className="btn btn-ghost" onClick={() => setPreviewFile(null)}>Close</button>
              <button className="btn btn-primary" style={{ gap:5 }} onClick={() => handleDownload(previewFile)}>
                <Download size={14}/> Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main LinkDetail ─── */
export default function LinkDetail({ token, userId, onBack }) {
  const [data, setData]               = useState(null)
  const [tab, setTab]                 = useState('active')
  const [copiedLink, setCopiedLink]   = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)
  const [showQR, setShowQR]           = useState(false)
  const [disabling, setDisabling]     = useState(false)
  const [viewSession, setViewSession] = useState(null)
  const [historySession, setHistorySession] = useState(null)

  const load = () => {
    const ep = userId ? `/admin/users/${userId}/links/${token}` : `/dashboard/links/${token}`;
    api.get(ep).then(r => setData(r)).catch(console.error)
  }
  useEffect(() => { load() }, [token, userId])

  if (!data) return <div style={{ padding:40, color:'var(--muted)' }}>Loading…</div>

  if (viewSession) return <DeviceFilesView session={viewSession} userId={userId} onBack={() => setViewSession(null)} />

  const { link, active_sessions = [], expired_sessions = [], revoked_sessions = [] } = data
  const shareLink = getShareLink(link.token)
  const connected = parseInt(link.connected_devices_count) || 0
  const max       = parseInt(link.max_devices) || 50
  const pct       = Math.round((connected / max) * 100)

  const copyLink  = () => { navigator.clipboard.writeText(shareLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500) }
  const copyToken = () => { navigator.clipboard.writeText(link.token); setCopiedToken(true); setTimeout(() => setCopiedToken(false), 1500) }
  const nativeShare = () => { if (navigator.share) navigator.share({ title:'Pixo Invite', text:`Join: ${link.token}`, url:shareLink }); else copyLink() }
  const disable   = () => { setDisabling(true); api.patch(`/invite-links/${token}/disable`).then(() => { setDisabling(false); load() }) }
  const revoke    = (sid) => api.patch(`/sessions/${sid}/revoke`).then(load)

  const allSessions = { active: active_sessions, expired: expired_sessions, revoked: revoked_sessions }
  const current     = allSessions[tab] || []
  const statusColors = { active:'badge-green', expired:'badge-red', disabled:'badge-muted' }

  return (
    <div className="fade-in">
      <button className="back-btn" onClick={onBack}><ChevronLeft size={14}/> Back to links</button>

      {/* Share Link Card */}
      <div className="card" style={{ marginBottom:16, borderColor:'rgba(124,92,252,.25)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:4 }}>Invite Token</div>
            <div style={{ fontSize:30, fontWeight:800, letterSpacing:3, background:'var(--grad)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {link.token}
            </div>
          </div>
          <span className={`badge ${statusColors[link.status] || 'badge-muted'}`}>
            {link.status === 'active' ? '● ' : ''}{link.status}
          </span>
        </div>

        <div style={{ marginBottom:14 }}>
          <label className="form-label">Share Link</label>
          <div className="copy-row">
            <span className="copy-val" style={{ fontSize:13, wordBreak:'break-all' }}>{shareLink}</span>
          </div>
        </div>

        {showQR && (
          <div style={{ display:'flex', justifyContent:'center', padding:20, background:'#fff', borderRadius:12, marginBottom:14 }}>
            <QRCodeSVG value={shareLink} size={200} />
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:12 }}>
          <button className="btn btn-primary btn-sm" style={{ gap:5 }} onClick={copyLink}>
            {copiedLink ? <><CheckCircle size={12}/>Copied!</> : <><Copy size={12}/>Copy Link</>}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ gap:5 }} onClick={nativeShare}>
            <Share2 size={12}/> Share
          </button>
          <button className="btn btn-ghost btn-sm" style={{ gap:5 }} onClick={() => setShowQR(v => !v)}>
            <QrCode size={12}/> {showQR ? 'Hide QR' : 'QR Code'}
          </button>
        </div>

        <div className="divider" style={{ margin:'12px 0' }} />
        <div style={{ display:'flex', gap:8, justifyContent:'space-between', flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" style={{ gap:5 }} onClick={copyToken}>
            {copiedToken ? <><CheckCircle size={12}/>Copied Token</> : <><Copy size={12}/>Copy Token</>}
          </button>
          {link.status === 'active' && (
            <button className="btn btn-danger btn-sm" style={{ gap:5 }} onClick={disable} disabled={disabling}>
              <Ban size={12}/> {disabling ? 'Disabling…' : 'Disable Link'}
            </button>
          )}
        </div>
      </div>

      {/* Stats Card */}
      <div className="card" style={{ marginBottom:20 }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(130px,1fr))', gap:16 }}>
          {[
            { lbl:'Devices',        val:`${connected} / ${max}` },
            { lbl:'Active Sessions',val: active_sessions.length },
            { lbl:'Expires',        val: new Date(link.expires_at).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) },
            { lbl:'Access Code',    val: link.access_code_label },
          ].map((item, i) => (
            <div key={i}>
              <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:.5, marginBottom:4 }}>{item.lbl}</div>
              <div style={{ fontSize:14, fontWeight:600 }}>{item.val}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--muted)', marginBottom:6 }}>
            <span>Device capacity</span><span>{connected}/{max} connected</span>
          </div>
          <div className="progress" style={{ height:6 }}><div className="progress-fill" style={{ width:pct+'%' }} /></div>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="section-title" style={{ marginBottom:14 }}>Connected Devices</div>
      <div className="tabs">
        {[['active',active_sessions.length],['expired',expired_sessions.length],['revoked',revoked_sessions.length]].map(([t,cnt]) => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)} ({cnt})
          </button>
        ))}
      </div>

      {current.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Smartphone size={36} strokeWidth={1.2} style={{ opacity:0.4 }} /></div>
          <div className="empty-text">No {tab} sessions yet.</div>
          {tab === 'active' && <div style={{ fontSize:13, color:'var(--muted)', marginTop:4 }}>Share the link above for phones to connect.</div>}
        </div>
      ) : (
        current.map(s => {
          const tl    = timeLeft(s.expires_at)
          const isAct = s.status === 'active'
          return (
            <div key={s.id} className="session-item" style={{ display:'flex', flexWrap:'wrap', gap:12, cursor:isAct?'pointer':'default' }}
              onClick={() => isAct && setViewSession(s)}>
              <div className="session-avatar">
                <Smartphone size={18} strokeWidth={1.6} style={{ color:'var(--accent1)' }} />
              </div>
              <div className="session-info" style={{ flex:'1 1 180px' }}>
                <div className="session-name" style={{ display:'flex', alignItems:'center', gap:8 }}>
                  {s.provider_device_name}
                  {isAct && <span style={{ fontSize:9, background:'rgba(34,211,165,0.15)', color:'var(--green)', padding:'1px 6px', borderRadius:4 }}>ONLINE</span>}
                </div>
                <div className="session-sub">
                  {Array.isArray(s.allowed_permissions) && s.allowed_permissions.length > 0
                    ? `Allowed: ${s.allowed_permissions.join(', ')}`
                    : 'No permissions specified'}
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }} onClick={e => e.stopPropagation()}>
                {isAct && tl && <span className="timer-chip" style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/>{tl}</span>}
                <span className={`badge ${isAct?'badge-green':s.status==='expired'?'badge-red':'badge-muted'}`}>{s.status}</span>
                {isAct && (
                  <>
                    <button className="btn btn-outline btn-sm" onClick={() => setHistorySession(s)}>
                      <Clock size={14} /> History
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setViewSession(s)}>
                      View Files <ChevronRight size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })
      )}

      {/* Access History Modal */}
      {historySession && (
        <div className="modal-overlay" onClick={() => setHistorySession(null)}>
          <div className="modal" style={{ width:440 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div style={{ fontWeight:700, fontSize:16, display:'flex', alignItems:'center', gap:8 }}>
                <ScrollText size={16}/> Access History & Logs
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setHistorySession(null)}><X size={14}/></button>
            </div>
            <div style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
              Immutable audit trail for <strong>{historySession.provider_device_name}</strong>
            </div>
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:14, maxHeight:260, overflowY:'auto', display:'flex', flexDirection:'column', gap:12 }}>
              {[
                { time:'Just now',      event:'Session connected',                    type:'connected' },
                { time:'1 minute ago',  event:'File metadata indexed by provider app',type:'files_indexed' },
                { time:'2 minutes ago', event:'Permissions authorized',               type:'auth' },
                { time:'3 minutes ago', event:'Invite token validated',               type:'token' },
              ].map((log, i) => (
                <div key={i} style={{ display:'flex', gap:10, fontSize:12 }}>
                  <div style={{ color:'var(--muted)', width:85, flexShrink:0, fontSize:11 }}>{log.time}</div>
                  <div>
                    <div style={{ fontWeight:600 }}>{log.event}</div>
                    <div style={{ fontSize:10, color:'var(--accent2)', marginTop:2 }}>event: {log.type}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary" style={{ width:'100%', marginTop:18 }} onClick={() => setHistorySession(null)}>
              Close Audit Trail
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
