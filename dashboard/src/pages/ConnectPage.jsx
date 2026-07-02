import { useState, useEffect } from 'react'
import {
  Image, FileText, Folder, MessageCircle,
  Smartphone, Monitor, Zap, ChevronLeft,
  Copy, ExternalLink, AlertTriangle, CheckCircle,
  RefreshCw, X, Shield, Clock
} from 'lucide-react'
import { api } from '../api.js'

const PERMS = [
  { id: 'photos',    Icon: Image,         label: 'Photos & Videos',    color: '#f59e0b' },
  { id: 'documents', Icon: FileText,       label: 'PDFs & Documents',   color: '#6366f1' },
  { id: 'folder',    Icon: Folder,         label: 'Selected Folder',    color: '#8b5cf6' },
  { id: 'whatsapp',  Icon: MessageCircle,  label: 'WhatsApp Media',     color: '#22c55e' },
]

export default function ConnectPage({ token }) {
  const [step, setStep]         = useState('loading')
  const [linkData, setLinkData] = useState(null)
  const [selected, setSelected] = useState(['photos', 'documents'])
  const [deviceName, setDeviceName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [session, setSession]   = useState(null)
  const [timeRemaining, setTimeRemaining] = useState('')
  const [indexedCount, setIndexedCount] = useState(0)
  const [realFiles, setRealFiles] = useState([])
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    api.get(`/invite-links/${token}`)
      .then(res => {
        if (res.error || !res.link) { setErrorMsg(res.error || 'Invalid or expired invite link.'); setStep('error'); return }
        if (res.link.status !== 'active') { setErrorMsg(`This invite link is currently ${res.link.status}.`); setStep('error'); return }
        const connected = parseInt(res.link.connected_devices_count) || 0
        const max = parseInt(res.link.max_devices) || 50
        if (connected >= max) { setErrorMsg('This link has reached its maximum device limit.'); setStep('error'); return }
        setLinkData(res); setStep('redirecting')
      })
      .catch(() => { setErrorMsg('Could not connect to Pixo servers.'); setStep('error') })
  }, [token])

  useEffect(() => {
    if (step === 'redirecting') {
      window.location.href = `pixo://connect?token=${token}`
      const timer = setTimeout(() => setStep('install'), 2500)
      return () => clearTimeout(timer)
    }
  }, [step, token])

  useEffect(() => {
    if (step === 'simulator_active' && session?.expires_at) {
      const updateTimer = () => {
        const diff = new Date(session.expires_at) - Date.now()
        if (diff <= 0) { setTimeRemaining('Expired'); setStep('install'); return }
        const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000)
        setTimeRemaining(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
      }
      updateTimer()
      const interval = setInterval(updateTimer, 1000)
      return () => clearInterval(interval)
    }
  }, [step, session])

  const togglePerm = (id) => setSelected(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])

  const startSimulatorSession = async () => {
    if (!deviceName.trim()) return
    setStep('loading')
    const deviceId = `sim-${Date.now()}-${Math.random().toString(36).slice(2,6)}`
    const res = await api.post('/sessions/join', { token, device_id: deviceId, device_name: `${deviceName.trim()} (Simulator)`, permissions: selected })
    if (res.error) { setErrorMsg(res.error); setStep('error'); return }
    const newSession = res.session
    setSession(newSession)
    if (realFiles && realFiles.length > 0) {
      const getBase64 = (file) => new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = () => resolve(null); r.readAsDataURL(file) })
      const payloadFiles = await Promise.all(Array.from(realFiles).map(async f => {
        let category = 'documents', previewData = await getBase64(f)
        if (f.type.startsWith('image/')) category = 'photos'
        else if (f.type.startsWith('video/')) category = 'videos'
        else if (f.type === 'application/pdf') category = 'pdfs'
        return { fileToken: `real_${Date.now()}_${Math.random().toString(36).substring(2,8)}`, fileName: f.name, mimeType: f.type || 'application/octet-stream', fileSize: f.size, category, modifiedAt: new Date(f.lastModified).toISOString(), previewData }
      }))
      const indexRes = await api.post(`/sessions/${newSession.id}/files/index`, { files: payloadFiles })
      if (!indexRes.error) setIndexedCount(indexRes.totalIndexed || payloadFiles.length)
    } else { setIndexedCount(0) }
    setStep('simulator_active')
  }

  const revokeSimulatorSession = async () => {
    if (!session?.id) return
    setStep('loading')
    await api.patch(`/sessions/${session.id}/revoke`)
    setStep('install')
  }

  const copyToken = () => { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 1500) }

  /* ── Loading ── */
  if (step === 'loading') return (
    <ConnectShell>
      <div style={{ textAlign:'center', padding:'40px 0' }}>
        <div style={{ width:48, height:48, margin:'0 auto 16px', borderRadius:'50%', border:'3px solid var(--accent1)', borderTopColor:'transparent', animation:'spin 0.8s linear infinite' }} />
        <div style={{ fontWeight:600, fontSize:16 }}>Verifying Pixo Invite Link...</div>
        <div style={{ color:'var(--muted)', fontSize:12, marginTop:6 }}>Checking token integrity & database slots</div>
      </div>
    </ConnectShell>
  )

  /* ── Redirecting ── */
  if (step === 'redirecting') return (
    <ConnectShell>
      <div style={{ textAlign:'center', padding:'40px 0' }}>
        <ExternalLink size={48} style={{ color:'var(--accent1)', marginBottom:16 }} />
        <div style={{ fontWeight:700, fontSize:18, marginBottom:8 }}>Opening Pixo App</div>
        <div style={{ color:'var(--muted)', fontSize:13, lineHeight:1.6 }}>
          Redirecting you to the mobile app...<br/>
          If you don't have the app installed, we will show download options.
        </div>
      </div>
    </ConnectShell>
  )

  /* ── Error ── */
  if (step === 'error') return (
    <ConnectShell>
      <div style={{ textAlign:'center', padding:'40px 20px' }}>
        <AlertTriangle size={56} style={{ color:'var(--red)', marginBottom:16 }} />
        <div style={{ fontWeight:800, fontSize:20, marginBottom:8 }}>Invite Link Invalid</div>
        <div style={{ color:'var(--red)', fontSize:14, marginBottom:24, fontWeight:500 }}>{errorMsg}</div>
        <button className="btn btn-ghost" style={{ width:'100%', gap:6 }} onClick={() => window.location.reload()}>
          <RefreshCw size={14}/> Retry Connection
        </button>
      </div>
    </ConnectShell>
  )

  /* ── Smart Install ── */
  if (step === 'install') return (
    <ConnectShell>
      <div style={{ textAlign:'center', marginBottom:24 }}>
        <Smartphone size={48} style={{ color:'var(--accent1)', marginBottom:8 }} />
        <div style={{ fontSize:24, fontWeight:800, marginBottom:6 }}>Get Pixo App</div>
        <div style={{ color:'var(--muted)', fontSize:13, lineHeight:1.5 }}>
          The requesting user wants temporary access to your files. Install the Pixo mobile app to connect securely.
        </div>
      </div>

      <div className="card" style={{ marginBottom:16, textAlign:'center', background:'rgba(255,255,255,0.02)' }}>
        <div style={{ fontSize:11, color:'var(--muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Invite token</div>
        <div style={{ fontSize:20, fontWeight:800, color:'var(--accent2)', letterSpacing:1, marginBottom:12 }}>{token}</div>
        <button className="btn btn-ghost btn-sm" style={{ margin:'0 auto', gap:5 }} onClick={copyToken}>
          {copied ? <><CheckCircle size={12}/>Copied!</> : <><Copy size={12}/>Copy Invite Code</>}
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
        <button className="btn btn-primary" style={{ justifyContent:'center', padding:14, gap:8 }} onClick={() => { window.location.href = `pixo://connect/${token}` }}>
          <ExternalLink size={16}/> Open Pixo App
        </button>
        <a
          href="https://github.com/Joy185c/pixo/releases/download/apk-latest/app-debug.apk"
          download="pixo.apk"
          className="btn btn-ghost"
          style={{ justifyContent:'center', padding:14, gap:8, textDecoration:'none', display:'flex', alignItems:'center', color:'inherit' }}
        >
          <Smartphone size={16}/> Download Pixo for Android
        </a>
        <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5 }}>
          Install the APK on your Android phone, then tap <strong>Open Pixo App</strong> above.
        </div>
      </div>

      <div className="divider" style={{ margin:'20px 0' }} />

      <div className="card" style={{ border:'1px dashed var(--accent1)', background:'rgba(124,92,252,0.03)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
          <Monitor size={18} style={{ color:'var(--accent1)' }} />
          <div style={{ fontWeight:700, fontSize:14 }}>Test without Android app</div>
        </div>
        <div style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5, marginBottom:12 }}>
          No mobile device nearby? Test the complete provider phone flow using our built-in web browser simulator.
        </div>
        <button className="btn btn-ghost btn-sm" style={{ width:'100%', borderColor:'rgba(124,92,252,0.3)', color:'var(--accent1)', gap:6 }} onClick={() => setStep('simulator_perms')}>
          <Zap size={14}/> Launch Web Simulator
        </button>
      </div>
    </ConnectShell>
  )

  /* ── Simulator: Permissions ── */
  if (step === 'simulator_perms') return (
    <ConnectShell isSimulator>
      <div style={{ marginBottom:20 }}>
        <button className="back-btn" onClick={() => setStep('install')}><ChevronLeft size={14}/> Exit Simulator</button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <Monitor size={24} style={{ color:'var(--accent1)' }} />
          <div>
            <div style={{ fontSize:18, fontWeight:800 }}>Pixo App Simulator</div>
            <div style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>Simulated Provider Device</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:12 }}>Select files to share:</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {PERMS.map(p => (
            <div key={p.id} onClick={() => togglePerm(p.id)}
              style={{ padding:'12px', borderRadius:10, cursor:'pointer', textAlign:'center',
                border:`1px solid ${selected.includes(p.id) ? 'var(--accent1)' : 'var(--border)'}`,
                background: selected.includes(p.id) ? 'rgba(124,92,252,0.1)' : 'var(--bg3)',
                transition:'all .15s' }}>
              <div style={{ display:'flex', justifyContent:'center', marginBottom:6 }}>
                <p.Icon size={22} style={{ color: selected.includes(p.id) ? 'var(--accent1)' : p.color }} />
              </div>
              <div style={{ fontSize:12, fontWeight:600 }}>{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setStep('simulator_join')} disabled={selected.length === 0}>
        Next → Device Name
      </button>
    </ConnectShell>
  )

  /* ── Simulator: Join ── */
  if (step === 'simulator_join') return (
    <ConnectShell isSimulator>
      <div style={{ marginBottom:20 }}>
        <button className="back-btn" onClick={() => setStep('simulator_perms')}><ChevronLeft size={14}/> Back</button>
        <div style={{ fontSize:18, fontWeight:800 }}>Pixo App Simulator</div>
        <div style={{ fontSize:11, color:'var(--muted)' }}>Step 2: Select real files</div>
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        <div className="form-group" style={{ marginBottom:12 }}>
          <label className="form-label">Simulated Device Name</label>
          <input className="form-input" placeholder="e.g. Google Pixel 8" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
        </div>
        <div className="form-group" style={{ marginBottom:0 }}>
          <label className="form-label">Select Real Files to Share</label>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <input type="file" multiple onChange={e => setRealFiles(prev => [...(prev||[]), ...Array.from(e.target.files)])}
              style={{ display:'block', width:'100%', fontSize:13, color:'var(--muted)', background:'rgba(0,0,0,0.2)', padding:10, borderRadius:6, border:'1px dashed var(--border)' }} />
            <div style={{ fontSize:11, color:'var(--muted)', textAlign:'center' }}>— OR SELECT FOLDER —</div>
            <input type="file" multiple webkitdirectory="true" onChange={e => setRealFiles(prev => [...(prev||[]), ...Array.from(e.target.files)])}
              style={{ display:'block', width:'100%', fontSize:13, color:'var(--muted)', background:'rgba(0,0,0,0.2)', padding:10, borderRadius:6, border:'1px dashed var(--border)' }} />
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop:8 }} onClick={() => setRealFiles([])}>Clear Selection</button>
        </div>
      </div>

      {realFiles && realFiles.length > 0 && (
        <div className="card" style={{ marginBottom:16, background:'rgba(34,211,165,0.05)', borderColor:'rgba(34,211,165,0.2)' }}>
          <div style={{ fontSize:12, fontWeight:600, color:'var(--green)', marginBottom:8 }}>Selected Files ({realFiles.length}):</div>
          <ul style={{ margin:0, paddingLeft:20, fontSize:12, color:'var(--muted)' }}>
            {Array.from(realFiles).slice(0,3).map((f,i) => <li key={i}>{f.name}</li>)}
            {realFiles.length > 3 && <li>... and {realFiles.length - 3} more</li>}
          </ul>
        </div>
      )}

      {(!realFiles || realFiles.length === 0) && (
        <div style={{ background:'rgba(240,90,126,.05)', border:'1px solid rgba(240,90,126,.15)', borderRadius:10, padding:12, marginBottom:16, fontSize:12, color:'var(--red)', lineHeight:1.5, display:'flex', alignItems:'center', gap:8 }}>
          <AlertTriangle size={14}/> No files selected. Please choose files before allowing access.
        </div>
      )}

      <button className="btn btn-primary" style={{ width:'100%', gap:6 }} onClick={startSimulatorSession} disabled={!deviceName.trim() || !realFiles || realFiles.length === 0}>
        <Shield size={15}/> Allow Access for 6 Months
      </button>
    </ConnectShell>
  )

  /* ── Simulator: Active ── */
  if (step === 'simulator_active') return (
    <ConnectShell isSimulator>
      <div style={{ textAlign:'center', marginBottom:20 }}>
        <CheckCircle size={48} style={{ color:'var(--green)', marginBottom:8 }} />
        <div style={{ fontSize:20, fontWeight:800 }}>Pixo Active Session</div>
        <div style={{ color:'var(--green)', fontSize:12, fontWeight:600, marginTop:2 }}>Connected & Encrypted</div>
      </div>

      <div className="card" style={{ marginBottom:16 }}>
        {[
          { lbl:'Device Name',         val:`${deviceName} (Simulated)` },
          { lbl:'Shared Permissions',  val:selected.join(', ') },
          { lbl:'Files Indexed',       val:indexedCount > 0 ? `${indexedCount} files sent to requester` : 'Indexing…', green:true },
        ].map((row, i, arr) => (
          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
            paddingBottom:i<arr.length-1?12:0, marginBottom:i<arr.length-1?12:0,
            borderBottom:i<arr.length-1?'1px solid var(--border)':'none' }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>{row.lbl}</span>
            <span style={{ fontWeight:600, fontSize:13, color:row.green?'var(--green)':'inherit' }}>{row.val}</span>
          </div>
        ))}
        <div className="divider" style={{ margin:'12px 0' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, color:'var(--muted)', display:'flex', alignItems:'center', gap:4 }}><Clock size={11}/> Time Remaining</span>
          <span style={{ fontFamily:'monospace', fontWeight:700, color:'var(--yellow)', fontSize:15 }}>{timeRemaining || '4319:59:59'}</span>
        </div>
      </div>

      <div style={{ background:'rgba(34,211,165,.08)', border:'1px solid rgba(34,211,165,.2)', borderRadius:10, padding:12, marginBottom:20, fontSize:12, color:'var(--green)', lineHeight:1.5 }}>
        Your files are now safely visible on the requester's dashboard. You can stop sharing instantly using the button below.
      </div>

      <button className="btn btn-danger" style={{ width:'100%', justifyContent:'center' }} onClick={revokeSimulatorSession}>
        Revoke Access & Disconnect
      </button>
    </ConnectShell>
  )
}

function ConnectShell({ children, isSimulator = false }) {
  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, justifyContent:'center' }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#6366f1,#8b5cf6,#06b6d4)',
            display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:18, color:'#fff',
            boxShadow:'0 0 16px rgba(99,102,241,0.4)' }}>P</div>
          <div>
            <div style={{ fontWeight:700, fontSize:20, display:'flex', alignItems:'center', gap:6 }}>
              Pixo
              {isSimulator && <span style={{ fontSize:9, background:'var(--accent1)', padding:'2px 6px', borderRadius:4, color:'#fff', textTransform:'uppercase', letterSpacing:0.5 }}>Sim</span>}
            </div>
            <div style={{ fontSize:10, color:'var(--muted)' }}>Access your files, fluently.</div>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
